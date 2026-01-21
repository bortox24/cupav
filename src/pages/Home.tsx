import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Receipt, 
  PieChart, 
  Users, 
  FolderOpen,
  ArrowRight,
  Shield,
  TrendingUp,
  Wallet
} from 'lucide-react';

interface QuickAccessCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  roles: ('admin' | 'tesoriere' | 'visualizzatore')[];
}

const quickAccessCards: QuickAccessCard[] = [
  {
    title: 'Registra Transazione',
    description: 'Inserisci una nuova spesa, prelievo o entrata',
    icon: <Receipt className="h-8 w-8" />,
    path: '/registrazione-spese-prelievi',
    color: 'bg-primary/10 text-primary',
    roles: ['admin', 'tesoriere'],
  },
  {
    title: 'Dashboard Controllo',
    description: 'Visualizza grafici e statistiche in tempo reale',
    icon: <PieChart className="h-8 w-8" />,
    path: '/controllo-spese',
    color: 'bg-secondary/20 text-secondary-foreground',
    roles: ['admin', 'tesoriere', 'visualizzatore'],
  },
  {
    title: 'Gestione Utenti',
    description: 'Crea utenti e assegna ruoli',
    icon: <Users className="h-8 w-8" />,
    path: '/admin/permessi',
    color: 'bg-destructive/10 text-destructive',
    roles: ['admin'],
  },
  {
    title: 'Gestione Categorie',
    description: 'Configura le categorie per spese, prelievi ed entrate',
    icon: <FolderOpen className="h-8 w-8" />,
    path: '/admin/categorie',
    color: 'bg-accent text-accent-foreground',
    roles: ['admin'],
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

  const accessibleCards = quickAccessCards.filter(
    (card) => userRole && card.roles.includes(userRole)
  );

  const currentRoleInfo = userRole ? roleInfo[userRole] : null;

  return (
    <MainLayout title="Home">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-card rounded-xl p-6 border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Ciao, {profile?.full_name || 'Utente'}! 👋
              </h2>
              <p className="text-muted-foreground mt-1">
                Benvenuto nella dashboard CUPAV
              </p>
            </div>
            {currentRoleInfo && (
              <div className="flex items-center gap-3 bg-primary/10 rounded-lg px-4 py-2">
                <div className="text-primary">{currentRoleInfo.icon}</div>
                <div>
                  <p className="font-medium text-foreground">{currentRoleInfo.label}</p>
                  <p className="text-sm text-muted-foreground">{currentRoleInfo.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Cards */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Accesso rapido</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accessibleCards.map((card) => (
              <Card key={card.path} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${card.color}`}>
                    {card.icon}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription className="mt-1">{card.description}</CardDescription>
                  </div>
                  <Button asChild variant="outline" className="w-full group">
                    <Link to={card.path}>
                      Vai
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
