-- reconcile_portfolio.sql
-- Objetivo:
-- 1) auditar descuadres entre movimientos y activos
-- 2) separar precio vivo de contabilidad
-- 3) crear vistas reconciliadas para la app
-- 4) preparar snapshots para reporting/Telegram

begin;

-- =========================================================
-- 0. Columnas opcionales de apoyo
-- =========================================================
-- Se mantienen las tablas actuales. Estas columnas son opcionales,
-- pero útiles para marcar intención y trazabilidad.

alter table if exists public.activos
  add column if not exists fuente_precio text,
  add column if not exists notas text;

-- =========================================================
-- 1. Auditoría base
-- =========================================================

create or replace view public.audit_activos_sin_precio as
select
  ticker,
  nombre,
  tipo_activo,
  precio_actual,
  ultima_actualizacion,
  user_id
from public.activos
where ticker <> 'LIQUIDEZ'
  and (precio_actual is null or precio_actual <= 0);

create or replace view public.audit_activos_precio_obsoleto as
select
  ticker,
  nombre,
  tipo_activo,
  precio_actual,
  ultima_actualizacion,
  now() - ultima_actualizacion as antiguedad,
  user_id
from public.activos
where ticker <> 'LIQUIDEZ';

create or replace view public.audit_cantidad_descuadrada as
select
  m.user_id,
  m.ticker,
  coalesce(sum(
    case
      when m.tipo_operacion = 'Compra' then m.cantidad
      when m.tipo_operacion = 'Venta' then -m.cantidad
      else 0
    end
  ), 0)::numeric as cantidad_calculada,
  coalesce(a.cantidad_total, 0)::numeric as cantidad_en_activos,
  (
    coalesce(sum(
      case
        when m.tipo_operacion = 'Compra' then m.cantidad
        when m.tipo_operacion = 'Venta' then -m.cantidad
        else 0
      end
    ), 0)::numeric - coalesce(a.cantidad_total, 0)::numeric
  ) as diferencia
from public.movimientos m
left join public.activos a
  on a.user_id = m.user_id
 and a.ticker = m.ticker
where m.ticker <> 'LIQUIDEZ'
group by m.user_id, m.ticker, a.cantidad_total
having abs(
  coalesce(sum(
    case
      when m.tipo_operacion = 'Compra' then m.cantidad
      when m.tipo_operacion = 'Venta' then -m.cantidad
      else 0
    end
  ), 0)::numeric - coalesce(a.cantidad_total, 0)::numeric
) > 0.000001;

create or replace view public.audit_liquidez_descuadrada as
with liquidez_movs as (
  select
    user_id,
    coalesce(sum(case when tipo_operacion = 'Liquidez' then importe_liquidez else 0 end), 0)::numeric as aportes_liquidez,
    coalesce(sum(case when tipo_operacion = 'Compra' then (cantidad * precio_unidad + comision) else 0 end), 0)::numeric as salidas_por_compras,
    coalesce(sum(case when tipo_operacion = 'Venta' then (cantidad * precio_unidad - comision) else 0 end), 0)::numeric as entradas_por_ventas
  from public.movimientos
  group by user_id
)
select
  l.user_id,
  (l.aportes_liquidez - l.salidas_por_compras + l.entradas_por_ventas) as liquidez_calculada,
  coalesce(a.cantidad_total, 0)::numeric as liquidez_en_activos,
  (l.aportes_liquidez - l.salidas_por_compras + l.entradas_por_ventas) - coalesce(a.cantidad_total, 0)::numeric as diferencia
from liquidez_movs l
left join public.activos a
  on a.user_id = l.user_id
 and a.ticker = 'LIQUIDEZ';

-- =========================================================
-- 2. Vista reconciliada de posiciones actuales
-- =========================================================
-- Idea:
-- - cantidad actual se calcula desde movimientos
-- - coste actual vivo se aproxima usando precio_compra_avg de activos
--   como cache disponible hoy
-- - precio_actual viene de activos
-- - la app debería leer esta vista para posiciones actuales

