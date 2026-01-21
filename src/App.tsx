import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import RegistrazioneSpesePrelievi from "./pages/RegistrazioneSpesePrelievi";
import ControlloSpese from "./pages/ControlloSpese";
import AdminPermessi from "./pages/AdminPermessi";
import AdminCategorie from "./pages/AdminCategorie";
import AdminPermessiPagine from "./pages/AdminPermessiPagine";
import AdminModuli from "./pages/AdminModuli";
import AdminModuloRisposte from "./pages/AdminModuloRisposte";
import VisualizzaModuli from "./pages/VisualizzaModuli";
import VisualizzaModuloRisposte from "./pages/VisualizzaModuloRisposte";
import ModuloForm from "./pages/public/ModuloForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
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
        element={
          <ProtectedRoute>
            <AdminPermessiPagine />
          </ProtectedRoute>
        }
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

      {/* Public routes */}
      <Route path="/modulo/:slug" element={<ModuloForm />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
