import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

const typeLabels: Record<TransactionType, { label: string; color: string }> = {
  spesa: { label: 'Spesa', color: 'bg-red-100 text-red-800 border-red-200' },
  prelievo: { label: 'Prelievo', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  entrata: { label: 'Entrata', color: 'bg-green-100 text-green-800 border-green-200' },
};

const categorySchema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(100, 'Massimo 100 caratteri'),
  type: z.enum(['spesa', 'prelievo', 'entrata']),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function AdminCategorie() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; type: TransactionType } | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TransactionType>('spesa');
  
  const { data: allCategories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'spesa',
    },
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'spesa',
    },
  });

  const filteredCategories = allCategories?.filter(c => c.type === activeTab) || [];

  const onCreateCategory = async (values: CategoryFormValues) => {
    await createCategory.mutateAsync({ name: values.name, type: values.type });
    setIsCreateDialogOpen(false);
    form.reset();
  };

  const onEditCategory = async (values: CategoryFormValues) => {
    if (!editingCategory) return;
    await updateCategory.mutateAsync({ id: editingCategory.id, name: values.name, type: values.type });
    setEditingCategory(null);
    editForm.reset();
  };

  const onDeleteCategory = async () => {
    if (!deletingCategoryId) return;
    await deleteCategory.mutateAsync(deletingCategoryId);
    setDeletingCategoryId(null);
  };

  const openEditDialog = (category: { id: string; name: string; type: TransactionType }) => {
    setEditingCategory(category);
    editForm.reset({
      name: category.name,
      type: category.type,
    });
  };

  return (
    <MainLayout title="Gestione Categorie">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Categorie</h2>
            <p className="text-muted-foreground">
              Gestisci le categorie per spese, prelievi ed entrate
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea nuova categoria</DialogTitle>
                <DialogDescription>
                  Inserisci il nome e seleziona la tipologia
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateCategory)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="Es: Materiale attività" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipologia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(typeLabels).map(([value, { label }]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Annulla
                    </Button>
                    <Button type="submit" disabled={createCategory.isPending}>
                      {createCategory.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creazione...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Crea
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Categorie per Tipologia
            </CardTitle>
            <CardDescription>
              {allCategories?.length || 0} categorie totali
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransactionType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="spesa" className="data-[state=active]:bg-red-100">
                  Spese ({allCategories?.filter(c => c.type === 'spesa').length || 0})
                </TabsTrigger>
                <TabsTrigger value="prelievo" className="data-[state=active]:bg-orange-100">
                  Prelievi ({allCategories?.filter(c => c.type === 'prelievo').length || 0})
                </TabsTrigger>
                <TabsTrigger value="entrata" className="data-[state=active]:bg-green-100">
                  Entrate ({allCategories?.filter(c => c.type === 'entrata').length || 0})
                </TabsTrigger>
              </TabsList>

              {(['spesa', 'prelievo', 'entrata'] as TransactionType[]).map((type) => (
                <TabsContent key={type} value={type}>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome Categoria</TableHead>
                          <TableHead>Tipologia</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category) => (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">{category.name}</TableCell>
                              <TableCell>
                                <Badge className={typeLabels[category.type].color} variant="outline">
                                  {typeLabels[category.type].label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(category)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingCategoryId(category.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Nessuna categoria per questa tipologia
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica categoria</DialogTitle>
              <DialogDescription>
                Modifica il nome o la tipologia della categoria
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditCategory)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome categoria</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipologia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCategory(null)}
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={updateCategory.isPending}>
                    {updateCategory.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      'Salva modifiche'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. La categoria verrà eliminata definitivamente.
                Le transazioni associate manterranno i dati ma non avranno più una categoria assegnata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteCategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCategory.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  'Elimina'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
