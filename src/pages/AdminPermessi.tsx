import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, UserPlus, Shield, Info, Check, X, Trash2, RotateCcw, Users, Copy, RefreshCw, FileKey, Power, PowerOff } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { useUsers, useCreateUser, useToggleAdmin, useToggleActive, useDeleteUser, type UserWithStatus } from '@/hooks/useUsers';
import { useAuth } from '@/lib/auth';
import {
  useAllPagePermissions,
  useSetPagePermission,
  useResetUserPermissions,
  availablePages,
} from '@/hooks/usePagePermissions';
import {
  useAllTurnoPermissions,
  useSetTurnoPermission,
  useRemoveTurnoPermission,
  useResetUserTurnoPermissions,
  TURNI,
} from '@/hooks/useTurnoPermissions';
import { useStaffAccounts, useResetStaffPassword } from '@/hooks/useStaffAccounts';
import { toast } from '@/hooks/use-toast';

const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
  fullName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  isAdmin: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

// ==================== TAB 1: Gestione Utenti ====================
function GestioneUtentiTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user } = useAuth();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const toggleAdmin = useToggleAdmin();
  const toggleActive = useToggleActive();
  const deleteUser = useDeleteUser();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', fullName: '', isAdmin: false },
  });

  const onCreateUser = async (values: CreateUserFormValues) => {
    await createUser.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      isAdmin: values.isAdmin,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Utenti registrati</h2>
          <p className="text-muted-foreground">Gestisci gli utenti e i loro accessi</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" />Nuovo Utente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea nuovo utente</DialogTitle>
              <DialogDescription>Inserisci i dati del nuovo utente</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Nome completo</FormLabel><FormControl><Input placeholder="Mario Rossi" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="mario@esempio.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="isAdmin" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Amministratore</FormLabel>
                      <FormDescription>Gli amministratori hanno accesso completo a tutte le pagine</FormDescription>
                    </div>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annulla</Button>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creazione...</> : <><Plus className="mr-2 h-4 w-4" />Crea utente</>}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista Utenti</CardTitle>
          <CardDescription>{users?.length || 0} utenti totali</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Attivo</TableHead>
                    <TableHead className="text-center">Azioni</TableHead>
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
                            {isCurrentUser && <Badge variant="outline" className="w-fit mt-1">Tu</Badge>}
                            <span className="text-xs text-muted-foreground sm:hidden mt-1">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">{u.email}</TableCell>
                        <TableCell className="text-center">
                          {isCurrentUser ? (
                            <div className="flex items-center justify-center">
                              <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                                <Shield className="h-3 w-3 mr-1" />Admin
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Switch checked={u.is_admin} onCheckedChange={() => toggleAdmin.mutateAsync({ userId: u.id, isAdmin: !u.is_admin })} disabled={toggleAdmin.isPending} />
                              {u.is_admin && <Shield className="h-4 w-4 text-destructive" />}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCurrentUser ? (
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <Info className="h-4 w-4 flex-shrink-0" /><span className="hidden sm:inline">Non modificabile</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Switch checked={u.is_active} onCheckedChange={() => toggleActive.mutateAsync({ userId: u.id, isActive: !u.is_active })} disabled={toggleActive.isPending} />
                              {u.is_active ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-destructive" />}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {!isCurrentUser && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo utente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Stai per eliminare l'account di <strong>{u.full_name}</strong> ({u.email}). Questa azione è irreversibile.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteUser.mutateAsync(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
    </div>
  );
}

// ==================== TAB 2: Permessi Pagine ====================
function PermessiPagineTab() {
  const { data: users = [] } = useUsers();
  const { data: allPermissions = [], isLoading: permissionsLoading } = useAllPagePermissions();
  const { data: allTurnoPermissions = [], isLoading: turnoPermissionsLoading } = useAllTurnoPermissions();
  const setPermission = useSetPagePermission();
  const resetPermissions = useResetUserPermissions();
  const setTurnoPermission = useSetTurnoPermission();
  const removeTurnoPermission = useRemoveTurnoPermission();
  const resetTurnoPermissions = useResetUserTurnoPermissions();
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const isLoading = permissionsLoading || turnoPermissionsLoading;

  const getEffectiveAccess = (userId: string, pagePath: string): boolean => {
    const customPermission = allPermissions.find(p => p.user_id === userId && p.page_path === pagePath);
    return customPermission?.can_access ?? false;
  };

  const hasCustomPermission = (userId: string, pagePath: string): boolean => {
    return allPermissions.some(p => p.user_id === userId && p.page_path === pagePath);
  };

  const hasTurnoPermission = (userId: string, turnoValue: string): boolean => {
    return allTurnoPermissions.some(p => p.user_id === userId && p.turno === turnoValue);
  };

  const handlePermissionChange = async (userId: string, pagePath: string, canAccess: boolean) => {
    const key = `${userId}-${pagePath}`;
    setPendingChanges(prev => new Set(prev).add(key));
    const relatedPages: string[] = [];
    if (pagePath === '/visualizza-moduli') relatedPages.push('/visualizza-moduli/:id/risposte');
    try {
      await setPermission.mutateAsync({ userId, pagePath, canAccess });
      for (const relatedPath of relatedPages) {
        await setPermission.mutateAsync({ userId, pagePath: relatedPath, canAccess });
      }
      toast({ title: 'Permesso aggiornato', description: `Accesso ${canAccess ? 'abilitato' : 'disabilitato'}` });
    } finally {
      setPendingChanges(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleTurnoPermissionChange = async (userId: string, turnoValue: string, turnoLabel: string, userName: string) => {
    const key = `${userId}-turno-${turnoValue}`;
    setPendingChanges(prev => new Set(prev).add(key));
    try {
      const hasPermission = hasTurnoPermission(userId, turnoValue);
      if (hasPermission) {
        await removeTurnoPermission.mutateAsync({ userId, turno: turnoValue });
        toast({ title: 'Permesso turno rimosso', description: `${turnoLabel} rimosso da ${userName}` });
      } else {
        await setTurnoPermission.mutateAsync({ userId, turno: turnoValue });
        toast({ title: 'Permesso turno assegnato', description: `${turnoLabel} assegnato a ${userName}` });
      }
    } finally {
      setPendingChanges(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleResetUser = async (userId: string) => {
    await Promise.all([resetPermissions.mutateAsync(userId), resetTurnoPermissions.mutateAsync(userId)]);
  };

  const nonAdminUsers = users.filter((u: UserWithStatus) => !u.is_admin);
  const displayPages = availablePages.filter(p => !p.path.includes(':id'));

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (nonAdminUsers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun utente non-admin presente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurazione Accesso Pagine</CardTitle>
          <CardDescription>Abilita o disabilita l'accesso alle pagine per ogni utente. Gli amministratori hanno sempre accesso completo.</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Permesso</TableHead>
                  {nonAdminUsers.map((u: UserWithStatus) => (
                    <TableHead key={u.id} className={`text-center min-w-[120px] ${!u.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-medium">{u.full_name}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">{u.email}</span>
                        {!u.is_active && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">Disattivato</Badge>}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={nonAdminUsers.length + 1} className="py-2">
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Pagine</span>
                  </TableCell>
                </TableRow>
                {displayPages.map(page => (
                  <TableRow key={page.path}>
                    <TableCell className="font-medium text-sm">{page.title}</TableCell>
                    {nonAdminUsers.map((u: UserWithStatus) => {
                      const hasAccess = getEffectiveAccess(u.id, page.path);
                      const isCustom = hasCustomPermission(u.id, page.path);
                      const isPending = pendingChanges.has(`${u.id}-${page.path}`);
                      return (
                        <TableCell key={u.id} className={`text-center ${!u.is_active ? 'opacity-50' : ''}`}>
                          <div className={`flex justify-center p-2 rounded ${isCustom && hasAccess ? 'bg-primary/10' : ''}`}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                              <Checkbox checked={hasAccess} onCheckedChange={(checked) => handlePermissionChange(u.id, page.path, !!checked)} disabled={!u.is_active} />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={nonAdminUsers.length + 1} className="py-2">
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Turni</span>
                  </TableCell>
                </TableRow>
                {TURNI.map(turno => (
                  <TableRow key={turno.value}>
                    <TableCell className="font-medium text-sm">{turno.label}</TableCell>
                    {nonAdminUsers.map((u: UserWithStatus) => {
                      const hasPermission = hasTurnoPermission(u.id, turno.value);
                      const isPending = pendingChanges.has(`${u.id}-turno-${turno.value}`);
                      return (
                        <TableCell key={u.id} className={`text-center ${!u.is_active ? 'opacity-50' : ''}`}>
                          <div className={`flex justify-center p-2 rounded ${hasPermission ? 'bg-primary/10' : ''}`}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                              <Checkbox checked={hasPermission} onCheckedChange={() => handleTurnoPermissionChange(u.id, turno.value, turno.label, u.full_name)} disabled={!u.is_active} />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-2">Azioni</TableCell>
                  {nonAdminUsers.map((u: UserWithStatus) => (
                    <TableCell key={u.id} className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleResetUser(u.id)} disabled={resetPermissions.isPending || resetTurnoPermissions.isPending} className="gap-1">
                        <RotateCcw className="h-3 w-3" />Reset
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TAB 3: Account Staff ====================
function AccountStaffTab() {
  const { data: accounts, isLoading } = useStaffAccounts();
  const resetPassword = useResetStaffPassword();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiato!', description: 'Copiato negli appunti' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun account staff creato dall'Anagrafica Staff.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Staff</CardTitle>
          <CardDescription>Account creati dall'Anagrafica Staff con credenziali di accesso. Puoi copiare o resettare le password.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="hidden sm:table-cell">Data creazione</TableHead>
                  <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[180px]">{acc.email}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(acc.email)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{acc.generated_password}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(acc.generated_password)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                      {new Date(acc.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <RefreshCw className="h-3 w-3" />Reset
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Resettare la password?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Verrà generata una nuova password per <strong>{acc.full_name}</strong>. La vecchia password non sarà più valida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => resetPassword.mutateAsync(acc.user_id)}>
                              {resetPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                              Reset Password
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== PAGINA PRINCIPALE ====================
export default function AdminPermessi() {
  return (
    <MainLayout title="Gestione Utenti & Permessi">
      <Tabs defaultValue="utenti" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utenti" className="gap-1.5">
            <Users className="h-4 w-4 hidden sm:block" />
            Gestione Utenti
          </TabsTrigger>
          <TabsTrigger value="permessi" className="gap-1.5">
            <FileKey className="h-4 w-4 hidden sm:block" />
            Permessi Pagine
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <UserPlus className="h-4 w-4 hidden sm:block" />
            Account Staff
          </TabsTrigger>
        </TabsList>
        <TabsContent value="utenti"><GestioneUtentiTab /></TabsContent>
        <TabsContent value="permessi"><PermessiPagineTab /></TabsContent>
        <TabsContent value="staff"><AccountStaffTab /></TabsContent>
      </Tabs>
    </MainLayout>
  );
}
