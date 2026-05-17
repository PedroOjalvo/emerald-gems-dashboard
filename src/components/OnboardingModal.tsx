import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Gem, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const OnboardingModal = () => {
  const { user, refreshProfile } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [pais, setPais] = useState('ES');
  const [moneda, setMoneda] = useState('EUR');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('perfiles_usuario')
        .update({ nombre: nombre.trim(), apellidos: apellidos.trim() || null, pais, moneda_base: moneda })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('¡Perfil completado!');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <Gem className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Bienvenido a Emerald Gems</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Antes de empezar, cuéntanos un poco sobre ti para personalizar tu experiencia.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-muted/30 border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Apellidos
            </label>
            <input
              type="text"
              value={apellidos}
              onChange={e => setApellidos(e.target.value)}
              placeholder="Tus apellidos"
              className="w-full bg-muted/30 border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                País
              </label>
              <select
                value={pais}
                onChange={e => setPais(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-lg py-2.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="ES">🇪🇸 España</option>
                <option value="MX">🇲🇽 México</option>
                <option value="AR">🇦🇷 Argentina</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="CL">🇨🇱 Chile</option>
                <option value="PE">🇵🇪 Perú</option>
                <option value="OTHER">🌍 Otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-lg py-2.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="MXN">MXN $</option>
                <option value="ARS">ARS $</option>
                <option value="COP">COP $</option>
                <option value="CLP">CLP $</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 bg-primary text-primary-foreground font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Empezar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
