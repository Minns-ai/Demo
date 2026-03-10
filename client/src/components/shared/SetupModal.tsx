import { useState, useEffect, useCallback } from 'react';
import { getConfigStatus, getHealth, saveKeys } from '../../api/client';

interface Props {
  onHealthy: () => void;
}

export default function SetupModal({ onHealthy }: Props) {
  const [minnsOk, setMinnsOk] = useState<boolean | null>(null);
  const [openaiOk, setOpenaiOk] = useState<boolean | null>(null);
  const [anthropicOk, setAnthropicOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  // Key inputs
  const [minnsKey, setMinnsKey] = useState('');
  const [llmKey, setLlmKey] = useState('');

  const checkConfig = useCallback(async () => {
    try {
      const cfg = await getConfigStatus();
      setMinnsOk(cfg.minns_configured);
      setOpenaiOk(cfg.openai_configured);
      setAnthropicOk(cfg.anthropic_configured);
      return cfg;
    } catch {
      setMinnsOk(false);
      setOpenaiOk(false);
      setAnthropicOk(false);
      return null;
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      if (h.is_healthy) {
        setStatusText('Connected!');
        onHealthy();
      }
    } catch {
      // server not reachable — that's fine, keep polling
    }
  }, [onHealthy]);

  // Initial config fetch
  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  // Auto-poll: detects both UI-saved keys AND manually edited .env
  useEffect(() => {
    const interval = setInterval(async () => {
      const cfg = await checkConfig();
      if (cfg && cfg.minns_configured && cfg.has_llm) {
        await checkHealth();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [checkConfig, checkHealth]);

  const hasLlm = openaiOk || anthropicOk;
  const needsMinns = !minnsOk;
  const needsLlm = !hasLlm;

  function detectProvider(key: string): 'anthropic' | 'openai' | null {
    const k = key.trim();
    if (k.startsWith('sk-ant-')) return 'anthropic';
    if (k.startsWith('sk-')) return 'openai';
    return null;
  }

  const detectedProvider = detectProvider(llmKey);

  async function handleSave() {
    setError('');
    if (needsMinns && !minnsKey.trim()) {
      setError('MINNS API key is required');
      return;
    }
    if (needsLlm && !llmKey.trim()) {
      setError('Enter an OpenAI or Anthropic API key');
      return;
    }
    if (needsLlm && !detectedProvider) {
      setError('Could not detect provider — key should start with sk- (OpenAI) or sk-ant- (Anthropic)');
      return;
    }

    setSaving(true);
    setStatusText('Saving...');
    try {
      const result = await saveKeys({
        minns_api_key: needsMinns ? minnsKey.trim() : '',
        openai_api_key: detectedProvider === 'openai' ? llmKey.trim() : undefined,
        anthropic_api_key: detectedProvider === 'anthropic' ? llmKey.trim() : undefined,
        llm_provider: detectedProvider || 'openai',
      });

      setMinnsOk(result.minns_configured);
      setOpenaiOk(result.openai_configured);
      setAnthropicOk(result.anthropic_configured);
      setStatusText('Keys saved! Checking connection...');

      // Give MINNS a moment to initialize, then check health
      setTimeout(async () => {
        await checkHealth();
        setSaving(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save keys');
      setStatusText('');
      setSaving(false);
    }
  }

  async function handleManualCheck() {
    setChecking(true);
    setStatusText('Checking...');
    setError('');
    await checkConfig();
    await checkHealth();
    setStatusText(s => s === 'Checking...' ? 'Not connected yet' : s);
    setChecking(false);
  }

  function StatusIcon({ ok }: { ok: boolean | null }) {
    if (ok === null) return <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />;
    if (ok) return (
      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
    return (
      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  const allConfigured = minnsOk && (openaiOk || anthropicOk);

  const canSave = !saving && (
    (needsMinns ? !!minnsKey.trim() : true) &&
    (needsLlm ? !!llmKey.trim() && !!detectedProvider : true) &&
    (needsMinns || needsLlm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-brand-500/30">
            M
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Welcome to MINNS</h2>
            <p className="text-xs text-gray-400">Enter your API keys to get started</p>
          </div>
        </div>

        {/* Key input fields */}
        <div className="space-y-3 mb-5">
          {/* MINNS Key */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusIcon ok={minnsOk} />
              <label className="text-sm font-medium text-gray-700">MINNS API Key</label>
              {minnsOk && <span className="text-[10px] text-emerald-500 font-medium">Configured</span>}
              <a href="https://minns.ai" target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-500 hover:text-brand-600 font-medium ml-auto">
                Get key &rarr;
              </a>
            </div>
            {minnsOk ? (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-600 font-mono">
                ••••••••••••
              </div>
            ) : (
              <input
                type="password"
                value={minnsKey}
                onChange={e => setMinnsKey(e.target.value)}
                placeholder="eg_..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-mono"
                disabled={saving}
              />
            )}
          </div>

          {/* LLM Key — auto-detects OpenAI or Anthropic */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusIcon ok={hasLlm ? true : null} />
              <label className="text-sm font-medium text-gray-700">LLM API Key</label>
              {hasLlm && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  {openaiOk ? 'OpenAI' : 'Anthropic'} configured
                </span>
              )}
              {!hasLlm && detectedProvider && (
                <span className="text-[10px] text-brand-500 font-medium">
                  Detected: {detectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                </span>
              )}
              {!hasLlm && !detectedProvider && (
                <span className="text-[10px] text-gray-400">auto-detects provider</span>
              )}
            </div>
            {hasLlm ? (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-600 font-mono">
                ••••••••••••
              </div>
            ) : (
              <input
                type="password"
                value={llmKey}
                onChange={e => setLlmKey(e.target.value)}
                placeholder="sk-... or sk-ant-..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-mono"
                disabled={saving}
              />
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!allConfigured && (
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : 'Save & Connect'}
            </button>
          )}
          {allConfigured && (
            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {checking ? 'Checking...' : 'Check Connection'}
            </button>
          )}
          {statusText && (
            <span className={`text-xs ${statusText === 'Connected!' ? 'text-emerald-500 font-medium' : 'text-gray-400'}`}>
              {statusText}
            </span>
          )}
        </div>

        {/* Manual .env option */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-300 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            Edit <code className="text-brand-500 bg-brand-50 px-1 rounded">.env</code> in the project root manually — keys are auto-detected every 5s
          </p>
        </div>
      </div>
    </div>
  );
}
