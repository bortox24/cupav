import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, ExternalLink } from 'lucide-react';
import { useForms } from '@/hooks/useForms';
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

export default function VisualizzaModuli() {
  const { data: forms = [], isLoading } = useForms();

  return (
    <MainLayout title="Visualizza Moduli">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Moduli Disponibili
            </CardTitle>
            <CardDescription>
              Consulta le risposte e le statistiche dei moduli pubblici
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun modulo disponibile
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Creato il</TableHead>
                    <TableHead>Link Pubblico</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {form.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.is_active ? 'default' : 'secondary'}>
                          {form.is_active ? 'Attivo' : 'Inattivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(form.created_at), 'dd MMM yyyy', { locale: it })}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/modulo/${form.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                          /modulo/{form.slug}
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/visualizza-moduli/${form.id}/risposte`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Risposte
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
