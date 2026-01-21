import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, UserPlus, Shield, Wallet, Eye, Info } from 'lucide-react';
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
import { useUsers, useCreateUser, useUpdateUserRole } from '@/hooks/useUsers';
import { useAuth } from '@/lib/auth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { 
    label: 'Amministratore', 
    icon: <Shield className="h-3 w-3" />,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  tesoriere: { 
    label: 'Tesoriere', 
    icon: <Wallet className="h-3 w-3" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  visualizzatore: { 
    label: 'Visualizzatore', 
    icon: <Eye className="h-3 w-3" />,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
};

const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
  fullName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  role: z.enum(['admin', 'tesoriere', 'visualizzatore']),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function AdminPermessi() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user } = useAuth();
  
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      role: 'visualizzatore',
    },
  });

  const onCreateUser = async (values: CreateUserFormValues) => {
    await createUser.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      role: values.role,
    });
    setIsCreateDialogOpen(false);
    form.reset();
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    await updateUserRole.mutateAsync({ userId, role: newRole });
  };

  return (
    <MainLayout title="Gestione Utenti">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Utenti registrati</h2>
            <p className="text-muted-foreground">
              Gestisci gli utenti e i loro ruoli
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
                  Inserisci i dati del nuovo utente e seleziona il ruolo
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
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruolo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(roleLabels).map(([value, { label, icon }]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  {icon}
                                  {label}
                                </div>
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
                      <TableHead>Ruolo attuale</TableHead>
                      <TableHead>Modifica ruolo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      const roleInfo = u.role ? roleLabels[u.role] : null;
                      
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
                          <TableCell>
                            {roleInfo ? (
                              <Badge className={roleInfo.color} variant="outline">
                                <span className="flex items-center gap-1">
                                  {roleInfo.icon}
                                  <span className="hidden sm:inline">{roleInfo.label}</span>
                                </span>
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Nessun ruolo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isCurrentUser ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Non puoi modificare il tuo ruolo</span>
                                <span className="sm:hidden">Bloccato</span>
                              </div>
                            ) : (
                              <Select
                                value={u.role || ''}
                                onValueChange={(value) => handleRoleChange(u.id, value as AppRole)}
                                disabled={updateUserRole.isPending}
                              >
                                <SelectTrigger className="w-28 sm:w-40">
                                  <SelectValue placeholder="Seleziona" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(roleLabels).map(([value, { label, icon }]) => (
                                    <SelectItem key={value} value={value}>
                                      <div className="flex items-center gap-2">
                                        {icon}
                                        {label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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

        {/* Role Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Legenda Ruoli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                <div className="flex items-center gap-2 font-medium text-red-800">
                  <Shield className="h-5 w-5" />
                  Amministratore
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Accesso completo: gestione utenti, categorie, modifica/elimina transazioni
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 font-medium text-blue-800">
                  <Wallet className="h-5 w-5" />
                  Tesoriere
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Registrazione transazioni, visualizzazione dashboard e report
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <Eye className="h-5 w-5" />
                  Visualizzatore
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Solo visualizzazione dei dati e della dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
