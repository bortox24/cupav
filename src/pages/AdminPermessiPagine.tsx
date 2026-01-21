import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Shield, Users, Eye } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { 
  useAllPagePermissions, 
  useSetPagePermission, 
  useResetUserPermissions,
  availablePages,
  type PageInfo 
} from '@/hooks/usePagePermissions';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <Shield className="h-3 w-3" />, color: 'bg-destructive/10 text-destructive' },
  tesoriere: { label: 'Tesoriere', icon: <Users className="h-3 w-3" />, color: 'bg-primary/10 text-primary' },
  visualizzatore: { label: 'Visualizzatore', icon: <Eye className="h-3 w-3" />, color: 'bg-secondary text-secondary-foreground' },
};

export default function AdminPermessiPagine() {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: allPermissions = [], isLoading: permissionsLoading } = useAllPagePermissions();
  const setPermission = useSetPagePermission();
  const resetPermissions = useResetUserPermissions();
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const isLoading = usersLoading || permissionsLoading;

  // Get effective access for a user/page combo
  const getEffectiveAccess = (userId: string, userRole: AppRole | null, page: PageInfo): boolean => {
    // Check custom permission first
    const customPermission = allPermissions.find(
      p => p.user_id === userId && p.page_path === page.path
    );
    
    if (customPermission) {
      return customPermission.can_access;
    }
    
    // Fall back to role default
    if (userRole) {
      return page.defaultRoles.includes(userRole);
    }
    
    return false;
  };

  // Check if user has custom permission (different from default)
  const hasCustomPermission = (userId: string, pagePath: string): boolean => {
    return allPermissions.some(p => p.user_id === userId && p.page_path === pagePath);
  };

  const handlePermissionChange = async (userId: string, pagePath: string, canAccess: boolean) => {
    const key = `${userId}-${pagePath}`;
    setPendingChanges(prev => new Set(prev).add(key));
    
    try {
      await setPermission.mutateAsync({ userId, pagePath, canAccess });
      toast({
        title: 'Permesso aggiornato',
        description: `Accesso ${canAccess ? 'abilitato' : 'disabilitato'}`,
      });
    } finally {
      setPendingChanges(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleResetUser = async (userId: string) => {
    await resetPermissions.mutateAsync(userId);
  };

  // Filter out admin users - they always have full access
  const nonAdminUsers = users.filter(u => u.role !== 'admin');

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
        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurazione Accesso Pagine</CardTitle>
            <CardDescription>
              Personalizza l'accesso alle pagine per ogni utente. Gli amministratori hanno sempre accesso completo.
              Le caselle colorate indicano permessi personalizzati (diversi dal default del ruolo).
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
                      {availablePages.map(page => (
                        <TableHead key={page.path} className="text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{page.title}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonAdminUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {user.email}
                            </span>
                            {user.role && (
                              <Badge variant="outline" className={`w-fit text-xs ${roleLabels[user.role].color}`}>
                                {roleLabels[user.role].icon}
                                <span className="ml-1">{roleLabels[user.role].label}</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {availablePages.map(page => {
                          const hasAccess = getEffectiveAccess(user.id, user.role, page);
                          const isCustom = hasCustomPermission(user.id, page.path);
                          const isPending = pendingChanges.has(`${user.id}-${page.path}`);
                          const isDefaultAccess = user.role && page.defaultRoles.includes(user.role);
                          
                          return (
                            <TableCell key={page.path} className="text-center">
                              <div className={`flex justify-center p-2 rounded ${isCustom ? 'bg-primary/10' : ''}`}>
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Checkbox
                                    checked={hasAccess}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(user.id, page.path, !!checked)
                                    }
                                    aria-label={`Accesso a ${page.title} per ${user.full_name}`}
                                  />
                                )}
                              </div>
                              {isCustom && (
                                <span className="text-[10px] text-primary">
                                  personalizzato
                                </span>
                              )}
                              {!isCustom && (
                                <span className="text-[10px] text-muted-foreground">
                                  {isDefaultAccess ? 'default ✓' : 'default ✗'}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetUser(user.id)}
                            disabled={resetPermissions.isPending}
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

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legenda Ruoli Default</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-destructive">Admin:</span>
                <span className="text-muted-foreground ml-2">Accesso a tutte le pagine</span>
              </div>
              <div>
                <span className="font-medium text-primary">Tesoriere:</span>
                <span className="text-muted-foreground ml-2">Home, Registrazione, Dashboard</span>
              </div>
              <div>
                <span className="font-medium">Visualizzatore:</span>
                <span className="text-muted-foreground ml-2">Home, Dashboard (solo lettura)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
