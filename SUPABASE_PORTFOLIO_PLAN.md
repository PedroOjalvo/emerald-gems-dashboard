# Plan de saneamiento de Supabase para la cartera

## Diagnóstico

El modelo actual tiene una buena intención, pero mezcla dos responsabilidades:

- `movimientos` guarda la verdad histórica y contable.
- `activos` intenta ser a la vez:
  - estado agregado de posición,
  - tabla editable de metadatos,
  - y tabla de precios vivos.

Eso genera riesgo de descuadre porque `cantidad_total` y `precio_compra_avg` se pueden desalinear respecto a `movimientos`.

Además, la app actual actualiza `activos` directamente al registrar compras/ventas, lo que duplica la lógica de negocio y hace más fácil que aparezcan inconsistencias.

## Decisión recomendada

### Fuente de verdad

#### 1) `movimientos` = fuente de verdad contable
Debe gobernar:
- compras
- ventas
- comisiones
- entradas/salidas de liquidez
- fechas operativas

#### 2) `activos` = estado vivo + metadatos
Debe usarse para:
- `ticker`
- `nombre`
- `tipo_activo`
- `precio_actual`
- `ultima_actualizacion`
- `user_id`

Y **no** debería ser la fuente de verdad principal para:
- `cantidad_total`
- `precio_compra_avg`

Esos valores deberían derivarse desde `movimientos`, idealmente en una vista o función SQL.

#### 3) `snapshots_cartera` y `snapshot_activos` = histórico temporal
Estas tablas sí tienen mucho sentido para:
- evolución diaria de cartera
- informes en Telegram
- rentabilidad por día/mes/año
- gráficos históricos reales

## Problemas actuales concretos

### A. Riesgo de inconsistencia en `activos`
Ahora mismo el frontend inserta una compra/venta en `movimientos` y además modifica `activos`.

Eso significa que si falla una de las dos operaciones, o si un agente toca `activos`, se rompe el equilibrio.

### B. `precio_compra_avg` en `activos` puede mentir
Sobre todo si hay ventas parciales, correcciones manuales, importaciones o reprocesos.

### C. La liquidez está modelada como pseudo-activo
Funciona, pero conviene tratarla como caso especial. No pasa nada por mantener `LIQUIDEZ` en `activos` si os resulta práctico, pero su cálculo debería venir de movimientos de liquidez y flujos de compra/venta.

### D. No hay aún consumo real de snapshots en la app
La app ya está preparada para usar `precio_actual`, pero todavía no usa `snapshots_cartera` ni `snapshot_activos`.

## Arquitectura objetivo

## Opción recomendada

### Mantener tablas existentes, pero cambiar su rol

#### `movimientos`
Tabla operativa principal.

#### `activos`
Tabla de catálogo + precio actual por usuario/activo.

#### Nueva vista sugerida: `posiciones_actuales`
Vista calculada desde `movimientos` + `activos`.

Debe exponer, por usuario y ticker:
- cantidad_actual
- coste_total_actual
- precio_compra_avg_calculado
- precio_actual
- valor_actual
- pnl_no_realizado
- nombre
- tipo_activo
- ultima_actualizacion

Así la app puede leer de ahí sin fiarse de agregados escritos manualmente.

## Qué cambiaría en la app

### 1. Corto plazo
La app ya quedó mejorada para valorar usando `precio_actual`.

### 2. Siguiente paso recomendable
Cambiar lectura de portfolio para que:
- `movimientos` siga cargándose igual para el histórico
- la parte de posiciones actuales venga de una vista SQL calculada, no de `activos.cantidad_total` y `activos.precio_compra_avg`

### 3. Registrar compras/ventas
Idealmente:
- insertar solo en `movimientos`
- recalcular o exponer posición mediante vista SQL
- usar `activos` solo para metadatos y precio vivo

## Qué cambiaría en Supabase

## Recomendación mínima, sin romper lo que ya tienes

### Mantener columnas actuales
No hace falta borrar nada ahora.

### Pero cambiar la política lógica
- `activos.precio_actual`: editable por agentes
- `activos.ultima_actualizacion`: editable por agentes
- `activos.nombre/tipo_activo`: editable por app o mantenimiento
- `activos.cantidad_total/precio_compra_avg`: deprecados o tratados como cache no confiable

## Consultas de auditoría que conviene correr

