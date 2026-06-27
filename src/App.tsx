import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import RegistrazioneSpesePrelievi from "./pages/RegistrazioneSpesePrelievi";
import ControlloSpese from "./pages/ControlloSpese";
import AdminPermessi from "./pages/AdminPermessi";
import AdminCategorie from "./pages/AdminCategorie";

import AdminModuli from "./pages/AdminModuli";
import AdminModuloRisposte from "./pages/AdminModuloRisposte";
import VisualizzaModuli from "./pages/VisualizzaModuli";
import VisualizzaModuloRisposte from "./pages/VisualizzaModuloRisposte";
import ModuloForm from "./pages/public/ModuloForm";
import PreiscrizioneCupav from "./pages/public/PreiscrizioneCupav";
import IscrizioneCampeggio from "./pages/public/IscrizioneCampeggio";
import IscrizioneFamiglie from "./pages/public/IscrizioneFamiglie";
import IscrizioneMontaggio from "./pages/public/IscrizioneMontaggio";
import ModuloStaff from "./pages/public/ModuloStaff";
import GiornataGenitori from "./pages/public/GiornataGenitori";
import AnagraficaRagazzi from "./pages/AnagraficaRagazzi";
import AnagraficaTurnoFamiglie from "./pages/AnagraficaTurnoFamiglie";
import TurnoPage from "./pages/TurnoPage";
import TurnoFamigliePage from "./pages/TurnoFamigliePage";
import TurnoMontaggioPage from "./pages/TurnoMontaggioPage";
import AnagraficaMontaggioCampeggio from "./pages/AnagraficaMontaggioCampeggio";
import GestionePagamenti from "./pages/GestionePagamenti";
import Impostazioni from "./pages/Impostazioni";
import AnagraficaAnimatori from "./pages/AnagraficaAnimatori";
import Regolamento from "./pages/Regolamento";
import NotFound from "./pages/NotFound";
import { ScrollToTop } from "./components/ScrollToTop";
import { useMobileKeyboardScroll } from "./hooks/useMobileKeyboardScroll";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route - Login */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/home" replace /> : <Login />} 
      />

      {/* Protected routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrazione-spese-prelievi"
        element={
          <ProtectedRoute>
            <RegistrazioneSpesePrelievi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/controllo-spese"
        element={
          <ProtectedRoute>
            <ControlloSpese />
          </ProtectedRoute>
        }
      />
      <Route
        path="/visualizza-moduli"
        element={
          <ProtectedRoute>
            <VisualizzaModuli />
          </ProtectedRoute>
        }
      />
      <Route
        path="/visualizza-moduli/:id/risposte"
        element={
          <ProtectedRoute>
            <VisualizzaModuloRisposte />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/permessi"
        element={
          <ProtectedRoute>
            <AdminPermessi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categorie"
        element={
          <ProtectedRoute>
            <AdminCategorie />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/permessi-pagine"
        element={<Navigate to="/admin/permessi" replace />}
      />
      <Route
        path="/admin/moduli"
        element={
          <ProtectedRoute>
            <AdminModuli />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/moduli/:id/risposte"
        element={
          <ProtectedRoute>
            <AdminModuloRisposte />
          </ProtectedRoute>
        }
      />

      {/* Protected - Anagrafica */}
      <Route
        path="/anagrafica-ragazzi"
        element={
          <ProtectedRoute>
            <AnagraficaRagazzi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anagrafica-animatori"
        element={
          <ProtectedRoute>
            <AnagraficaAnimatori />
          </ProtectedRoute>
        }
      />

      {/* Gestione Pagamenti */}
      <Route
        path="/gestione-pagamenti"
        element={
          <ProtectedRoute>
            <GestionePagamenti />
          </ProtectedRoute>
        }
      />

      {/* Impostazioni */}
      <Route
        path="/impostazioni"
        element={
          <ProtectedRoute>
            <Impostazioni />
          </ProtectedRoute>
        }
      />

      {/* Turno pages */}
      <Route
        path="/turno/:turnoSlug"
        element={
          <ProtectedRoute>
            <TurnoPage />
          </ProtectedRoute>
        }
      />

      {/* Regolamento */}
      <Route
        path="/regolamento"
        element={
          <ProtectedRoute>
            <Regolamento />
          </ProtectedRoute>
        }
      />

      {/* Anagrafica Turno Famiglie */}
      <Route
        path="/anagrafica-turno-famiglie"
        element={
          <ProtectedRoute>
            <AnagraficaTurnoFamiglie />
          </ProtectedRoute>
        }
      />

      {/* Turno Famiglie page */}
      <Route
        path="/turno/turno-famiglie"
        element={
          <ProtectedRoute>
            <TurnoFamigliePage />
          </ProtectedRoute>
        }
      />

      {/* Public routes */}
      <Route path="/preiscrizione-cupav" element={<PreiscrizioneCupav />} />
      <Route path="/iscrizione" element={<IscrizioneCampeggio />} />
      <Route path="/iscrizione-famiglie" element={<IscrizioneFamiglie />} />
      <Route path="/giornata-genitori" element={<GiornataGenitori />} />
      <Route path="/iscrizione-montaggio" element={<IscrizioneMontaggio />} />
      <Route path="/modulo/:slug" element={<ModuloForm />} />
      <Route path="/modulo-staff" element={<ModuloStaff />} />

      {/* Montaggio Campeggio */}
      <Route path="/turno/montaggio-campeggio" element={<ProtectedRoute><TurnoMontaggioPage /></ProtectedRoute>} />
      <Route path="/anagrafica-montaggio-campeggio" element={<ProtectedRoute><AnagraficaMontaggioCampeggio /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  useMobileKeyboardScroll();
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