create or replace view public.posiciones_actuales as
with movs as (
  select
    user_id,
    ticker,
    sum(
      case
        when tipo_operacion = 'Compra' then cantidad
        when tipo_operacion = 'Venta' then -cantidad
        else 0
      end
    )::numeric as cantidad_actual,
    sum(case when tipo_operacion = 'Compra' then cantidad * precio_unidad else 0 end)::numeric as capital_comprado_bruto,
    sum(case when tipo_operacion = 'Venta' then cantidad * precio_unidad else 0 end)::numeric as capital_vendido_bruto,
    sum(case when tipo_operacion in ('Compra','Venta') then comision else 0 end)::numeric as comisiones_totales,
    count(*) filter (where tipo_operacion = 'Compra')::integer as n_compras,
    count(*) filter (where tipo_operacion = 'Venta')::integer as n_ventas
  from public.movimientos
  where ticker <> 'LIQUIDEZ'
  group by user_id, ticker
),
base as (
  select
    coalesce(a.user_id, m.user_id) as user_id,
    coalesce(a.ticker, m.ticker) as ticker,
    coalesce(a.nombre, m.ticker) as nombre,
    a.tipo_activo,
    coalesce(m.cantidad_actual, 0)::numeric as cantidad_actual,
    coalesce(a.precio_compra_avg, 0)::numeric as precio_compra_avg,
    coalesce(a.precio_actual, 0)::numeric as precio_actual,
    a.ultima_actualizacion,
    coalesce(m.capital_comprado_bruto, 0)::numeric as capital_comprado_bruto,
    coalesce(m.capital_vendido_bruto, 0)::numeric as capital_vendido_bruto,
    coalesce(m.comisiones_totales, 0)::numeric as comisiones_totales,
    coalesce(m.n_compras, 0) as n_compras,
    coalesce(m.n_ventas, 0) as n_ventas
  from movs m
  full outer join public.activos a
    on a.user_id = m.user_id
   and a.ticker = m.ticker
  where coalesce(a.ticker, m.ticker) <> 'LIQUIDEZ'
)
select
  user_id,
  ticker,
  nombre,
  tipo_activo,
  cantidad_actual,
  precio_compra_avg,
  precio_actual,
  (cantidad_actual * precio_compra_avg)::numeric as coste_total_estimado,
  (cantidad_actual * precio_actual)::numeric as valor_actual,
  ((cantidad_actual * precio_actual) - (cantidad_actual * precio_compra_avg))::numeric as pnl_no_realizado,
  case
    when (cantidad_actual * precio_compra_avg) > 0
      then (((cantidad_actual * precio_actual) - (cantidad_actual * precio_compra_avg)) / (cantidad_actual * precio_compra_avg))
    else 0
  end::numeric as rentabilidad_no_realizada,
  capital_comprado_bruto,
  capital_vendido_bruto,
  comisiones_totales,
  n_compras,
  n_ventas,
  ultima_actualizacion
from base
where abs(cantidad_actual) > 0.000001;

-- =========================================================
-- 3. Resumen vivo de cartera
-- =========================================================

