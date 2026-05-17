# Daily agent + categorías + frontend plan

## 1. Fórmula confirmada de DCA dinámico

Regla funcional:
- si la diferencia del activo es 0 o positiva, solo recomienda el DCA base
- si el activo cae, incrementa el aporte según la caída

Fórmula confirmada por el usuario:

```text
APORTE_RECOMENDADO = DCA + (DCA * (1 - (1 + ((VALOR_ACTUAL - VALOR_ANTERIOR) / VALOR_ANTERIOR))^10))
```

### Interpretación
Sea:
- `DCA` = aporte base mensual
- `valor_actual` = valor actual del activo o posición
- `valor_anterior` = valor del activo o posición en el snapshot anterior
- `variacion = (valor_actual - valor_anterior) / valor_anterior`

Entonces:

```text
si variacion >= 0:
  aporte_recomendado = DCA
si variacion < 0:
  aporte_recomendado = DCA + (DCA * (1 - (1 + variacion)^10))
```

### Observaciones
- con caída leve, suma poco
- con caída fuerte, acelera bastante la aportación
- conviene capar el extra máximo para evitar sobre-reaccionar en caídas extremas

### Recomendación técnica
Añadir protección:
- si `valor_anterior <= 0`, usar `DCA`
- redondear a 2 decimales
- opcionalmente limitar el multiplicador máximo, por ejemplo `aporte_recomendado <= DCA * 3`

## 2. Diseño del agente diario

## Objetivo
Cada día el agente debe:
1. actualizar precios en `activos`
2. recalcular estado actual reconciliado
3. comparar con snapshot anterior
4. calcular caída de cartera y de cada activo
5. calcular DCA dinámico recomendado
6. guardar snapshot nuevo
7. enviar resumen diario a Telegram

## Entradas necesarias

### Supabase
- `activos`
- `posiciones_actuales`
- `resumen_cartera_actual`
- `snapshots_cartera`
- `snapshot_activos`

### Configuración recomendada
Tabla sugerida: `config_cartera_usuario`

Campos sugeridos:
- `user_id uuid primary key`
- `dca_base numeric not null default 200`
- `telegram_chat_id text`
- `report_enabled boolean default true`
- `report_time_utc time`
- `max_dca_multiplier numeric default 3`
- `price_source text default 'manual_or_agent'`
- `last_report_at timestamptz`

## Flujo exacto

### Paso 1. Leer activos vivos
Para cada activo distinto de `LIQUIDEZ`:
- ticker
- nombre
- tipo_activo
- precio_actual actual
- ultima_actualizacion

### Paso 2. Obtener cotizaciones
Actualizar:
- `precio_actual`
- `ultima_actualizacion`
- opcional `fuente_precio`

### Paso 3. Leer cartera reconciliada
Consultar:
- `posiciones_actuales`
- `resumen_cartera_actual`

### Paso 4. Leer snapshot anterior
- último registro de `snapshots_cartera`
- y sus `snapshot_activos`

### Paso 5. Calcular diferencias
#### A nivel cartera
- cambio diario en euros
- cambio diario en porcentaje
- caída desde máximo reciente, si más adelante guardamos rolling high

#### A nivel activo
Por cada ticker:
- `delta_valor = valor_actual - valor_anterior`
- `delta_pct = (valor_actual - valor_anterior) / valor_anterior`
- si `delta_pct < 0`, aplicar fórmula de DCA dinámico

### Paso 6. Calcular recomendación
Hay dos enfoques posibles.

#### Opción A. DCA dinámico por activo
Cada activo calcula su aporte recomendado con su propia caída.
Luego se redistribuye o se reporta como ranking.

#### Opción B. DCA dinámico cartera + reparto por rebalanceo
1. calcular caída total de cartera respecto al snapshot anterior
2. elevar DCA global con la fórmula
3. repartir el DCA total por rebalanceo / infraponderación

### Recomendación
Usaría una combinación:
- **DCA global** derivado de la caída total de cartera
- **prioridad por activo** derivada de:
  - infraponderación
  - caída individual

Así el mensaje diario puede decir:
- DCA base: 200 €
- DCA recomendado hoy: 264 €
- Prioridad de compra: VSMC, IWQU, EIMI

## 3. Contenido del mensaje diario de Telegram

Formato sugerido:

