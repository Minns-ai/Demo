import { useState } from 'react';
import { appendLedgerEntry, getLedgerBalance, useApiData } from '../../api/client';
import type { LedgerBalance } from '../../api/client';

interface LedgerData {
  entries: { amount: number; description: string; direction: string }[];
  balance: number;
  provenance: string;
}

export default function LedgerView({ memKey, data }: { memKey: string; data: LedgerData }) {
  const { data: balanceData, refetch } = useApiData<LedgerBalance>(() => getLedgerBalance(memKey), [memKey]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [direction, setDirection] = useState<'Credit' | 'Debit'>('Credit');
  const [submitting, setSubmitting] = useState(false);

  const handleAppend = async () => {
    if (!amount || !description) return;
    setSubmitting(true);
    try {
      await appendLedgerEntry(memKey, { amount: parseFloat(amount), description, direction });
      setAmount('');
      setDescription('');
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const entries = data.entries ?? [];
  const balance = balanceData?.balance ?? data.balance ?? 0;

  return (
    <div className="space-y-4">
      {/* Balance Header */}
      <div className="card flex items-center justify-between">
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wider">Balance</div>
          <div className="text-2xl font-bold text-gray-200">
            ${balance.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500">{data.provenance}</div>
          <div className="text-xs text-gray-400">{entries.length} entries</div>
        </div>
      </div>

      {/* Entries Table */}
      {entries.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Direction</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="py-2 px-3 text-gray-300">{e.description}</td>
                  <td className="py-2 px-3 text-right text-gray-500">{e.direction}</td>
                  <td className={`py-2 px-3 text-right font-mono ${e.direction === 'Credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {e.direction === 'Credit' ? '+' : '-'}{e.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Append Form */}
      <div className="card space-y-3">
        <div className="text-xs font-medium text-gray-400">Append Entry</div>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="flex-[2] bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <select
            value={direction}
            onChange={e => setDirection(e.target.value as 'Credit' | 'Debit')}
            className="bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
          >
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
          <button
            onClick={handleAppend}
            disabled={submitting || !amount || !description}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
          >
            {submitting ? '...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
