import type { Purchase } from '@/types/portfolio';
import { getInstrumentMeta } from '@/lib/portfolioMetadata';

export interface ModelParams {
  rfRate: number;
  mktReturn: number;
  inflation: number;
  targetReturn: number;
  monthlyDCA: number;
  horizon: number;
  taxRate: number;
  maxDropTol: number;
  conservative: number;
  base: number;
  optimistic: number;
  betas: Record<string, number>;
}

export const DEFAULT_PARAMS: ModelParams = {
  rfRate: 0.02,
  mktReturn: 0.09,
  inflation: 0.025,
  targetReturn: 0.08,
  monthlyDCA: 200,
  horizon: 20,
  taxRate: 0.19,
  maxDropTol: 0.25,
  conservative: 0.04,
  base: 0.08,
  optimistic: 0.12,
  betas: {},
};

const DEFAULT_BETAS: Record<string, number> = {
  IS3Q: 0.95,
  IUSN: 1.15,
  IS3R: 1.05,
  IS3N: 1.1,
  VVSM: 1.35,
  GOAI: 1.3,
  URNU: 1.25,
  IB1T: 1.8,
  XDWH: 0.85,
  XDW0: 1.1,
  XDWS: 0.75,
  CBUX: 0.8,
  XDWF: 1.0,
  GLDA: 0.1,
  SXRA: 0.65,
};

export const getBeta = (ticker: string, params: ModelParams): number => {
  if (params.betas[ticker] !== undefined) return params.betas[ticker];
  return DEFAULT_BETAS[ticker] ?? 1;
};

export const capmReturn = (ticker: string, params: ModelParams): number => {
  return params.rfRate + getBeta(ticker, params) * (params.mktReturn - params.rfRate);
};

export const fmt = (n: number, decimals = 2) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtPct = (n: number, decimals = 2) =>
  `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;

export const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const clc = (v: number) => (v > 0 ? 'text-emerald' : v < 0 ? 'text-ruby' : 'text-muted-foreground');

export interface Holding {
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  totalCost: number;
  avgPrice: number;
  totalCommissions: number;
  nOps: number;
  nBuys: number;
  nSells: number;
  totalBought: number;
  totalSold: number;
  soldQuantity: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  currentWeight: number;
  targetWeight: number;
}

export function aggregateHoldings(purchases: Purchase[]): Holding[] {
  const map: Record<string, Holding> = {};

  purchases.forEach(p => {
    if (p.operation === 'Liquidez') return;

    const meta = getInstrumentMeta(p.ticker);
    if (!map[p.ticker]) {
      map[p.ticker] = {
        ticker: p.ticker,
        name: meta.name,
        type: p.type,
        quantity: 0,
        totalCost: 0,
        avgPrice: 0,
        totalCommissions: 0,
        nOps: 0,
        nBuys: 0,
        nSells: 0,
        totalBought: 0,
        totalSold: 0,
        soldQuantity: 0,
        currentPrice: 0,
        currentValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        totalPnl: 0,
        currentWeight: 0,
        targetWeight: meta.targetPct / 100,
      };
    }

    const h = map[p.ticker];
    h.type = p.type;
    h.nOps += 1;
    h.totalCommissions += p.commission;

    if (p.operation === 'Compra') {
      h.quantity += p.quantity;
      h.totalCost += p.quantity * p.price;
      h.totalBought += p.quantity * p.price;
      h.nBuys += 1;
      if (p.currentPrice && p.currentPrice > 0) h.currentPrice = p.currentPrice;
    } else if (p.operation === 'Venta') {
      const avgCostBeforeSale = h.quantity > 0 ? h.totalCost / h.quantity : h.avgPrice;
      const costRemoved = avgCostBeforeSale * p.quantity;
      h.quantity = Math.max(0, h.quantity - p.quantity);
      h.totalCost = Math.max(0, h.totalCost - costRemoved);
      h.totalSold += p.quantity * p.price;
      h.soldQuantity += p.quantity;
      h.realizedPnl += (p.quantity * p.price) - costRemoved - p.commission;
      h.nSells += 1;
      if (p.currentPrice && p.currentPrice > 0) h.currentPrice = p.currentPrice;
    }

    h.avgPrice = h.quantity > 0 ? h.totalCost / h.quantity : 0;
  });

  const holdings = Object.values(map);
  holdings.forEach(h => {
    if (!(h.currentPrice > 0)) h.currentPrice = h.avgPrice;
    h.currentValue = h.quantity * h.currentPrice;
    h.unrealizedPnl = h.currentValue - h.totalCost;
    h.totalPnl = h.unrealizedPnl + h.realizedPnl - h.totalCommissions;
    h.name = getInstrumentMeta(h.ticker).name;
    h.targetWeight = getInstrumentMeta(h.ticker).targetPct / 100;
  });

  const totalCurrent = holdings.reduce((sum, h) => sum + Math.max(0, h.currentValue), 0);

  holdings.forEach(h => {
    h.currentWeight = totalCurrent > 0 ? h.currentValue / totalCurrent : 0;
  });

  return holdings;
}

export function portfolioBeta(holdings: Holding[], params: ModelParams): number {
  const total = holdings.reduce((s, h) => s + Math.max(0, h.currentValue), 0);
  if (total === 0) return 1;
  return holdings.reduce((s, h) => s + (h.currentValue / total) * getBeta(h.ticker, params), 0);
}

export function portfolioVolatility(holdings: Holding[], params: ModelParams): number {
  const total = holdings.reduce((s, h) => s + Math.max(0, h.currentValue), 0);
  if (total === 0) return 0;
  return holdings.reduce((s, h) => s + (h.currentValue / total) * getBeta(h.ticker, params) * 0.17, 0);
}

export function portfolioCAPM(holdings: Holding[], params: ModelParams): number {
  return params.rfRate + portfolioBeta(holdings, params) * (params.mktReturn - params.rfRate);
}

export function projectValue(startCap: number, monthlyDCA: number, rate: number, years: number): number {
  let v = startCap;
  for (let i = 0; i < years; i += 1) v = v * (1 + rate) + monthlyDCA * 12;
  return v;
}