### 1. Activos sin precio actualizado
```sql
select
  ticker,
  nombre,
  precio_actual,
  ultima_actualizacion,
  user_id
from activos
where ticker <> 'LIQUIDEZ'
  and (precio_actual is null or precio_actual <= 0)
order by ticker;
```

### 2. Activos con precio posiblemente obsoleto
```sql
select
  ticker,
  nombre,
  precio_actual,
  ultima_actualizacion,
  now() - ultima_actualizacion as antiguedad,
  user_id
from activos
where ticker <> 'LIQUIDEZ'
order by ultima_actualizacion asc;
```

### 3. Reconciliar cantidades desde movimientos
```sql
select
  m.user_id,
  m.ticker,
  coalesce(sum(
    case
      when m.tipo_operacion = 'Compra' then m.cantidad
      when m.tipo_operacion = 'Venta' then -m.cantidad
      else 0
    end
  ), 0) as cantidad_calculada,
  a.cantidad_total as cantidad_en_activos,
  coalesce(sum(
    case
      when m.tipo_operacion = 'Compra' then m.cantidad
      when m.tipo_operacion = 'Venta' then -m.cantidad
      else 0
    end
  ), 0) - coalesce(a.cantidad_total, 0) as diferencia
from movimientos m
left join activos a
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
  ), 0) - coalesce(a.cantidad_total, 0)
) > 0.000001
order by m.ticker;
```

### 4. Liquidez reconciliada
```sql
with liquidez_movs as (
  select
    user_id,
    coalesce(sum(case when tipo_operacion = 'Liquidez' then importe_liquidez else 0 end), 0) as aportes_liquidez,
    coalesce(sum(case when tipo_operacion = 'Compra' then (cantidad * precio_unidad + comision) else 0 end), 0) as salidas_por_compras,
    coalesce(sum(case when tipo_operacion = 'Venta' then (cantidad * precio_unidad - comision) else 0 end), 0) as entradas_por_ventas
  from movimientos
  group by user_id
)
select
  l.user_id,
  (l.aportes_liquidez - l.salidas_por_compras + l.entradas_por_ventas) as liquidez_calculada,
  a.cantidad_total as liquidez_en_activos,
  (l.aportes_liquidez - l.salidas_por_compras + l.entradas_por_ventas) - coalesce(a.cantidad_total, 0) as diferencia
from liquidez_movs l
left join activos a
  on a.user_id = l.user_id
 and a.ticker = 'LIQUIDEZ';
```

## SQL de migración propuesto

El archivo recomendado para ejecutar en Supabase es `supabase/reconcile_portfolio.sql`.

Incluye:
- queries de auditoría
- columnas auxiliares opcionales
- vista `posiciones_actuales`
- vista `resumen_cartera_actual`
- función para generar snapshots desde la posición viva

Nota: la vista usa **coste medio móvil aproximado** a partir de las columnas actuales. Si más adelante quieres PnL realizado perfecto por lotes, lo siguiente sería meter FIFO o una reconstrucción contable más estricta.

## Mejor solución contable de verdad

Si quieres hacerlo fino, haría esto en una segunda fase:

- una función SQL o proceso backend que reconstruya posiciones desde `movimientos`
- cálculo consistente de:
  - cantidad actual
  - coste vivo actual
  - precio medio vivo actual
  - PnL realizado
  - PnL no realizado
- snapshots diarios alimentados por esa reconstrucción

## Para los agentes y Telegram

La secuencia ideal del agente diario sería:

1. leer activos del usuario
2. actualizar `precio_actual` y `ultima_actualizacion`
3. calcular posiciones reconciliadas
4. guardar `snapshots_cartera`
5. guardar `snapshot_activos`
6. enviar resumen a Telegram

## Lo que haría yo contigo ahora mismo

### Paso 1
Ejecutar las queries de auditoría.

### Paso 2
Crear una vista reconciliada para posiciones actuales.

### Paso 3
Cambiar la app para leer posiciones desde esa vista.

### Paso 4
Después, preparar el job/agente diario para snapshots y Telegram.

## Qué necesito de ti para seguir

Lo ideal ahora es que me pases uno de estos dos bloques:

### Opción A
Resultado de estas queries de auditoría.

### Opción B
Permiso para prepararte directamente un archivo SQL de migración con:
- vista `posiciones_actuales`
- queries de validación
- notas para adaptar la app

La opción más práctica es B.
