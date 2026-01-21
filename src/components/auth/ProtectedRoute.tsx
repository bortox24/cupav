import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useMyPagePermissions } from '@/hooks/usePagePermissions';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'tesoriere' | 'visualizzatore')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, userRole, signOut } = useAuth();
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

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Accesso non autorizzato
          </h2>
          <p className="text-muted-foreground">
            Il tuo account non ha un ruolo assegnato. Contatta l'amministratore.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => void signOut()}>
              Esci
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check custom page permissions
  if (!canAccessPage(location.pathname)) {
    return <Navigate to="/home" replace />;
  }

  // Also check role-based access if specified (backup check)
  if (allowedRoles && !allowedRoles.includes(userRole) && userRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
