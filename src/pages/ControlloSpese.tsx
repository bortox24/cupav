import { useState, useMemo } from 'react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Filter, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useUsers } from '@/hooks/useUsers';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export default function ControlloSpese() {
  const currentYear = new Date();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(currentYear));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfYear(currentYear));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const { data: transactions, isLoading } = useTransactions({
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    userId: selectedUser !== 'all' ? selectedUser : undefined,
  });

  const { data: categories } = useCategories();
  const { data: users } = useUsers();

  // Calculate totals by type
  const totals = useMemo(() => {
    if (!transactions) return { entrate: 0, spese: 0, prelievi: 0 };
    
    return transactions.reduce((acc, t) => {
      const importo = Number(t.importo);
      if (t.tipologia === 'entrata') acc.entrate += importo;
      else if (t.tipologia === 'spesa') acc.spese += importo;
      else if (t.tipologia === 'prelievo') acc.prelievi += importo;
      return acc;
    }, { entrate: 0, spese: 0, prelievi: 0 });
  }, [transactions]);

  // Group by category for pie charts (excluding prelievi)
  const chartData = useMemo(() => {
    if (!transactions) return { spese: [], entrate: [] };

    const speseByCategory: Record<string, number> = {};
    const entrateByCategory: Record<string, number> = {};

    transactions.forEach((t) => {
      const categoryName = t.category?.name || 'Senza categoria';
      const importo = Number(t.importo);

      if (t.tipologia === 'spesa') {
        speseByCategory[categoryName] = (speseByCategory[categoryName] || 0) + importo;
      } else if (t.tipologia === 'entrata') {
        entrateByCategory[categoryName] = (entrateByCategory[categoryName] || 0) + importo;
      }
    });

    return {
      spese: Object.entries(speseByCategory).map(([name, value]) => ({ name, value })),
      entrate: Object.entries(entrateByCategory).map(([name, value]) => ({ name, value })),
    };
  }, [transactions]);

  // Group by category for tables
  const tableData = useMemo(() => {
    if (!transactions) return { entrate: [], spese: [], prelievi: [] };

    const groupByCategory = (type: TransactionType) => {
      const grouped: Record<string, { category: string; total: number }> = {};
      
      transactions
        .filter((t) => t.tipologia === type)
        .forEach((t) => {
          const categoryName = t.category?.name || 'Senza categoria';
          if (!grouped[categoryName]) {
            grouped[categoryName] = { category: categoryName, total: 0 };
          }
          grouped[categoryName].total += Number(t.importo);
        });

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    };

    return {
      entrate: groupByCategory('entrata'),
      spese: groupByCategory('spesa'),
      prelievi: groupByCategory('prelievo'),
    };
  }, [transactions]);

  const clearFilters = () => {
    const now = new Date();
    setStartDate(startOfYear(now));
    setEndDate(endOfYear(now));
    setSelectedCategory('all');
    setSelectedUser('all');
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <MainLayout title="Dashboard Controllo Spese">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Da data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'A data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User Filter */}
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti gli utenti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button variant="secondary" onClick={clearFilters}>
                Azzera filtri
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Totale Entrate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.entrate)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Totale Spese
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.spese)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                Totale Prelievi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.prelievi)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-1">Bilancio (Entrate - Spese)</p>
              <p className={cn(
                "text-4xl font-bold",
                totals.entrate - totals.spese >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(totals.entrate - totals.spese)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spese Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Spese per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.spese.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.spese}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {chartData.spese.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Nessuna spesa nel periodo selezionato
                </p>
              )}
            </CardContent>
          </Card>

          {/* Entrate Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Entrate per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.entrate.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.entrate}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {chartData.entrate.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Nessuna entrata nel periodo selezionato
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entrate Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                Entrate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.entrate.length > 0 ? (
                    tableData.entrate.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(row.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Nessun dato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Prelievi Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Wallet className="h-5 w-5" />
                Prelievi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.prelievi.length > 0 ? (
                    tableData.prelievi.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(row.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Nessun dato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Spese Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrendingDown className="h-5 w-5" />
                Spese
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.spese.length > 0 ? (
                    tableData.spese.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(row.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Nessun dato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
