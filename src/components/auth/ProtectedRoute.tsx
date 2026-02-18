import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useMyPagePermissions } from '@/hooks/usePagePermissions';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isActive, signOut } = useAuth();
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Account disattivato
          </h2>
          <p className="text-muted-foreground">
            Il tuo account è stato disattivato. Contatta l'amministratore per riattivarlo.
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

  // Check page permissions (turno pages handle their own access via useTurnoPermissions)
  const isTurnoPage = location.pathname.startsWith('/turno/');
  if (!isTurnoPage && !canAccessPage(location.pathname)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
