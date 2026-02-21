export interface Customer {
  id: string;
  name: string;
  email: string;
  tier: 'standard' | 'premium' | 'vip';
  joinedAt: string;
  totalSpent: number;
  preferredContact: 'email' | 'phone' | 'chat';
}

export const customers: Customer[] = [
  { id: 'CUST-100', name: 'Alice Chen', email: 'alice@example.com', tier: 'premium', joinedAt: '2024-03-15', totalSpent: 1289.50, preferredContact: 'chat' },
  { id: 'CUST-101', name: 'Bob Martinez', email: 'bob@example.com', tier: 'standard', joinedAt: '2025-06-01', totalSpent: 449.99, preferredContact: 'email' },
  { id: 'CUST-102', name: 'Carol Wang', email: 'carol@example.com', tier: 'vip', joinedAt: '2023-01-10', totalSpent: 4520.00, preferredContact: 'phone' },
];

export function findCustomer(customerId: string): Customer | undefined {
  return customers.find(c => c.id === customerId);
}
