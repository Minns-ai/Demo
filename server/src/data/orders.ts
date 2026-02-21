export interface Order {
  id: string;
  customerId: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned';
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  total: number;
}

export const orders: Order[] = [
  {
    id: 'ORD-1001', customerId: 'CUST-100',
    items: [{ productId: 'PROD-A1', name: 'Wireless Noise-Cancelling Headphones', qty: 1, price: 249.99 }],
    status: 'shipped', trackingNumber: 'TRK-88291', estimatedDelivery: '2026-02-20',
    createdAt: '2026-02-10', total: 249.99,
  },
  {
    id: 'ORD-1002', customerId: 'CUST-100',
    items: [
      { productId: 'PROD-B2', name: 'Ergonomic Keyboard', qty: 1, price: 159.99 },
      { productId: 'PROD-C3', name: 'USB-C Hub', qty: 2, price: 39.99 },
    ],
    status: 'delivered', createdAt: '2026-01-28', total: 239.97,
  },
  {
    id: 'ORD-1003', customerId: 'CUST-101',
    items: [{ productId: 'PROD-D4', name: '27" 4K Monitor', qty: 1, price: 449.99 }],
    status: 'processing', estimatedDelivery: '2026-02-25',
    createdAt: '2026-02-14', total: 449.99,
  },
  {
    id: 'ORD-1004', customerId: 'CUST-102',
    items: [{ productId: 'PROD-E5', name: 'Standing Desk Mat', qty: 1, price: 79.99 }],
    status: 'returned', createdAt: '2026-01-15', total: 79.99,
  },
  {
    id: 'ORD-1005', customerId: 'CUST-100',
    items: [{ productId: 'PROD-F6', name: 'Webcam Pro 4K', qty: 1, price: 129.99 }],
    status: 'pending', createdAt: '2026-02-16', total: 129.99,
  },
];

export function findOrder(orderId: string): Order | undefined {
  return orders.find(o => o.id === orderId);
}

export function getCustomerOrders(customerId: string): Order[] {
  return orders.filter(o => o.customerId === customerId);
}
