import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Receipt, 
  PieChart, 
  Users, 
  FolderOpen,
  ArrowRight,
  Shield,
  FileKey,
  FileText,
} from 'lucide-react';
import { useMyPagePermissions } from '@/hooks/usePagePermissions';

interface QuickAccessCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const allQuickAccessCards: QuickAccessCard[] = [
  {
    title: 'Registra Transazione',
    description: 'Inserisci una nuova spesa, prelievo o entrata',
    icon: <Receipt className="h-8 w-8" />,
    path: '/registrazione-spese-prelievi',
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'Dashboard Controllo',
    description: 'Visualizza grafici e statistiche in tempo reale',
    icon: <PieChart className="h-8 w-8" />,
    path: '/controllo-spese',
    color: 'bg-secondary/20 text-secondary-foreground',
  },
  {
    title: 'Gestione Utenti',
    description: 'Crea utenti e assegna ruoli',
    icon: <Users className="h-8 w-8" />,
    path: '/admin/permessi',
    color: 'bg-destructive/10 text-destructive',
  },
  {
    title: 'Gestione Categorie',
    description: 'Configura le categorie per spese, prelievi ed entrate',
    icon: <FolderOpen className="h-8 w-8" />,
    path: '/admin/categorie',
    color: 'bg-accent text-accent-foreground',
  },
  {
    title: 'Permessi Pagine',
    description: 'Configura accesso pagine per singolo utente',
    icon: <FileKey className="h-8 w-8" />,
    path: '/admin/permessi-pagine',
    color: 'bg-muted text-muted-foreground',
  },
  {
    title: 'Gestione Moduli',
    description: 'Crea moduli pubblici e visualizza risposte',
    icon: <FileText className="h-8 w-8" />,
    path: '/admin/moduli',
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'Gestione Ruoli',
    description: 'Crea e configura ruoli e permessi',
    icon: <Shield className="h-8 w-8" />,
    path: '/admin/ruoli',
    color: 'bg-destructive/10 text-destructive',
  },
];

const roleInfo = {
  admin: {
    label: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità',
    icon: <Shield className="h-5 w-5" />,
  },
  tesoriere: {
    label: 'Tesoriere',
    description: 'Gestione transazioni e visualizzazione dashboard',
    icon: <Wallet className="h-5 w-5" />,
  },
  visualizzatore: {
    label: 'Visualizzatore',
    description: 'Solo visualizzazione dei dati',
    icon: <TrendingUp className="h-5 w-5" />,
  },
};

export default function Home() {
  const { userRole, profile } = useAuth();
  const { canAccessPage, isLoading } = useMyPagePermissions();

  // Filter cards based on user's actual page permissions
  const accessibleCards = allQuickAccessCards.filter(card => {
    // Don't show Home card in quick access (we're already on Home)
    if (card.path === '/home') return false;
    return canAccessPage(card.path);
  });

  const currentRoleInfo = userRole ? roleInfo[userRole] : null;

  return (
    <MainLayout title="Home">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-card rounded-xl p-6 border shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Ciao, {profile?.full_name || 'Utente'}! 👋
            </h2>
            <p className="text-muted-foreground mt-1">
              Benvenuto nella dashboard CUPAV
            </p>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Accesso rapido</h3>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {accessibleCards.map((card) => (
                <Link 
                  key={card.path} 
                  to={card.path}
                  className="group block"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02] hover:border-primary/50 cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center ${card.color} transition-transform group-hover:scale-110`}>
                        {card.icon}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          {card.title}
                          <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm">{card.description}</CardDescription>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
