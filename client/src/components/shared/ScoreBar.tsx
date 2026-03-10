export default function ScoreBar({ value, max = 1, label, color = 'brand' }: { value: number; max?: number; label?: string; color?: string }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const colorMap: Record<string, string> = {
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[color] || colorMap.brand}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{value.toFixed(2)}</span>
    </div>
  );
}
