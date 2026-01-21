import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFormById, useFormResponses, useDeleteFormResponse, FormField, FormResponse } from '@/hooks/useForms';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Search,
  Trash2,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DynamicStats } from '@/components/forms/DynamicStats';
import { AIAnalysis } from '@/components/forms/AIAnalysis';

export default function AdminModuloRisposte() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading: formLoading } = useFormById(id || '');
  const { data: responses = [], isLoading: responsesLoading } = useFormResponses(id || '');
  const deleteResponse = useDeleteFormResponse();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState<string>('all');
  const [filterValue, setFilterValue] = useState<string>('all');

  const isLoading = formLoading || responsesLoading;

  // Get unique values for filter dropdown
  const filterOptions = useMemo(() => {
    if (!form || filterField === 'all') return [];
    
    const values = new Set<string>();
    responses.forEach((response) => {
      const data = response.data as Record<string, unknown>;
      const value = data[filterField];
      if (value) values.add(String(value));
    });
    
    return Array.from(values);
  }, [form, filterField, responses]);

  // Filter responses
  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      const data = response.data as Record<string, unknown>;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(data).some(
          (value) => String(value).toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Field filter
      if (filterField !== 'all' && filterValue !== 'all') {
        const fieldValue = data[filterField];
        if (String(fieldValue) !== filterValue) return false;
      }
      
      return true;
    });
  }, [responses, searchTerm, filterField, filterValue]);

  // Format cell value based on field type
  const formatCellValue = (field: FormField, value: unknown): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">-</span>;
    }

    const stringValue = String(value);

    // Select/Radio fields get badges
    if (field.type === 'select' || field.type === 'radio') {
      const isPositive = ['sì', 'si', 'yes', 'true', 'confermato', 'presente'].includes(stringValue.toLowerCase());
      const isNegative = ['no', 'false', 'annullato', 'assente'].includes(stringValue.toLowerCase());
      
      return (
        <Badge variant={isPositive ? 'default' : isNegative ? 'secondary' : 'outline'}>
          {stringValue}
        </Badge>
      );
    }

    // Date fields get formatted
    if (field.type === 'date') {
      try {
        return format(new Date(stringValue), 'dd/MM/yyyy');
      } catch {
        return stringValue;
      }
    }

    // Email fields
    if (field.type === 'email') {
      return (
        <a href={`mailto:${stringValue}`} className="text-primary hover:underline">
          {stringValue}
        </a>
      );
    }

    // Textarea fields get truncated
    if (field.type === 'textarea' && stringValue.length > 50) {
      return (
        <span title={stringValue}>
          {stringValue.substring(0, 50)}...
        </span>
      );
    }

    return stringValue;
  };

  if (isLoading) {
    return (
      <MainLayout title="Risposte Modulo">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!form) {
    return (
      <MainLayout title="Risposte Modulo">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Modulo non trovato</p>
          <Button asChild className="mt-4">
            <Link to="/admin/moduli">Torna ai moduli</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const schema = form.form_schema as FormField[];

  const handleExportCSV = () => {
    if (!form || responses.length === 0) return;

    const headers = ['Data Risposta', ...schema.map(f => f.label)];
    
    const rows = responses.map(response => {
      const data = response.data as Record<string, unknown>;
      const createdAt = format(new Date(response.created_at), 'dd/MM/yyyy HH:mm', { locale: it });
      
      const values = schema.map(field => {
        const value = data[field.name];
        const strValue = String(value ?? '').replace(/"/g, '""');
        return `"${strValue}"`;
      });
      
      return [`"${createdAt}"`, ...values].join(',');
    });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.slug}-risposte-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title={`Risposte: ${form.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/moduli">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{form.name}</h2>
              <p className="text-sm text-muted-foreground">
                {responses.length} rispost{responses.length === 1 ? 'a' : 'e'} totali
              </p>
            </div>
          </div>
          <Button 
            onClick={handleExportCSV} 
            disabled={responses.length === 0}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Scarica CSV
          </Button>
        </div>

        {/* Dynamic Statistics */}
        {responses.length > 0 && (
          <DynamicStats schema={schema} responses={responses} />
        )}

        {/* AI Analysis */}
        {responses.length > 0 && (
          <AIAnalysis formId={form.id} formName={form.name} schema={schema} responses={responses} />
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca nelle risposte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterField} onValueChange={(value) => {
                setFilterField(value);
                setFilterValue('all');
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtra per campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i campi</SelectItem>
                  {schema
                    .filter((f) => f.type === 'select' || f.type === 'radio')
                    .map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {filterField !== 'all' && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Seleziona valore" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {filterOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Responses Table */}
        {filteredResponses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nessuna risposta
              </h3>
              <p className="text-muted-foreground text-center">
                {responses.length === 0
                  ? 'Non ci sono ancora risposte per questo modulo'
                  : 'Nessuna risposta corrisponde ai filtri selezionati'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Data</TableHead>
                  {schema.map((field) => (
                    <TableHead key={field.name}>{field.label}</TableHead>
                  ))}
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => {
                  const data = response.data as Record<string, unknown>;
                  return (
                    <TableRow key={response.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(response.created_at), 'dd/MM/yy HH:mm', { locale: it })}
                      </TableCell>
                      {schema.map((field) => (
                        <TableCell key={field.name}>
                          {formatCellValue(field, data[field.name])}
                        </TableCell>
                      ))}
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Elimina risposta</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sei sicuro di voler eliminare questa risposta? Questa azione non
                                può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteResponse.mutate(response.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
