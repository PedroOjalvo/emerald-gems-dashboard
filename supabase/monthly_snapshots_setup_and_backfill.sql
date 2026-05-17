-- =========================================================
-- SNAPSHOTS MENSUALES: SETUP + BACKFILL
-- =========================================================
-- Este script:
-- 1) crea/actualiza la función para generar snapshots mensuales por user_id
-- 2) busca el user_id del owner por email
-- 3) ejecuta el backfill mensual histórico sin duplicar snapshots existentes
--
-- Úsalo en Supabase SQL Editor.
-- Si el email del owner cambia, ajusta v_owner_email.

begin;

create or replace function public.generar_snapshots_mensuales_usuario(
  p_user_id uuid,
  p_desde date default null,
  p_hasta date default current_date
)
returns integer
language plpgsql
security definer
as $$
declare
  v_inicio date;
  v_cursor date;
  v_fin_mes date;
  v_count integer := 0;
begin
  select coalesce(
    p_desde,
    date_trunc('month', min(fecha))::date,
    date_trunc('month', current_date)::date
  )
  into v_inicio
  from public.movimientos
  where user_id = p_user_id;

  v_cursor := date_trunc('month', v_inicio)::date;

  while v_cursor <= p_hasta loop
    v_fin_mes := (date_trunc('month', v_cursor) + interval '1 month - 1 day')::date;

    if v_fin_mes <= p_hasta then
      if not exists (
        select 1
        from public.snapshots_cartera s
        where s.user_id = p_user_id
          and s.fecha_snapshot = v_fin_mes
      ) then
        perform public.generar_snapshot_cartera(p_user_id, v_fin_mes);
        v_count := v_count + 1;
      end if;
    end if;

    v_cursor := (date_trunc('month', v_cursor) + interval '1 month')::date;
  end loop;

  return v_count;
end;
$$;

commit;

-- =========================================================
-- BACKFILL HISTÓRICO DEL OWNER
-- =========================================================
-- Devuelve cuántos snapshots mensuales nuevos ha creado.

do $$
declare
  v_owner_email text := 'finanzas.thimble396@slmail.me';
  v_user_id uuid;
  v_created integer;
begin
  select id
  into v_user_id
  from auth.users
  where lower(email) = lower(v_owner_email)
  limit 1;

  if v_user_id is null then
    raise exception 'No se encontró user_id para email=%', v_owner_email;
  end if;

  v_created := public.generar_snapshots_mensuales_usuario(v_user_id);

  raise notice 'Snapshots mensuales creados para % (%): %', v_owner_email, v_user_id, v_created;
end $$;

-- =========================================================
-- COMPROBACIONES RÁPIDAS
-- =========================================================
-- Ver últimos snapshots creados:
-- select fecha_snapshot, valor_total, liquidez, coste_total, pnl_total, rentabilidad_total
-- from public.snapshots_cartera
-- where user_id = (
--   select id from auth.users where lower(email) = lower('finanzas.thimble396@slmail.me') limit 1
-- )
-- order by fecha_snapshot desc
-- limit 24;
