import type { MemoryItem, ClaimItem } from '../../api/client';

type Props =
  | { type: 'memory'; item: MemoryItem; onClose: () => void }
  | { type: 'claim'; item: ClaimItem; onClose: () => void };

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  Episodic:  { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  Semantic:  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  Schema:    { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200' },
};

function StrengthBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-500 font-medium tabular-nums">{pct}%</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-700 leading-relaxed">{children}</dd>
    </div>
  );
}

export default function KnowledgeModal(props: Props) {
  const { onClose } = props;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 relative animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {props.type === 'memory' ? (
          <MemoryView item={props.item} />
        ) : (
          <ClaimView item={props.item} />
        )}
      </div>
    </div>
  );
}

function MemoryView({ item }: { item: MemoryItem }) {
  const tier = tierColors[item.tier] ?? tierColors.Episodic;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tier.bg} ${tier.text} ${tier.border}`}>
          {item.tier}
        </span>
        <span className="text-[10px] text-gray-400">Memory</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-800 font-medium leading-relaxed">{item.summary}</p>

      {/* Fields */}
      <dl className="space-y-3">
        {item.takeaway && <Field label="Takeaway">{item.takeaway}</Field>}
        {item.causal_note && <Field label="Causal Note">{item.causal_note}</Field>}
        {item.outcome && <Field label="Outcome">{item.outcome}</Field>}
        <Field label="Strength">
          <StrengthBar value={item.strength} />
        </Field>
        {item.relevance_score != null && (
          <Field label="Relevance">
            <StrengthBar value={item.relevance_score} />
          </Field>
        )}
      </dl>
    </div>
  );
}

function ClaimView({ item }: { item: ClaimItem }) {
  const text = item.claim_text ?? item.text ?? '(no text)';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
          Claim
        </span>
      </div>

      {/* Text */}
      <p className="text-sm text-gray-800 leading-relaxed">{text}</p>

      {/* Confidence */}
      {item.confidence != null && (
        <dl>
          <Field label="Confidence">
            <StrengthBar value={item.confidence} />
          </Field>
        </dl>
      )}
    </div>
  );
}
