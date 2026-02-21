type Variant = 'brand' | 'green' | 'amber' | 'red' | 'gray';

const classes: Record<Variant, string> = {
  brand: 'bg-brand-500/20 text-brand-300',
  green: 'bg-emerald-500/20 text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-300',
  red: 'bg-red-500/20 text-red-300',
  gray: 'bg-gray-500/20 text-gray-400',
};

export default function Badge({ children, variant = 'brand' }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes[variant]}`}>
      {children}
    </span>
  );
}
