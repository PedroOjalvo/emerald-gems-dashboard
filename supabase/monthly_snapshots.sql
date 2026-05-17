-- Backfill y mantenimiento de snapshots mensuales por user_id.
-- Requiere que exista public.generar_snapshot_cartera(uuid, date).

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

-- Uso:
-- select public.generar_snapshots_mensuales_usuario('<USER_ID>'::uuid);
