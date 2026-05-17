import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import type { Purchase } from '@/types/portfolio';

async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');
  return user.id;
}

function toSupabaseTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export async function registrarCompra(p: Purchase) {
  const userId = await requireUserId();
  const fecha = toSupabaseTimestamp(p.date);

  const { error: movErr } = await supabase.from('movimientos').insert({
    tipo_operacion: 'Compra',
    ticker: p.ticker,
    cantidad: p.quantity,
    precio_unidad: p.price,
    comision: p.commission,
    fecha,
    importe_liquidez: null,
    user_id: userId,
  });
  if (movErr) throw movErr;

  const { data: existing } = await supabase
    .from('activos')
    .select('id, cantidad_total, precio_compra_avg')
    .eq('ticker', p.ticker)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const oldTotal = existing.cantidad_total * existing.precio_compra_avg;
    const newTotal = p.quantity * p.price;
    const newQty = existing.cantidad_total + p.quantity;
    const newAvg = newQty > 0 ? (oldTotal + newTotal) / newQty : 0;

    const { error } = await supabase
      .from('activos')
      .update({
        cantidad_total: newQty,
        precio_compra_avg: newAvg,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq('ticker', p.ticker)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('activos').insert({
      ticker: p.ticker,
      nombre: p.ticker,
      tipo_activo: p.type,
      cantidad_total: p.quantity,
      precio_compra_avg: p.price,
      precio_actual: p.price,
      ultima_actualizacion: new Date().toISOString(),
      user_id: userId,
    });
    if (error) throw error;
  }

  if (p.commission > 0) {
    await actualizarLiquidez(-p.commission, userId);
  }
}

export async function registrarVenta(p: Purchase) {
  const userId = await requireUserId();
  const saleTotal = p.quantity * p.price;
  const fecha = toSupabaseTimestamp(p.date);

  const { error: movErr } = await supabase.from('movimientos').insert({
    tipo_operacion: 'Venta',
    ticker: p.ticker,
    cantidad: p.quantity,
    precio_unidad: p.price,
    comision: p.commission,
    fecha,
    importe_liquidez: null,
    user_id: userId,
  });
  if (movErr) throw movErr;

  const { data: existing } = await supabase
    .from('activos')
    .select('id, cantidad_total')
    .eq('ticker', p.ticker)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const newQty = existing.cantidad_total - p.quantity;
    const { error } = await supabase
      .from('activos')
      .update({
        cantidad_total: Math.max(0, newQty),
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq('ticker', p.ticker)
      .eq('user_id', userId);
    if (error) throw error;
  }

  await actualizarLiquidez(saleTotal - p.commission, userId);
}

export async function registrarLiquidez(importe: number, fecha: string) {
  const userId = await requireUserId();
  const fechaMovimiento = toSupabaseTimestamp(fecha);

  const { error: movErr } = await supabase.from('movimientos').insert({
    tipo_operacion: 'Liquidez',
    ticker: 'LIQUIDEZ',
    cantidad: 1,
    precio_unidad: 0,
    comision: 0,
    fecha: fechaMovimiento,
    importe_liquidez: importe,
    user_id: userId,
  });
  if (movErr) throw movErr;

  await actualizarLiquidez(importe, userId);
}

async function actualizarLiquidez(amount: number, userId: string) {
  const { data: liq } = await supabase
    .from('activos')
    .select('id, cantidad_total')
    .eq('ticker', 'LIQUIDEZ')
    .eq('user_id', userId)
    .maybeSingle();

  if (liq) {
    const { error } = await supabase
      .from('activos')
      .update({
        cantidad_total: liq.cantidad_total + amount,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq('ticker', 'LIQUIDEZ')
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('activos').insert({
      ticker: 'LIQUIDEZ',
      nombre: 'Liquidez',
      tipo_activo: 'Liquidez',
      cantidad_total: amount,
      precio_compra_avg: 0,
      precio_actual: 0,
      ultima_actualizacion: new Date().toISOString(),
      user_id: userId,
    });
    if (error) throw error;
  }
}
