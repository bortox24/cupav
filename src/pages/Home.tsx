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
  FileKey,
  FileText,
  Eye,
} from 'lucide-react';
import { useMyPagePermissions } from '@/hooks/usePagePermissions';

interface QuickAccessCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

const allQuickAccessCards: QuickAccessCard[] = [
  {
    title: 'Registra Transazione',
    description: 'Inserisci una nuova spesa, prelievo o entrata',
    icon: <Receipt className="h-7 w-7" />,
    path: '/registrazione-spese-prelievi',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-300 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    title: 'Dashboard Controllo',
    description: 'Visualizza grafici e statistiche in tempo reale',
    icon: <PieChart className="h-7 w-7" />,
    path: '/controllo-spese',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-300 dark:border-teal-800',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    title: 'Visualizza Moduli',
    description: 'Consulta risposte e statistiche dei moduli',
    icon: <Eye className="h-7 w-7" />,
    path: '/visualizza-moduli',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Gestione Utenti',
    description: 'Crea utenti e gestisci accessi',
    icon: <Users className="h-7 w-7" />,
    path: '/admin/permessi',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  {
    title: 'Gestione Categorie',
    description: 'Configura le categorie per spese, prelievi ed entrate',
    icon: <FolderOpen className="h-7 w-7" />,
    path: '/admin/categorie',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-300 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    title: 'Permessi Pagine',
    description: 'Configura accesso pagine per singolo utente',
    icon: <FileKey className="h-7 w-7" />,
    path: '/admin/permessi-pagine',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Gestione Moduli',
    description: 'Crea moduli pubblici e visualizza risposte',
    icon: <FileText className="h-7 w-7" />,
    path: '/admin/moduli',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
];

export default function Home() {
  const { profile } = useAuth();
  const { canAccessPage, isLoading } = useMyPagePermissions();

  // Filter cards based on user's actual page permissions
  const accessibleCards = allQuickAccessCards.filter(card => {
    // Don't show Home card in quick access (we're already on Home)
    if (card.path === '/home') return false;
    return canAccessPage(card.path);
  });

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {accessibleCards.map((card) => (
                <Link 
                  key={card.path} 
                  to={card.path}
                  className="group block"
                >
                  <Card className={`h-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2 ${card.borderColor} ${card.bgColor}`}>
                    <CardContent className="flex flex-col items-center justify-center py-6 px-3">
                      <div className={`w-14 h-14 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${card.iconColor}`}>
                        {card.icon}
                      </div>
                      <CardTitle className="text-center text-sm sm:text-base font-semibold text-foreground">
                        {card.title}
                      </CardTitle>
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
