import { useState } from 'react';

interface SDKMethod {
  method: string;
  endpoint: string;
  description: string;
}

interface ResponseField {
  field: string;
  type: string;
  description: string;
}

interface LearnMoreBannerProps {
  title: string;
  description: string;
  sdkMethods: SDKMethod[];
  responseFields?: ResponseField[];
  light?: boolean;
}

export default function LearnMoreBanner({ title, description, sdkMethods, responseFields, light }: LearnMoreBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const bg = light ? 'bg-brand-500/5 border border-brand-200/30' : 'bg-brand-500/5 border border-brand-500/10';
  const titleColor = light ? 'text-gray-800' : 'text-gray-200';
  const descColor = light ? 'text-gray-600' : 'text-gray-400';
  const linkColor = 'text-brand-400 hover:text-brand-300';
  const labelColor = light ? 'text-gray-500' : 'text-gray-500';
  const cellBg = light ? 'bg-gray-50' : 'bg-surface-3';
  const cellText = light ? 'text-gray-700' : 'text-gray-300';
  const cellMuted = light ? 'text-gray-500' : 'text-gray-400';
  const codeBg = light ? 'bg-gray-100 text-gray-800' : 'bg-surface-4 text-brand-300';

  return (
    <div className={`rounded-xl p-4 mb-6 ${bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-sm font-medium ${titleColor}`}>{title}</span>
          </div>
          <p className={`text-xs mt-1 ${descColor}`}>
            {description}
            {!expanded && (
              <button onClick={() => setExpanded(true)} className={`ml-2 text-xs font-medium ${linkColor} transition-colors`}>
                Learn more
              </button>
            )}
          </p>
        </div>
        {expanded && (
          <button onClick={() => setExpanded(false)} className={`text-xs ${linkColor} shrink-0 ml-3 transition-colors`}>
            Collapse
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* SDK Methods */}
          <div>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${labelColor}`}>SDK Methods</div>
            <div className="space-y-2">
              {sdkMethods.map((m, i) => (
                <div key={i} className={`flex items-start gap-3 ${cellBg} rounded-lg p-2.5`}>
                  <code className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${codeBg}`}>{m.method}</code>
                  <div className="min-w-0">
                    <div className={`text-xs font-mono ${cellMuted}`}>{m.endpoint}</div>
                    <div className={`text-xs mt-0.5 ${cellText}`}>{m.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Fields */}
          {responseFields && responseFields.length > 0 && (
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${labelColor}`}>Key Response Fields</div>
              <div className={`rounded-lg overflow-hidden border ${light ? 'border-gray-200' : 'border-surface-4'}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={cellBg}>
                      <th className={`text-left px-3 py-2 font-medium ${cellMuted}`}>Field</th>
                      <th className={`text-left px-3 py-2 font-medium ${cellMuted}`}>Type</th>
                      <th className={`text-left px-3 py-2 font-medium ${cellMuted}`}>Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-4/50">
                    {responseFields.map((f, i) => (
                      <tr key={i}>
                        <td className={`px-3 py-1.5 font-mono ${cellText}`}>{f.field}</td>
                        <td className={`px-3 py-1.5 ${cellMuted}`}>{f.type}</td>
                        <td className={`px-3 py-1.5 ${cellText}`}>{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
