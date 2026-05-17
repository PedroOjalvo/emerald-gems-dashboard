import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type PlanActivo = 'explorer' | 'strategic' | 'executive';

export interface UserProfile {
  user_id: string;
  nombre: string | null;
  apellidos: string | null;
  pais: string;
  nif_nie: string | null;
  plan_activo: PlanActivo;
  moneda_base: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  plan: PlanActivo;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const initializedRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('perfiles_usuario')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) {
        setProfile(data as UserProfile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Primero: obtener sesión actual sin esperar eventos
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      initializedRef.current = true;
      setLoading(false);
    });

    // Segundo: escuchar cambios futuros (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Solo actuar si ya hemos inicializado para evitar doble carga
        if (!initializedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const plan: PlanActivo = profile?.plan_activo ?? 'explorer';

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, plan, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
