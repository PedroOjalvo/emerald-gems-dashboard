import { useState } from 'react';
import { Wifi, WifiOff, Send, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ping, sendTelegramMessage, syncData } from '@/lib/openclawService';

type Status = 'idle' | 'loading' | 'success' | 'error';

const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground';

const OpenClawPanel = () => {
  const [serverStatus, setServerStatus] = useState<Status>('idle');
  const [syncStatus, setSyncStatus] = useState<Status>('idle');
  const [telegramStatus, setTelegramStatus] = useState<Status>('idle');
  const [serverUrl, setServerUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [telegramMsg, setTelegramMsg] = useState('');
  const [lastResult, setLastResult] = useState<string>('');

  const hasServerUrl = serverUrl.trim().length > 0;
  const hasAuthToken = authToken.trim().length > 0;
  const canRunProtectedActions = hasServerUrl && hasAuthToken;
  const canSendTelegram = canRunProtectedActions && telegramId.trim().length > 0 && telegramMsg.trim().length > 0;

  const handlePing = async () => {
    setServerStatus('loading');
    const res = await ping(serverUrl);
    setServerStatus(res.ok ? 'success' : 'error');
    setLastResult(JSON.stringify(res.data, null, 2));
  };

  const handleSync = async () => {
    setSyncStatus('loading');
    const res = await syncData(serverUrl, authToken);
    setSyncStatus(res.ok ? 'success' : 'error');
    setLastResult(JSON.stringify(res.data, null, 2));
  };

  const handleTelegram = async () => {
    setTelegramStatus('loading');
    const res = await sendTelegramMessage(serverUrl, telegramId, telegramMsg, authToken);
    setTelegramStatus(res.ok ? 'success' : 'error');
    setLastResult(JSON.stringify(res.data, null, 2));
  };

  const StatusIcon = ({ status }: { status: Status }) => {
    if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          {serverStatus === 'success' ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
          OpenClaw Server
        </h3>

        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="https://tu-servidor.up.railway.app"
            className={inputCls}
          />
          <input
            type="password"
            value={authToken}
            onChange={e => setAuthToken(e.target.value)}
            placeholder="Auth Token"
            className={inputCls}
          />
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          La URL, el token y el chat ID solo se usan en esta sesión y no se guardan en el frontend.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handlePing}
            disabled={!hasServerUrl}
            className="bg-primary disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <StatusIcon status={serverStatus} />
            Ping
          </button>
          <button
            onClick={handleSync}
            disabled={!canRunProtectedActions}
            className="bg-secondary disabled:opacity-50 text-secondary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <StatusIcon status={syncStatus} />
            <RefreshCw className="h-4 w-4" /> Sync
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" /> Telegram
        </h3>
        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={telegramId}
            onChange={e => setTelegramId(e.target.value)}
            placeholder="Telegram Chat ID"
            className={inputCls}
          />
          <input
            type="text"
            value={telegramMsg}
            onChange={e => setTelegramMsg(e.target.value)}
            placeholder="Mensaje de prueba"
            className={inputCls}
          />
        </div>
        <button
          onClick={handleTelegram}
          disabled={!canSendTelegram}
          className="bg-primary disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
        >
          <StatusIcon status={telegramStatus} />
          <Send className="h-4 w-4" /> Enviar Mensaje
        </button>
      </div>

      {lastResult && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Última Respuesta</h3>
          <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
            {lastResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default OpenClawPanel;
