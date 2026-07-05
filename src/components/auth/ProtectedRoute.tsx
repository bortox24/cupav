import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useMyPagePermissions } from '@/hooks/usePagePermissions';
import { Loader2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    animatore: 'Animatore',
    cuoco: 'Cuoco',
    responsabile_campo: 'Responsabile di campo',
    responsabile_animatori: 'Responsabile animatori',
  };
  return map[role] ?? role.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isActive, profile, staffRole, signOut } = useAuth();
  const { canAccessPage, isLoading: permissionsLoading } = useMyPagePermissions();
  const location = useLocation();

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user is active
  if (!isActive) {
    const name = profile?.full_name ?? '';
    const roleText = staffRole ? formatRole(staffRole) : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
          </div>
          {roleText ? (
            <>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Ciao {name}
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Grazie per essere stato {roleText} al CUPAV 2026
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Ciao {name}
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Grazie per essere stato al CUPAV 2026
              </p>
            </>
          )}
          <div className="border-t border-border pt-6">
            <p className="text-muted-foreground">
              Il tuo account è stato disattivato. Contatta l'amministratore per riattivarlo.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => void signOut()}>
              Esci
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check page permissions (turno pages handle their own access via useTurnoPermissions)
  const isTurnoPage = location.pathname.startsWith('/turno/');
  if (!isTurnoPage && !canAccessPage(location.pathname)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
