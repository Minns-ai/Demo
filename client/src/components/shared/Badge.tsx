type Variant = 'brand' | 'green' | 'amber' | 'red' | 'gray';

const classes: Record<Variant, string> = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-100 text-gray-500',
};

export default function Badge({ children, variant = 'brand' }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes[variant]}`}>
      {children}
    </span>
  );
}
