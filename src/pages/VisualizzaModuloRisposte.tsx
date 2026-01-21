import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, FileText, Calendar, Users, Search } from 'lucide-react';
import { useFormById, useFormResponses, FormField } from '@/hooks/useForms';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DynamicStats } from '@/components/forms/DynamicStats';
import { AIAnalysis } from '@/components/forms/AIAnalysis';

export default function VisualizzaModuloRisposte() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading: formLoading } = useFormById(id!);
  const { data: responses = [], isLoading: responsesLoading } = useFormResponses(id!);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState<string>('all');
  const [filterValue, setFilterValue] = useState<string>('all');

  const isLoading = formLoading || responsesLoading;

  const schema = (form?.form_schema || []) as FormField[];

  // Get unique values for selected filter field
  const filterOptions = useMemo(() => {
    if (filterField === 'all') return [];
    const values = new Set<string>();
    responses.forEach((response) => {
      const data = response.data as Record<string, string>;
      const value = data[filterField];
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  }, [responses, filterField]);

  // Filter responses based on search and field filters
  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      const data = response.data as Record<string, string>;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(data).some(
          (value) => value && String(value).toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Field filter
      if (filterField !== 'all' && filterValue !== 'all') {
        if (data[filterField] !== filterValue) return false;
      }
      
      return true;
    });
  }, [responses, searchTerm, filterField, filterValue]);

  const handleExportCSV = () => {
    if (!form || responses.length === 0) return;

    // Build CSV header
    const headers = ['Data Risposta', ...schema.map(f => f.label)];
    
    // Build CSV rows
    const rows = responses.map(response => {
      const data = response.data as Record<string, unknown>;
      const createdAt = format(new Date(response.created_at), 'dd/MM/yyyy HH:mm', { locale: it });
      
      const values = schema.map(field => {
        const value = data[field.name];
        // Escape quotes and handle commas
        const strValue = String(value ?? '').replace(/"/g, '""');
        return `"${strValue}"`;
      });
      
      return [`"${createdAt}"`, ...values].join(',');
    });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    
    // Add BOM for Excel compatibility with UTF-8
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

  if (isLoading) {
    return (
      <MainLayout title="Caricamento...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!form) {
    return (
      <MainLayout title="Modulo non trovato">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Il modulo richiesto non esiste o non hai i permessi per visualizzarlo.
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Risposte: ${form.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/visualizza-moduli">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Indietro
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-semibold">{form.name}</h2>
              {form.description && (
                <p className="text-sm text-muted-foreground">{form.description}</p>
              )}
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

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{responses.length}</p>
                  <p className="text-sm text-muted-foreground">Risposte totali</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/20">
                  <FileText className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{schema.length}</p>
                  <p className="text-sm text-muted-foreground">Campi nel modulo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent">
                  <Calendar className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {responses.length > 0
                      ? format(new Date(responses[0].created_at), 'dd MMM', { locale: it })
                      : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Ultima risposta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Stats Section */}
        {responses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-lg font-semibold text-foreground">Statistiche</h3>
            </div>
            <DynamicStats schema={schema} responses={responses} />
          </div>
        )}

        {/* AI Analysis Section */}
        {responses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-lg font-semibold text-foreground">Analisi AI</h3>
            </div>
            <AIAnalysis formId={form.id} formName={form.name} schema={schema} responses={responses} />
          </div>
        )}

        {/* Filters Section */}
        {responses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-lg font-semibold text-foreground">Filtri</h3>
            </div>
            <Card className="border-2 bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca nelle risposte..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-background"
                    />
                  </div>
                  <Select value={filterField} onValueChange={(value) => {
                    setFilterField(value);
                    setFilterValue('all');
                  }}>
                    <SelectTrigger className="w-full sm:w-48 bg-background">
                      <SelectValue placeholder="Filtra per campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i campi</SelectItem>
                      {schema.filter(f => f.type === 'select' || f.type === 'radio')
                        .map(field => (
                          <SelectItem key={field.name} value={field.name}>{field.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterField !== 'all' && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="w-full sm:w-48 bg-background">
                        <SelectValue placeholder="Seleziona valore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        {filterOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tutte le Risposte</CardTitle>
            <CardDescription>
              {filteredResponses.length === responses.length 
                ? `${responses.length} ${responses.length === 1 ? 'risposta' : 'risposte'} ricevute`
                : `${filteredResponses.length} di ${responses.length} risposte`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna risposta ricevuta per questo modulo
              </div>
            ) : filteredResponses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna risposta corrisponde ai filtri selezionati
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {schema.map((field) => (
                        <TableHead key={field.name}>{field.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponses.map((response) => {
                      const data = response.data as Record<string, unknown>;
                      return (
                        <TableRow key={response.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(response.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </TableCell>
                          {schema.map((field) => {
                            const value = data[field.name];
                            
                            // Smart rendering based on field type with color coding
                            if (field.type === 'select' || field.type === 'radio') {
                              const strValue = String(value ?? '-');
                              const isPositive = ['sì', 'si', 'yes', 'true', 'confermato', 'presente'].includes(strValue.toLowerCase());
                              const isNegative = ['no', 'false', 'annullato', 'assente'].includes(strValue.toLowerCase());
                              
                              return (
                                <TableCell key={field.name}>
                                  <Badge variant={isPositive ? 'default' : isNegative ? 'secondary' : 'outline'}>
                                    {strValue}
                                  </Badge>
                                </TableCell>
                              );
                            }
                            
                            if (field.type === 'date' && value) {
                              return (
                                <TableCell key={field.name}>
                                  {format(new Date(String(value)), 'dd/MM/yyyy', { locale: it })}
                                </TableCell>
                              );
                            }
                            
                            return (
                              <TableCell key={field.name} className="max-w-xs truncate">
                                {String(value ?? '-')}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
