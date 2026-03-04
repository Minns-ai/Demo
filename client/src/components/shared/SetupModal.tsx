import { useState, useEffect, useCallback } from 'react';
import { getConfigStatus, getHealth } from '../../api/client';

interface Props {
  onHealthy: () => void;
}

export default function SetupModal({ onHealthy }: Props) {
  const [minnsOk, setMinnsOk] = useState<boolean | null>(null);
  const [openaiOk, setOpenaiOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusText, setStatusText] = useState('');

  const checkConfig = useCallback(async () => {
    try {
      const cfg = await getConfigStatus();
      setMinnsOk(cfg.minns_configured);
      setOpenaiOk(cfg.openai_configured);
    } catch {
      setMinnsOk(false);
      setOpenaiOk(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      if (h.is_healthy) {
        setStatusText('Connected!');
        onHealthy();
      } else {
        setStatusText('Not healthy yet — check your keys and restart the server.');
      }
    } catch {
      setStatusText('Server unreachable — make sure npm run dev is running.');
    }
  }, [onHealthy]);

  // Initial config fetch
  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  // Auto-poll health every 5s
  useEffect(() => {
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  async function handleManualCheck() {
    setChecking(true);
    setStatusText('Checking...');
    await checkConfig();
    await checkHealth();
    setChecking(false);
  }

  function StatusIcon({ ok }: { ok: boolean | null }) {
    if (ok === null) return <div className="w-4 h-4 rounded-full bg-surface-4 animate-pulse" />;
    if (ok) return (
      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
    return (
      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-2 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-fade-in-up border border-surface-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-brand-500/30">
            M
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Setup Required</h2>
            <p className="text-xs text-gray-400">Configure your API keys to get started</p>
          </div>
        </div>

        {/* Key status rows */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 bg-surface-3 rounded-xl p-3">
            <StatusIcon ok={minnsOk} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200">MINNS API Key</div>
              <div className="text-xs text-gray-500">Powers memory, strategies, claims, and graph</div>
            </div>
            <a href="https://minns.ai" target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-400 hover:text-brand-300 font-medium shrink-0">
              Get key &rarr;
            </a>
          </div>

          <div className="flex items-center gap-3 bg-surface-3 rounded-xl p-3">
            <StatusIcon ok={openaiOk} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200">OpenAI API Key</div>
              <div className="text-xs text-gray-500">Powers the ReAct agent reasoning (gpt-4o-mini)</div>
            </div>
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-400 hover:text-brand-300 font-medium shrink-0">
              Get key &rarr;
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-5">
          <div className="text-xs text-gray-400 font-medium mb-2">Create or edit <code className="text-brand-300">.env</code> in the project root:</div>
          <pre className="bg-surface-0 rounded-lg p-3 text-xs text-gray-300 font-mono leading-relaxed overflow-x-auto border border-surface-4">
{`MINNS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PORT=3001
AGENT_ID=1001
SESSION_ID=1`}
          </pre>
          <p className="text-[11px] text-gray-500 mt-2">After editing, restart with <code className="text-brand-300">npm run dev</code></p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {checking ? 'Checking...' : 'Check Connection'}
          </button>
          {statusText && (
            <span className="text-xs text-gray-400">{statusText}</span>
          )}
        </div>
      </div>
    </div>
  );
}