create or replace view public.resumen_cartera_actual as
with posiciones as (
  select * from public.posiciones_actuales
),
liq as (
  select
    user_id,
    coalesce(cantidad_total, 0)::numeric as liquidez
  from public.activos
  where ticker = 'LIQUIDEZ'
),
movs as (
  select
    user_id,
    coalesce(sum(case when tipo_operacion = 'Liquidez' then importe_liquidez else 0 end), 0)::numeric as capital_neto_aportado
  from public.movimientos
  group by user_id
),
agg as (
  select
    p.user_id,
    coalesce(sum(p.coste_total_estimado), 0)::numeric as coste_total,
    coalesce(sum(p.valor_actual), 0)::numeric as valor_invertido,
    coalesce(sum(p.pnl_no_realizado), 0)::numeric as pnl_no_realizado,
    coalesce(sum(p.comisiones_totales), 0)::numeric as comisiones_totales
  from posiciones p
  group by p.user_id
)
select
  a.user_id,
  a.coste_total,
  a.valor_invertido,
  coalesce(l.liquidez, 0)::numeric as liquidez,
  (a.valor_invertido + coalesce(l.liquidez, 0))::numeric as valor_total,
  a.pnl_no_realizado,
  coalesce(m.capital_neto_aportado, 0)::numeric as capital_neto_aportado,
  ((a.valor_invertido + coalesce(l.liquidez, 0)) - coalesce(m.capital_neto_aportado, 0))::numeric as pnl_total_estimado,
  case
    when coalesce(m.capital_neto_aportado, 0) > 0
      then (((a.valor_invertido + coalesce(l.liquidez, 0)) - coalesce(m.capital_neto_aportado, 0)) / m.capital_neto_aportado)
    else 0
  end::numeric as rentabilidad_total_estimada,
  a.comisiones_totales
from agg a
left join liq l on l.user_id = a.user_id
left join movs m on m.user_id = a.user_id;

-- =========================================================
-- 4. Snapshot diario desde estado reconciliado
-- =========================================================

create or replace function public.generar_snapshot_cartera(p_user_id uuid, p_fecha date default current_date)
returns uuid
language plpgsql
security definer
as $$
declare
  v_snapshot_id uuid;
  v_resumen record;
begin
  select *
  into v_resumen
  from public.resumen_cartera_actual
  where user_id = p_user_id;

  if v_resumen is null then
    raise exception 'No existe resumen_cartera_actual para user_id=%', p_user_id;
  end if;

  insert into public.snapshots_cartera (
    id,
    fecha_snapshot,
    valor_total,
    liquidez,
    coste_total,
    pnl_total,
    rentabilidad_total,
    observaciones,
    user_id
  )
  values (
    gen_random_uuid(),
    p_fecha,
    v_resumen.valor_total,
    v_resumen.liquidez,
    v_resumen.coste_total,
    v_resumen.pnl_total_estimado,
    v_resumen.rentabilidad_total_estimada,
    'Snapshot generado desde resumen_cartera_actual',
    p_user_id
  )
  returning id into v_snapshot_id;

  insert into public.snapshot_activos (
    snapshot_id,
    ticker,
    nombre,
    tipo_activo,
    cantidad,
    precio_compra_avg,
    precio_actual,
    valor_posicion,
    peso_cartera,
    pnl,
    rentabilidad,
    user_id
  )
  select
    v_snapshot_id,
    p.ticker,
    p.nombre,
    p.tipo_activo,
    p.cantidad_actual,
    p.precio_compra_avg,
    p.precio_actual,
    p.valor_actual,
    case
      when r.valor_total > 0 then p.valor_actual / r.valor_total
      else 0
    end as peso_cartera,
    p.pnl_no_realizado,
    p.rentabilidad_no_realizada,
    p.user_id
  from public.posiciones_actuales p
  join public.resumen_cartera_actual r
    on r.user_id = p.user_id
  where p.user_id = p_user_id;

  return v_snapshot_id;
end;
$$;

commit;

-- =========================================================
-- Consultas rápidas de uso
-- =========================================================
-- select * from public.audit_activos_sin_precio;
-- select * from public.audit_activos_precio_obsoleto order by ultima_actualizacion asc;
-- select * from public.audit_cantidad_descuadrada;
-- select * from public.audit_liquidez_descuadrada;
-- select * from public.posiciones_actuales where user_id = '<USER_ID>';
-- select * from public.resumen_cartera_actual where user_id = '<USER_ID>';
-- select public.generar_snapshot_cartera('<USER_ID>'::uuid, current_date);
