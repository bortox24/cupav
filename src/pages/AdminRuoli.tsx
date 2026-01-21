import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  useRoles,
  useRolePagePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useSetRolePagePermission,
  availablePages,
  roleColorOptions,
  Role,
} from '@/hooks/useRoles';
import {
  Plus,
  Shield,
  Loader2,
  Trash2,
  Edit2,
  Lock,
  Settings,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const roleSchema = z.object({
  name: z.string().min(2, 'Nome troppo corto').max(50, 'Nome troppo lungo')
    .regex(/^[a-z_]+$/, 'Solo lettere minuscole e underscore'),
  label: z.string().min(2, 'Label troppo corta').max(50, 'Label troppo lunga'),
  description: z.string().max(200, 'Descrizione troppo lunga').optional(),
  color: z.string(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

function getRoleBadgeClass(color: string): string {
  const colorMap: Record<string, string> = {
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    teal: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    gray: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };
  return colorMap[color] || colorMap.gray;
}

export default function AdminRuoli() {
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: permissions = [], isLoading: permissionsLoading } = useRolePagePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const setPermission = useSetRolePagePermission();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const isLoading = rolesLoading || permissionsLoading;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      label: '',
      description: '',
      color: 'blue',
    },
  });

  const handleCreateRole = async (values: RoleFormValues) => {
    await createRole.mutateAsync({
      name: values.name,
      label: values.label,
      description: values.description,
      color: values.color,
    });
    form.reset();
    setIsCreateDialogOpen(false);
  };

  const handleUpdateRole = async (values: RoleFormValues) => {
    if (!editingRole) return;
    await updateRole.mutateAsync({
      id: editingRole.id,
      name: values.name,
      label: values.label,
      description: values.description,
      color: values.color,
    });
    form.reset();
    setEditingRole(null);
  };

  const handleDeleteRole = async (roleId: string) => {
    await deleteRole.mutateAsync(roleId);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      label: role.label,
      description: role.description || '',
      color: role.color,
    });
  };

  const getRolePermission = (roleId: string, pagePath: string): boolean => {
    const perm = permissions.find(
      (p) => p.role_id === roleId && p.page_path === pagePath
    );
    return perm?.can_access ?? false;
  };

  const handlePermissionChange = async (
    roleId: string,
    pagePath: string,
    canAccess: boolean
  ) => {
    await setPermission.mutateAsync({ roleId, pagePath, canAccess });
  };

  if (isLoading) {
    return (
      <MainLayout title="Gestione Ruoli">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const RoleFormContent = ({ onSubmit, isEdit = false }: { onSubmit: (values: RoleFormValues) => void; isEdit?: boolean }) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome identificativo</Label>
        <Input
          id="name"
          placeholder="es. coordinatore"
          {...form.register('name')}
          disabled={isEdit && editingRole?.is_system}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">Solo lettere minuscole e underscore</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Etichetta visualizzata</Label>
        <Input
          id="label"
          placeholder="es. Coordinatore"
          {...form.register('label')}
        />
        {form.formState.errors.label && (
          <p className="text-sm text-destructive">{form.formState.errors.label.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          placeholder="Descrizione del ruolo..."
          {...form.register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label>Colore</Label>
        <Select
          value={form.watch('color')}
          onValueChange={(value) => form.setValue('color', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleColorOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${option.className}`} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
          {(createRole.isPending || updateRole.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEdit ? 'Salva modifiche' : 'Crea ruolo'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <MainLayout title="Gestione Ruoli">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Ruoli</h2>
            <p className="text-sm text-muted-foreground">
              Gestisci i ruoli e i permessi delle pagine
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuovo Ruolo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea nuovo ruolo</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli del nuovo ruolo
                </DialogDescription>
              </DialogHeader>
              <RoleFormContent onSubmit={handleCreateRole} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Roles List */}
        <Accordion type="multiple" className="space-y-4">
          {roles.map((role) => (
            <AccordionItem
              key={role.id}
              value={role.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge className={`${getRoleBadgeClass(role.color)} border`}>
                    {role.is_system && <Lock className="h-3 w-3 mr-1" />}
                    {role.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {role.description}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 space-y-4">
                  {/* Role Actions */}
                  <div className="flex gap-2">
                    <Dialog open={editingRole?.id === role.id} onOpenChange={(open) => !open && setEditingRole(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(role)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifica ruolo</DialogTitle>
                          <DialogDescription>
                            Modifica i dettagli del ruolo "{role.label}"
                          </DialogDescription>
                        </DialogHeader>
                        <RoleFormContent onSubmit={handleUpdateRole} isEdit />
                      </DialogContent>
                    </Dialog>

                    {!role.is_system && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Elimina
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina ruolo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare il ruolo "{role.label}"?
                              Gli utenti con questo ruolo perderanno l'accesso.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRole(role.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Page Permissions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Settings className="h-4 w-4" />
                      Permessi pagine
                    </div>
                    <div className="grid gap-2">
                      {availablePages.map((page) => {
                        const hasAccess = getRolePermission(role.id, page.path);
                        const isAdmin = role.name === 'admin';
                        
                        return (
                          <div
                            key={page.path}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                          >
                            <div>
                              <p className="font-medium text-sm">{page.title}</p>
                              <p className="text-xs text-muted-foreground">{page.description}</p>
                            </div>
                            <Checkbox
                              checked={isAdmin ? true : hasAccess}
                              onCheckedChange={(checked) => {
                                if (!isAdmin) {
                                  handlePermissionChange(role.id, page.path, !!checked);
                                }
                              }}
                              disabled={isAdmin || setPermission.isPending}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {role.is_system && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Questo è un ruolo di sistema e non può essere eliminato
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MainLayout>
  );
}
