import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Receipt, 
  PieChart, 
  Users, 
  FolderOpen,
  FileKey,
  FileText,
  Eye,
  Tent,
  TreePine,
  Sun,
  Mountain,
  Calendar,
} from 'lucide-react';
import { useMyPagePermissions } from '@/hooks/usePagePermissions';
import { useState, useEffect } from 'react';

// Countdown Component
function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 min-w-[40px] sm:min-w-[50px] text-center transition-all">
        <span className="text-xl sm:text-2xl font-bold tabular-nums">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] sm:text-xs text-white/70 mt-1">{label}</span>
    </div>
  );
}

function CampingCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const targetDate = new Date('2026-06-27T00:00:00');
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="mt-4 pt-4 border-t border-white/20">
      <div className="flex items-center gap-2 text-white/80 mb-3">
        <Calendar className="h-4 w-4 shrink-0" />
        <span className="text-xs sm:text-sm font-medium">Mancano al Campeggio Estate 2026 (27 Giugno)</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <CountdownBox value={timeLeft.days} label="Giorni" />
        <span className="text-white/50 text-lg font-light">:</span>
        <CountdownBox value={timeLeft.hours} label="Ore" />
        <span className="text-white/50 text-lg font-light">:</span>
        <CountdownBox value={timeLeft.minutes} label="Min" />
        <span className="text-white/50 text-lg font-light hidden sm:block">:</span>
        <div className="hidden sm:block">
          <CountdownBox value={timeLeft.seconds} label="Sec" />
        </div>
      </div>
    </div>
  );
}

interface QuickAccessCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
}

const allQuickAccessCards: QuickAccessCard[] = [
  {
    title: 'Registra Transazione',
    description: 'Inserisci una nuova spesa, prelievo o entrata',
    icon: <Receipt className="h-7 w-7" />,
    path: '/registrazione-spese-prelievi',
    gradient: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-50 dark:from-green-950/50 dark:via-emerald-950/30 dark:to-teal-950/30',
    borderColor: 'border-green-300 dark:border-green-700',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    iconColor: 'text-white',
  },
  {
    title: 'Dashboard Controllo',
    description: 'Visualizza grafici e statistiche in tempo reale',
    icon: <PieChart className="h-7 w-7" />,
    path: '/controllo-spese',
    gradient: 'bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-50 dark:from-teal-950/50 dark:via-cyan-950/30 dark:to-sky-950/30',
    borderColor: 'border-teal-300 dark:border-teal-700',
    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    iconColor: 'text-white',
  },
  {
    title: 'Visualizza Moduli',
    description: 'Consulta risposte e statistiche dei moduli',
    icon: <Eye className="h-7 w-7" />,
    path: '/visualizza-moduli',
    gradient: 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-50 dark:from-sky-950/50 dark:via-blue-950/30 dark:to-indigo-950/30',
    borderColor: 'border-sky-300 dark:border-sky-700',
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
    iconColor: 'text-white',
  },
  {
    title: 'Gestione Utenti',
    description: 'Crea utenti e gestisci accessi',
    icon: <Users className="h-7 w-7" />,
    path: '/admin/permessi',
    gradient: 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50 dark:from-orange-950/50 dark:via-amber-950/30 dark:to-yellow-950/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
    iconColor: 'text-white',
  },
  {
    title: 'Gestione Categorie',
    description: 'Configura le categorie per spese, prelievi ed entrate',
    icon: <FolderOpen className="h-7 w-7" />,
    path: '/admin/categorie',
    gradient: 'bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 dark:from-purple-950/50 dark:via-violet-950/30 dark:to-fuchsia-950/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
    iconColor: 'text-white',
  },
  {
    title: 'Permessi Pagine',
    description: 'Configura accesso pagine per singolo utente',
    icon: <FileKey className="h-7 w-7" />,
    path: '/admin/permessi-pagine',
    gradient: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-lime-50 dark:from-amber-950/50 dark:via-yellow-950/30 dark:to-lime-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    iconColor: 'text-white',
  },
  {
    title: 'Gestione Moduli',
    description: 'Crea moduli pubblici e visualizza risposte',
    icon: <Tent className="h-7 w-7" />,
    path: '/admin/moduli',
    gradient: 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-teal-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
    iconColor: 'text-white',
  },
  {
    title: 'Anagrafica Ragazzi',
    description: 'Gestionale anagrafico ragazzi CUPAV',
    icon: <Users className="h-7 w-7" />,
    path: '/anagrafica-ragazzi',
    gradient: 'bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-50 dark:from-rose-950/50 dark:via-pink-950/30 dark:to-fuchsia-950/30',
    borderColor: 'border-rose-300 dark:border-rose-700',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
    iconColor: 'text-white',
  },
  {
    title: 'Preiscrizione CUPAV',
    description: 'Form pubblico preiscrizione campeggio',
    icon: <FileText className="h-7 w-7" />,
    path: '/preiscrizione-cupav',
    gradient: 'bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-50 dark:from-cyan-950/50 dark:via-teal-950/30 dark:to-emerald-950/30',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
    iconColor: 'text-white',
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
        {/* Welcome Section - Camping Theme */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
          {/* Decorative background elements - hidden on mobile */}
          <div className="absolute inset-0 overflow-hidden hidden sm:block">
            <div className="absolute -top-4 -right-4 opacity-10">
              <Mountain className="h-32 w-32" />
            </div>
            <div className="absolute bottom-2 right-20 opacity-10">
              <TreePine className="h-24 w-24" />
            </div>
            <div className="absolute top-4 right-40 opacity-20">
              <Sun className="h-16 w-16" />
            </div>
            <div className="absolute bottom-4 right-48 opacity-10">
              <Tent className="h-20 w-20" />
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
              <div className="p-2.5 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm w-fit">
                <Tent className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Ciao, {profile?.full_name || 'Utente'}! 👋
                </h2>
                <p className="text-white/90 text-base sm:text-lg mt-1">
                  Benvenuto nella dashboard CUPAV
                </p>
              </div>
            </div>
            <CampingCountdown />
          </div>
        </div>

        {/* Quick Access Cards */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Accesso rapido
          </h3>
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
                  <Card className={`h-full hover:shadow-xl transition-all duration-300 hover:scale-[1.03] cursor-pointer border-2 ${card.borderColor} ${card.gradient}`}>
                    <CardContent className="flex flex-col items-center justify-center py-6 px-3">
                      <div className={`w-14 h-14 ${card.iconBg} rounded-xl shadow-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:rotate-3 ${card.iconColor}`}>
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
