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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer data fetching to avoid blocking
          setTimeout(async () => {
            const data = await fetchUserData(session.user.id);
            setIsAdmin(data.isAdmin);
            setIsActive(data.isActive);
            setProfile(data.profile);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsActive(true);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id).then((data) => {
          setIsAdmin(data.isAdmin);
          setIsActive(data.isActive);
          setProfile(data.profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
