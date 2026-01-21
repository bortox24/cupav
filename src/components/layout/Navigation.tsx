import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Receipt, 
  PieChart, 
  Users, 
  FolderOpen, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: ('admin' | 'tesoriere' | 'visualizzatore')[];
}

const navItems: NavItem[] = [
  { 
    path: '/home', 
    label: 'Home', 
    icon: <Home className="h-4 w-4" />,
    roles: ['admin', 'tesoriere', 'visualizzatore']
  },
  { 
    path: '/registrazione-spese-prelievi', 
    label: 'Registra Transazione', 
    icon: <Receipt className="h-4 w-4" />,
    roles: ['admin', 'tesoriere']
  },
  { 
    path: '/controllo-spese', 
    label: 'Dashboard Controllo', 
    icon: <PieChart className="h-4 w-4" />,
    roles: ['admin', 'tesoriere', 'visualizzatore']
  },
  { 
    path: '/admin/permessi', 
    label: 'Gestione Utenti', 
    icon: <Users className="h-4 w-4" />,
    roles: ['admin']
  },
  { 
    path: '/admin/categorie', 
    label: 'Gestione Categorie', 
    icon: <FolderOpen className="h-4 w-4" />,
    roles: ['admin']
  },
];

export function Navigation() {
  const { userRole, signOut, profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredNavItems = navItems.filter(item => 
    userRole && item.roles.includes(userRole)
  );

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary-foreground/20"
                    : "hover:bg-primary-foreground/10"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* User info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm opacity-90">
              {profile?.full_name || 'Utente'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary-foreground/20"
                    : "hover:bg-primary-foreground/10"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <div className="border-t border-primary-foreground/20 pt-3 mt-3">
              <div className="px-4 py-2 text-sm opacity-90">
                {profile?.full_name || 'Utente'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
