import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_PARAMS, type ModelParams } from '@/lib/calculations';

interface ParamsCtx {
  params: ModelParams;
  setParams: (p: ModelParams) => void;
  resetParams: () => void;
}

const Ctx = createContext<ParamsCtx>({ params: DEFAULT_PARAMS, setParams: () => {}, resetParams: () => {} });

export const ParamsProvider = ({ children }: { children: ReactNode }) => {
  const [params, setParams] = useState<ModelParams>({ ...DEFAULT_PARAMS });
  const resetParams = () => setParams({ ...DEFAULT_PARAMS });
  return <Ctx.Provider value={{ params, setParams, resetParams }}>{children}</Ctx.Provider>;
};

export const useParams = () => useContext(Ctx);
