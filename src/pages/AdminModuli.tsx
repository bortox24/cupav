import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForms, useUpdateForm, useDeleteForm, Form } from '@/hooks/useForms';
import { FormBuilder } from '@/components/forms/FormBuilder';
import {
  Plus,
  FileText,
  ExternalLink,
  BarChart3,
  Loader2,
  Trash2,
  Copy,
  Check,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

export default function AdminModuli() {
  const { data: forms = [], isLoading } = useForms();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);

  const handleToggleActive = async (form: Form) => {
    await updateForm.mutateAsync({
      id: form.id,
      is_active: !form.is_active,
    });
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/modulo/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast({
      title: 'Link copiato!',
      description: 'Il link del modulo è stato copiato negli appunti.',
    });
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDeleteForm = async (formId: string) => {
    await deleteForm.mutateAsync(formId);
  };

  const handleEditForm = (form: Form) => {
    setEditingForm(form);
    setShowFormBuilder(true);
  };

  const handleCloseFormBuilder = (open: boolean) => {
    setShowFormBuilder(open);
    if (!open) {
      setEditingForm(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Gestione Moduli">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Gestione Moduli">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">I tuoi moduli</h2>
            <p className="text-sm text-muted-foreground">
              Crea moduli pubblici per raccogliere risposte
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowFormBuilder(true)}>
            <Plus className="h-4 w-4" />
            Nuovo Modulo
          </Button>
        </div>

        <FormBuilder 
          open={showFormBuilder} 
          onOpenChange={handleCloseFormBuilder}
          editForm={editingForm}
        />

        {forms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nessun modulo
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Non hai ancora creato nessun modulo
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="hidden md:table-cell">Creato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{form.name}</p>
                        {form.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.is_active}
                          onCheckedChange={() => handleToggleActive(form)}
                          disabled={updateForm.isPending}
                        />
                        <Badge variant={form.is_active ? 'default' : 'secondary'}>
                          {form.is_active ? 'Attivo' : 'Disattivato'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(form.created_at), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditForm(form)}
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(form.slug)}
                          title="Copia link"
                        >
                          {copiedSlug === form.slug ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Apri modulo"
                        >
                          <Link to={`/modulo/${form.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Visualizza risposte"
                        >
                          <Link to={`/admin/moduli/${form.id}/risposte`}>
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Elimina modulo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sei sicuro di voler eliminare "{form.name}"? Questa azione
                                eliminerà anche tutte le risposte associate e non può essere
                                annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteForm(form.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
