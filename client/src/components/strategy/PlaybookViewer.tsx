import type { PlaybookStep } from '../../api/client';
import Badge from '../shared/Badge';

export default function PlaybookViewer({ steps, strategyName, onClose }: { steps: PlaybookStep[]; strategyName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-2 rounded-xl border border-surface-4 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Playbook</h2>
            <p className="text-xs text-gray-500">{strategyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {steps.map(step => (
            <div key={step.step} className="relative pl-8">
              <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-300">
                {step.step}
              </div>
              {step.step < steps.length && (
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-surface-4" />
              )}
              <div className="bg-surface-3 rounded-lg p-3">
                <p className="text-sm text-gray-200">{step.action}</p>
                {step.condition && step.condition !== 'always' && (
                  <p className="text-[11px] text-gray-500 mt-1">When: {step.condition}</p>
                )}
                {step.skip_if && (
                  <p className="text-[11px] text-amber-500/70 mt-1">Skip if: {step.skip_if}</p>
                )}
                {step.recovery && (
                  <p className="text-[11px] text-red-400/70 mt-1">Recovery: {step.recovery}</p>
                )}
                {step.branches && step.branches.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {step.branches.map((br, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <Badge variant="amber">if</Badge>
                        <span className="text-gray-400">{br.condition} → {br.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
