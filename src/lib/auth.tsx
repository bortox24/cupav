import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isActive: boolean;
  profile: { full_name: string; email: string } | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);

  const fetchUserData = async (userId: string) => {
    // Fetch admin status
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Fetch profile with is_active
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email, is_active')
      .eq('id', userId)
      .maybeSingle();
    
    return {
      isAdmin: roleData?.role === 'admin',
      isActive: profileData?.is_active ?? true,
      profile: profileData ? { full_name: profileData.full_name, email: profileData.email } : null,
    };
  };

  useEffect(() => {
    let isMounted = true;

    const applyUserData = async (userId: string) => {
      const data = await fetchUserData(userId);
      if (!isMounted) return;
      setIsAdmin(data.isAdmin);
      setIsActive(data.isActive);
      setProfile(data.profile);
    };

    // Listener for ongoing auth changes (does NOT control initial loading)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        // Fire-and-forget to keep UI responsive; initial load handles readiness.
        void applyUserData(nextSession.user.id);
      } else {
        setIsAdmin(false);
        setIsActive(true);
        setProfile(null);
      }
    });

    // Initial load (controls loading state)
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await applyUserData(initialSession.user.id);
        } else {
          setIsAdmin(false);
          setIsActive(true);
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsActive(true);
    setProfile(null);
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    isActive,
    profile,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
