import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { AssetType, OperationType, Purchase } from '@/types/portfolio';
import { registrarCompra, registrarVenta, registrarLiquidez } from '@/lib/supabaseActions';
import { toast } from 'sonner';

interface AddPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (purchase: Purchase) => void;
}

const ASSET_TYPES: AssetType[] = ['Acción', 'ETF', 'Crypto', 'Metal', 'REIT'];
const OPERATION_TYPES: OperationType[] = ['Compra', 'Venta', 'Liquidez'];

const AddPurchaseModal = ({ open, onClose, onAdd }: AddPurchaseModalProps) => {
  const [operation, setOperation] = useState<OperationType>('Compra');
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<AssetType>('Acción');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [commission, setCommission] = useState('0');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isLiquidity = operation === 'Liquidez';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const purchase: Purchase = {
        id: Date.now().toString(),
        ticker: isLiquidity ? 'LIQUIDEZ' : ticker.toUpperCase(),
        type: isLiquidity ? 'Liquidez' : type,
        operation,
        quantity: isLiquidity ? 1 : parseFloat(quantity),
        price: parseFloat(price),
        date,
        commission: isLiquidity ? 0 : parseFloat(commission) || 0,
      };

      if (operation === 'Compra') {
        await registrarCompra(purchase);
        toast.success('Compra registrada correctamente');
      } else if (operation === 'Venta') {
        await registrarVenta(purchase);
        toast.success('Venta registrada correctamente');
      } else {
        await registrarLiquidez(parseFloat(price), date);
        toast.success('Movimiento de liquidez registrado');
      }

      await Promise.resolve(onAdd(purchase));
      setTicker(''); setQuantity(''); setPrice(''); setDate(''); setCommission('0');
      setOperation('Compra');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al registrar: ' + (err?.message || 'desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-mono";
  const labelClass = "block text-sm text-muted-foreground mb-1.5";

  const operationColors: Record<OperationType, string> = {
    'Compra': 'bg-emerald/20 text-emerald border-emerald/40',
    'Venta': 'bg-ruby/20 text-ruby border-ruby/40',
    'Liquidez': 'bg-cyan-400/20 text-cyan-400 border-cyan-400/40',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Nueva Acción</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Operation type selector */}
        <div className="flex gap-2 mb-5">
          {OPERATION_TYPES.map(op => (
            <button
              key={op}
              type="button"
              onClick={() => setOperation(op)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                operation === op ? operationColors[op] : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
              }`}
            >
              {op}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLiquidity ? (
            <>
              <div>
                <label className={labelClass}>Importe (€)</label>
                <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} placeholder="1000.00 (positivo = entrada, negativo = salida)" className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ticker / Nombre</label>
                  <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="AAPL" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Tipo de Activo</label>
                  <select value={type} onChange={e => setType(e.target.value as AssetType)} className={inputClass}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cantidad</label>
                  <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="10" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Precio {operation === 'Venta' ? 'de Venta' : 'de Compra'} (€)</label>
                  <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} placeholder="150.00" className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Comisión (€)</label>
                  <input type="number" step="any" value={commission} onChange={e => setCommission(e.target.value)} placeholder="0" className={inputClass} />
                </div>
              </div>
            </>
          )}

          <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground">
            {operation === 'Compra' && '💡 La comisión se descontará de la liquidez disponible.'}
            {operation === 'Venta' && '💡 El importe de la venta (menos comisión) se añadirá a la liquidez.'}
            {operation === 'Liquidez' && '💡 Positivo = entrada de dinero. Negativo = salida de dinero.'}
          </div>

          <button type="submit" disabled={loading} className={`w-full font-semibold py-3 rounded-lg transition-all mt-2 disabled:opacity-50 ${
            operation === 'Venta' ? 'bg-ruby text-white hover:brightness-110' : 'bg-primary text-primary-foreground hover:brightness-110'
          }`}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
              <>
                {operation === 'Compra' && 'Registrar Compra'}
                {operation === 'Venta' && 'Registrar Venta'}
                {operation === 'Liquidez' && 'Registrar Movimiento'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPurchaseModal;
