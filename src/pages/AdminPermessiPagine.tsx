import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Shield, Users } from 'lucide-react';
import { useUsers, type UserWithStatus } from '@/hooks/useUsers';
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
import { toast } from '@/hooks/use-toast';

export default function AdminPermessiPagine() {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: allPermissions = [], isLoading: permissionsLoading } = useAllPagePermissions();
  const { data: allTurnoPermissions = [], isLoading: turnoPermissionsLoading } = useAllTurnoPermissions();
  const setPermission = useSetPagePermission();
  const resetPermissions = useResetUserPermissions();
  const setTurnoPermission = useSetTurnoPermission();
  const removeTurnoPermission = useRemoveTurnoPermission();
  const resetTurnoPermissions = useResetUserTurnoPermissions();
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const isLoading = usersLoading || permissionsLoading || turnoPermissionsLoading;

  // Get effective access for a user/page combo
  const getEffectiveAccess = (userId: string, pagePath: string): boolean => {
    const customPermission = allPermissions.find(
      p => p.user_id === userId && p.page_path === pagePath
    );
    return customPermission?.can_access ?? false;
  };

  // Check if user has custom permission
  const hasCustomPermission = (userId: string, pagePath: string): boolean => {
    return allPermissions.some(p => p.user_id === userId && p.page_path === pagePath);
  };

  // Check if user has turno permission
  const hasTurnoPermission = (userId: string, turnoValue: string): boolean => {
    return allTurnoPermissions.some(p => p.user_id === userId && p.turno === turnoValue);
  };

  const handlePermissionChange = async (userId: string, pagePath: string, canAccess: boolean) => {
    const key = `${userId}-${pagePath}`;
    setPendingChanges(prev => new Set(prev).add(key));
    
    const relatedPages: string[] = [];
    if (pagePath === '/visualizza-moduli' && canAccess) {
      relatedPages.push('/visualizza-moduli/:id/risposte');
    }
    if (pagePath === '/visualizza-moduli' && !canAccess) {
      relatedPages.push('/visualizza-moduli/:id/risposte');
    }
    
    try {
      await setPermission.mutateAsync({ userId, pagePath, canAccess });
      for (const relatedPath of relatedPages) {
        await setPermission.mutateAsync({ userId, pagePath: relatedPath, canAccess });
      }
      toast({
        title: 'Permesso aggiornato',
        description: relatedPages.length > 0 
          ? `Accesso ${canAccess ? 'abilitato' : 'disabilitato'} (incluse risposte moduli)`
          : `Accesso ${canAccess ? 'abilitato' : 'disabilitato'}`,
      });
    } finally {
      setPendingChanges(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleTurnoPermissionChange = async (userId: string, turnoValue: string, turnoLabel: string, userName: string) => {
    const key = `${userId}-turno-${turnoValue}`;
    setPendingChanges(prev => new Set(prev).add(key));
    
    try {
      const hasPermission = hasTurnoPermission(userId, turnoValue);
      if (hasPermission) {
        await removeTurnoPermission.mutateAsync({ userId, turno: turnoValue });
        toast({
          title: 'Permesso turno rimosso',
          description: `Permesso ${turnoLabel} rimosso da ${userName}`,
        });
      } else {
        await setTurnoPermission.mutateAsync({ userId, turno: turnoValue });
        toast({
          title: 'Permesso turno assegnato',
          description: `Permesso ${turnoLabel} assegnato a ${userName}`,
        });
      }
    } finally {
      setPendingChanges(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleResetUser = async (userId: string) => {
    await Promise.all([
      resetPermissions.mutateAsync(userId),
      resetTurnoPermissions.mutateAsync(userId),
    ]);
  };

  const nonAdminUsers = users.filter((u: UserWithStatus) => !u.is_admin);
  const displayPages = availablePages.filter(p => !p.path.includes(':id'));

  if (isLoading) {
    return (
      <MainLayout title="Permessi Pagine">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Permessi Pagine">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurazione Accesso Pagine</CardTitle>
            <CardDescription>
              Abilita o disabilita l'accesso alle pagine per ogni utente. 
              Gli amministratori hanno sempre accesso completo e non sono mostrati qui.
            </CardDescription>
          </CardHeader>
        </Card>

        {nonAdminUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nessun utente non-admin presente. Crea prima degli utenti nella pagina Gestione Utenti.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Utente</TableHead>
                      {displayPages.map(page => (
                        <TableHead key={page.path} className="text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{page.title}</span>
                          </div>
                        </TableHead>
                      ))}
                      {TURNI.map(turno => (
                        <TableHead key={turno.value} className="text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{turno.label}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonAdminUsers.map((user: UserWithStatus) => (
                      <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {user.email}
                            </span>
                            {!user.is_active && (
                              <Badge variant="outline" className="w-fit text-xs bg-destructive/10 text-destructive">
                                Disattivato
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {displayPages.map(page => {
                          const hasAccess = getEffectiveAccess(user.id, page.path);
                          const isCustom = hasCustomPermission(user.id, page.path);
                          const isPending = pendingChanges.has(`${user.id}-${page.path}`);
                          
                          return (
                            <TableCell key={page.path} className="text-center">
                              <div className={`flex justify-center p-2 rounded ${isCustom && hasAccess ? 'bg-primary/10' : ''}`}>
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Checkbox
                                    checked={hasAccess}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(user.id, page.path, !!checked)
                                    }
                                    disabled={!user.is_active}
                                    aria-label={`Accesso a ${page.title} per ${user.full_name}`}
                                  />
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        {TURNI.map(turno => {
                          const hasPermission = hasTurnoPermission(user.id, turno.value);
                          const isPending = pendingChanges.has(`${user.id}-turno-${turno.value}`);
                          
                          return (
                            <TableCell key={turno.value} className="text-center">
                              <div className={`flex justify-center p-2 rounded ${hasPermission ? 'bg-primary/10' : ''}`}>
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Checkbox
                                    checked={hasPermission}
                                    onCheckedChange={() => 
                                      handleTurnoPermissionChange(user.id, turno.value, turno.label, user.full_name)
                                    }
                                    disabled={!user.is_active}
                                    aria-label={`Permesso ${turno.label} per ${user.full_name}`}
                                  />
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetUser(user.id)}
                            disabled={resetPermissions.isPending || resetTurnoPermissions.isPending}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 mt-0.5 text-destructive" />
              <p>
                Gli amministratori hanno sempre accesso a tutte le pagine e non vengono mostrati in questa tabella.
                Per rendere un utente amministratore, vai su "Gestione Utenti".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
