import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

interface Props {
  goalDesc: string | null;
  goalProgress: number;
  handlerResult: { response: string; data?: unknown; observationType?: string } | null;
  claimsHint?: { text: string; type?: string; confidence?: number }[];
}

export default function ContextPanel({ goalDesc, goalProgress, handlerResult, claimsHint }: Props) {
  return (
    <div className="w-72 border-l border-surface-4 bg-surface-1 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-surface-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer Context</h3>
      </div>

      {/* Customer Profile */}
      <div className="p-3 border-b border-surface-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-sm font-bold text-brand-300">A</div>
          <div>
            <div className="text-sm font-medium">Alice Chen</div>
            <div className="text-[10px] text-gray-500">CUST-100 | Premium</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-surface-2 rounded p-1.5 text-center">
            <div className="text-gray-500">Spent</div>
            <div className="text-gray-200 font-medium">$1,289</div>
          </div>
          <div className="bg-surface-2 rounded p-1.5 text-center">
            <div className="text-gray-500">Orders</div>
            <div className="text-gray-200 font-medium">3 active</div>
          </div>
        </div>
      </div>

      {/* Active Goal */}
      {goalDesc && (
        <div className="p-3 border-b border-surface-4">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Active Goal</div>
          <div className="bg-surface-2 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-200">{goalDesc}</span>
              <Badge variant="brand">{(goalProgress * 100).toFixed(0)}%</Badge>
            </div>
            <ScoreBar value={goalProgress} color="brand" />
          </div>
        </div>
      )}

      {/* Handler Result */}
      {handlerResult && (
        <div className="p-3 border-b border-surface-4">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Handler Result</div>
          {handlerResult.observationType && (
            <Badge variant="green">{handlerResult.observationType}</Badge>
          )}
          {handlerResult.data != null && (
            <pre className="mt-2 p-2 bg-surface-2 rounded text-[10px] text-gray-400 overflow-auto max-h-32">
              {JSON.stringify(handlerResult.data, null, 2) as string}
            </pre>
          )}
        </div>
      )}

      {/* Claims Hints */}
      {claimsHint && claimsHint.length > 0 && (
        <div className="p-3 border-b border-surface-4">
          <div className="text-[11px] font-medium text-gray-400 mb-2">Extracted Claims</div>
          {claimsHint.map((c, i) => (
            <div key={i} className="bg-surface-2 rounded p-2 mb-1.5">
              <p className="text-xs text-gray-300">{c.text}</p>
              <div className="flex gap-2 mt-1">
                {c.type && <Badge variant="amber">{c.type}</Badge>}
                {c.confidence != null && <span className="text-[10px] text-gray-500">{(c.confidence * 100).toFixed(0)}% conf</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Orders quick view */}
      <div className="p-3">
        <div className="text-[11px] font-medium text-gray-400 mb-2">Recent Orders</div>
        {[
          { id: 'ORD-1001', status: 'shipped', total: '$249.99' },
          { id: 'ORD-1002', status: 'delivered', total: '$239.97' },
          { id: 'ORD-1005', status: 'pending', total: '$129.99' },
        ].map(o => (
          <div key={o.id} className="flex items-center justify-between py-1.5 text-xs">
            <span className="text-gray-300">{o.id}</span>
            <Badge variant={o.status === 'delivered' ? 'green' : o.status === 'shipped' ? 'brand' : 'amber'}>{o.status}</Badge>
            <span className="text-gray-400">{o.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