```text
📊 Report diario de cartera

Valor total: 5.701,07 €
Liquidez: 999,00 €
P&L total: +197,67 €
Rentabilidad total: +4,44%

Caída diaria cartera: -1,82% (-105,40 €)

Mayores caídas:
- VSMC: -3,10%
- IB1T: -2,85%
- XDWE: -1,20%

Mayores subidas:
- GLDA: +1,45%
- EIMI: +0,92%

DCA base: 200 €
DCA recomendado hoy: 268 €

Recomendación de inversión:
- VSMC: 96 €
- EIMI: 64 €
- IWQU: 58 €
- WSML: 50 €

Alertas:
- 0 activos sin precio
- 1 activo con precio desactualizado >24h
```

## 4. Categorías nuevas recomendadas

## Problema actual
Se está mezclando:
- tipo de vehículo (`ETF`, `Crypto`, `Metal`, `REIT`)
- con estilo/subgrupo (`ETF RV Factor`, `ETF RV Sectorial`, etc.)

Eso confunde tablas y gráficos.

## Modelo recomendado

### Nivel 1. tipo_base
- ETF
- Fondo
- Acción
- Bono
- Crypto
- Materia prima
- Liquidez

### Nivel 2. subcategoria
- RV Factor
- Emergentes
- Sectorial
- Temático
- Infraestructura
- REIT
- Oro
- Bitcoin
- Monetario

### Nivel 3. tema
- Semiconductores
- Health Care
- Energy
- Financials
- AI
- Uranio

## Aplicación práctica
Por ejemplo:
- VSMC
  - tipo_base: ETF
  - subcategoria: Sectorial
  - tema: Semiconductores
- DPYA
  - tipo_base: ETF
  - subcategoria: REIT
  - tema: Real Estate
- GLDA
  - tipo_base: Materia prima
  - subcategoria: Oro
  - tema: Oro físico
- IB1T
  - tipo_base: Crypto
  - subcategoria: Bitcoin
  - tema: Bitcoin ETP

## Recomendación de datos
Añadir en metadata o tabla:
- `tipo_base`
- `subcategoria`
- `tema`

## 5. Problema actual del frontend

## Síntoma reportado
- las tablas y gráficos no visualizan el total correcto del activo
- los porcentajes de cartera salen descuadrados
- el rebalanceo se ve mal
- ejemplo: semiconductores

## Causa probable
La app aún calcula holdings en frontend a partir de `movimientos` usando `aggregateHoldings(purchases)`.

Eso hoy es insuficiente porque:
- el sistema reconciliado ya existe en Supabase
- snapshots y precios vivos ya viven fuera del frontend
- seguir recalculando en cliente puede desalinear cantidades, valores y pesos

## Solución recomendada

### Para tablas y gráficos principales
Leer directamente de:
- `public.posiciones_actuales`

### Para evolución temporal
Leer de:
- `public.snapshots_cartera`
- `public.snapshot_activos`

### Para historial operativo
Seguir usando:
- `movimientos`

## 6. Refactor recomendado en frontend

## Nuevo reparto de fuentes

### `movimientos`
Usar en:
- pestaña Rendimiento histórico de operaciones
- tabla de compras/ventas
- actividad por mes / año

### `posiciones_actuales`
Usar en:
- Resumen
- Activos
- Riesgo
- Análisis
- Decisión del mes
- pesos
- valor actual
- rebalanceo

### `snapshots_cartera` y `snapshot_activos`
Usar en:
- evolución temporal real
- rentabilidad temporal
- comparativa vs día anterior
- gráficos históricos

## 7. Próximo cambio técnico en app

### Hook nuevo sugerido
Crear un hook tipo:
- `usePortfolioSnapshotData()` o `usePortfolioState()`

Debe traer:
- movimientos
- posiciones actuales
- resumen actual
- últimos snapshots

## 8. Siguiente orden de trabajo recomendado

1. cambiar frontend para leer `posiciones_actuales`
2. corregir tablas/gráficos/pesos/rebalanceo
3. añadir lectura de snapshots para evolución real
4. crear job/agente diario
5. conectar Telegram

## 9. Lo que falta para el agente

### Necesitamos decidir
- fuente de precios
- hora del reporte diario
- chat_id de Telegram
- si el DCA dinámico se calcula por cartera o por activo, o híbrido

## Mi recomendación final

### Recomendación funcional
- DCA dinámico global por caída de cartera
- prioridad de reparto por activo según infraponderación + caída individual

Así no se sobrerreacciona a un único activo pequeño y el sistema sigue teniendo sentido de cartera.
