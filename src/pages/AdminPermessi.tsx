import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, UserPlus, Shield, Info, Check, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUsers, useCreateUser, useToggleAdmin, useToggleActive } from '@/hooks/useUsers';
import { useAuth } from '@/lib/auth';

const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
  fullName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  isAdmin: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function AdminPermessi() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user } = useAuth();
  
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const toggleAdmin = useToggleAdmin();
  const toggleActive = useToggleActive();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      isAdmin: false,
    },
  });

  const onCreateUser = async (values: CreateUserFormValues) => {
    await createUser.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      isAdmin: values.isAdmin,
    });
    setIsCreateDialogOpen(false);
    form.reset();
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    await toggleAdmin.mutateAsync({ userId, isAdmin: !currentIsAdmin });
  };

  const handleToggleActive = async (userId: string, currentIsActive: boolean) => {
    await toggleActive.mutateAsync({ userId, isActive: !currentIsActive });
  };

  return (
    <MainLayout title="Gestione Utenti">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Utenti registrati</h2>
            <p className="text-muted-foreground">
              Gestisci gli utenti e i loro accessi
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Nuovo Utente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea nuovo utente</DialogTitle>
                <DialogDescription>
                  Inserisci i dati del nuovo utente
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Mario Rossi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="mario@esempio.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isAdmin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Amministratore
                          </FormLabel>
                          <FormDescription>
                            Gli amministratori hanno accesso completo a tutte le pagine
                          </FormDescription>
                        </div>
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
                    <Button type="submit" disabled={createUser.isPending}>
                      {createUser.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creazione...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Crea utente
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista Utenti</CardTitle>
            <CardDescription>
              {users?.length || 0} utenti totali
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                      <TableHead className="text-center">Attivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{u.full_name}</span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="w-fit mt-1">Tu</Badge>
                              )}
                              <span className="text-xs text-muted-foreground sm:hidden mt-1">{u.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{u.email}</TableCell>
                          <TableCell className="text-center">
                            {isCurrentUser ? (
                              <div className="flex items-center justify-center">
                                <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={u.is_admin}
                                  onCheckedChange={() => handleToggleAdmin(u.id, u.is_admin)}
                                  disabled={toggleAdmin.isPending}
                                />
                                {u.is_admin && (
                                  <Shield className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isCurrentUser ? (
                              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Non modificabile</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={u.is_active}
                                  onCheckedChange={() => handleToggleActive(u.id, u.is_active)}
                                  disabled={toggleActive.isPending}
                                />
                                {u.is_active ? (
                                  <Check className="h-4 w-4 text-primary" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Come funziona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg border bg-destructive/5 border-destructive/20">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <Shield className="h-5 w-5" />
                  Amministratore
                </div>
                <p className="text-muted-foreground mt-1">
                  Accesso completo a tutte le pagine e funzionalità
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 font-medium">
                  <Check className="h-5 w-5 text-primary" />
                  Attivo / Disattivo
                </div>
                <p className="text-muted-foreground mt-1">
                  Controlla se l'utente può accedere al sistema. Vai su "Permessi Pagine" per configurare l'accesso alle singole pagine.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
