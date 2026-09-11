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
import { useStaffAccounts, useResetStaffPassword, useToggleStaffActive } from '@/hooks/useStaffAccounts';
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

// ==================== Permessi di un singolo utente ====================
function UserPermessiDialog({ utente, open, onOpenChange }: { utente: UserWithStatus; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: allPermissions = [], isLoading: permissionsLoading } = useAllPagePermissions();
  const { data: allTurnoPermissions = [], isLoading: turnoPermissionsLoading } = useAllTurnoPermissions();
  const setPermission = useSetPagePermission();
  const resetPermissions = useResetUserPermissions();
  const setTurnoPermission = useSetTurnoPermission();
  const removeTurnoPermission = useRemoveTurnoPermission();
  const resetTurnoPermissions = useResetUserTurnoPermissions();
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const isLoading = permissionsLoading || turnoPermissionsLoading;
  const displayPages = availablePages.filter(p => !p.path.includes(':id'));
  const filteredPages = displayPages.filter(p => p.title.toLowerCase().includes(search.trim().toLowerCase()));

  const hasAccess = (pagePath: string) =>
    allPermissions.find(p => p.user_id === utente.id && p.page_path === pagePath)?.can_access ?? false;
  const hasTurno = (turnoValue: string) =>
    allTurnoPermissions.some(p => p.user_id === utente.id && p.turno === turnoValue);

  const attivePages = displayPages.filter(p => hasAccess(p.path)).length;

  const handlePermissionChange = async (pagePath: string, canAccess: boolean, silent = false) => {
    const key = `page-${pagePath}`;
    setPendingChanges(prev => new Set(prev).add(key));
    const relatedPages: string[] = [];
    if (pagePath === '/visualizza-moduli') relatedPages.push('/visualizza-moduli/:id/risposte');
    try {
      await setPermission.mutateAsync({ userId: utente.id, pagePath, canAccess });
      for (const relatedPath of relatedPages) {
        await setPermission.mutateAsync({ userId: utente.id, pagePath: relatedPath, canAccess });
      }
      if (!silent) toast({ title: 'Permesso aggiornato', description: `Accesso ${canAccess ? 'abilitato' : 'disabilitato'}` });
    } finally {
      setPendingChanges(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleTurnoChange = async (turnoValue: string, turnoLabel: string) => {
    const key = `turno-${turnoValue}`;
    setPendingChanges(prev => new Set(prev).add(key));
    try {
      if (hasTurno(turnoValue)) {
        await removeTurnoPermission.mutateAsync({ userId: utente.id, turno: turnoValue });
        toast({ title: 'Permesso turno rimosso', description: `${turnoLabel} rimosso da ${utente.full_name}` });
      } else {
        await setTurnoPermission.mutateAsync({ userId: utente.id, turno: turnoValue });
        toast({ title: 'Permesso turno assegnato', description: `${turnoLabel} assegnato a ${utente.full_name}` });
      }
    } finally {
      setPendingChanges(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleSelectAll = async (value: boolean) => {
    for (const page of filteredPages) {
      if (hasAccess(page.path) !== value) {
        await handlePermissionChange(page.path, value, true);
      }
    }
    toast({ title: value ? 'Pagine abilitate' : 'Pagine disabilitate', description: `${filteredPages.length} pagine aggiornate` });
  };

  const handleReset = async () => {
    await Promise.all([resetPermissions.mutateAsync(utente.id), resetTurnoPermissions.mutateAsync(utente.id)]);
    toast({ title: 'Permessi azzerati', description: `Tutti i permessi di ${utente.full_name} sono stati rimossi` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey className="h-4 w-4" />Permessi di {utente.full_name}
          </DialogTitle>
          <DialogDescription>{utente.email}</DialogDescription>
        </DialogHeader>

        {utente.is_admin ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-start gap-2">
            <Shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <span>Questo utente è amministratore: ha già accesso completo a tutte le pagine e a tutti i turni.</span>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {!utente.is_active && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                Account disattivato: i permessi restano salvati ma non sono utilizzabili finché non lo riattivi.
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Pagine <span className="text-muted-foreground font-normal">({attivePages}/{displayPages.length} abilitate)</span></h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>Seleziona tutto</Button>
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>Nessuna</Button>
                </div>
              </div>
              <Input placeholder="Cerca pagina..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10" />
              <div className="grid gap-1.5 sm:grid-cols-2">
                {filteredPages.map(page => {
                  const active = hasAccess(page.path);
                  const isPending = pendingChanges.has(`page-${page.path}`);
                  return (
                    <label
                      key={page.path}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${active ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50'} ${!utente.is_active ? 'opacity-60' : ''}`}
                    >
                      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <Checkbox
                          className="h-5 w-5"
                          checked={active}
                          onCheckedChange={(checked) => handlePermissionChange(page.path, !!checked)}
                          disabled={!utente.is_active}
                        />
                      )}
                      <span className="text-sm">{page.title}</span>
                    </label>
                  );
                })}
                {filteredPages.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">Nessuna pagina trovata.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Turni</h4>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {TURNI.map(turno => {
                  const active = hasTurno(turno.value);
                  const isPending = pendingChanges.has(`turno-${turno.value}`);
                  return (
                    <label
                      key={turno.value}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${active ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50'} ${!utente.is_active ? 'opacity-60' : ''}`}
                    >
                      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <Checkbox
                          className="h-5 w-5"
                          checked={active}
                          onCheckedChange={() => handleTurnoChange(turno.value, turno.label)}
                          disabled={!utente.is_active}
                        />
                      )}
                      <span className="text-sm">{turno.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={handleReset}
                disabled={resetPermissions.isPending || resetTurnoPermissions.isPending}
              >
                <RotateCcw className="h-3 w-3" />Azzera tutti i permessi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


// ==================== TAB 3: Account Staff ====================
function AccountStaffTab() {
  const { data: accounts, isLoading } = useStaffAccounts();
  const resetPassword = useResetStaffPassword();
  const toggleActive = useToggleStaffActive();

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
                  <TableHead className="hidden md:table-cell">Turni</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="text-center">Stato</TableHead>
                  <TableHead className="hidden lg:table-cell">Data creazione</TableHead>
                  <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id} className={!acc.is_active ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{acc.full_name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {acc.turni.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {acc.turni.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nessun turno</span>
                      )}
                    </TableCell>
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
                    <TableCell className="text-center">
                      {acc.is_active ? (
                        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-transparent">Attivo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-transparent">Disattivato</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {new Date(acc.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            {acc.is_active ? (
                              <Button variant="destructive" size="sm" className="gap-1">
                                <PowerOff className="h-3 w-3" />Disattiva
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="gap-1 border-green-600/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40">
                                <Power className="h-3 w-3" />Riattiva
                              </Button>
                            )}
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {acc.is_active ? "Disattivare l'account?" : "Riattivare l'account?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {acc.is_active ? (
                                  <>
                                    <strong>{acc.full_name}</strong> non potrà più accedere alla piattaforma con le proprie credenziali finché non verrà riattivato.
                                  </>
                                ) : (
                                  <>
                                    <strong>{acc.full_name}</strong> potrà nuovamente accedere alla piattaforma con le stesse credenziali.
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => toggleActive.mutateAsync({ userId: acc.user_id, isActive: !acc.is_active })}>
                                {toggleActive.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {acc.is_active ? 'Disattiva' : 'Riattiva'}
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="utenti" className="gap-1.5">
            <Users className="h-4 w-4 hidden sm:block" />
            Gestione Utenti
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <UserPlus className="h-4 w-4 hidden sm:block" />
            Account Staff
          </TabsTrigger>
        </TabsList>
        <TabsContent value="utenti"><GestioneUtentiTab /></TabsContent>
        <TabsContent value="staff"><AccountStaffTab /></TabsContent>
      </Tabs>
    </MainLayout>
  );
}
