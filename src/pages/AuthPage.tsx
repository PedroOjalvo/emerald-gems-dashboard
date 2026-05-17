import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, ArrowRight, Mail, LogIn, Loader2, Gem } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="noise-bg min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Sesión iniciada correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="noise-bg min-h-screen flex flex-col items-center justify-center px-4">
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center gap-3 mb-2 hover:opacity-90 transition-opacity">
            <Gem className="h-8 w-8 text-primary" />
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="text-primary">Emerald</span>{' '}
              <span className="text-foreground">Gems</span>
            </h1>
          </Link>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Inteligencia Estratégica para Inversores
          </p>
        </div>

        {/* Login header */}
        <div className="flex bg-card border border-border rounded-lg overflow-hidden w-full">
          <div className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 bg-primary text-primary-foreground">
            <LogIn className="h-4 w-4" />
            Iniciar Sesión
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-card border border-border rounded-lg py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              autoFocus
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              minLength={6}
              className="w-full bg-card border border-border rounded-lg py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Acceder
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-muted-foreground/60 text-xs text-center">
          El registro de nuevas cuentas está deshabilitado.<br />
          Contacte con el administrador para solicitar acceso.
        </p>

        <p className="text-muted-foreground/40 text-xs">
          v1.0 · Emerald Gems
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
