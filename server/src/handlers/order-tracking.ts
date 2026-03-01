import { findOrder, getCustomerOrders } from '../data/orders.js';
import type { ParsedSidecarIntent } from 'minns-sdk';

export interface HandlerResult {
  response: string;
  /** Structured data returned by the action — present when lookup succeeded */
  data?: unknown;
  observationType?: string;
  /** Explicit success/failure signal for MINNS outcome tracking.
   *  true  = action resolved what it was asked for
   *  false = action failed (not found, invalid input, error)
   *  undefined = ambiguous / informational (e.g. "which order?") */
  success?: boolean;
}

export function handleOrderTracking(intent: ParsedSidecarIntent, customerId: string): HandlerResult {
  const orderId = intent.slots.order_id != null ? String(intent.slots.order_id) : undefined;

  switch (intent.intent) {
    case 'track_order':
    case 'order_status': {
      if (!orderId) {
        const orders = getCustomerOrders(customerId);
        return {
          response: `I found ${orders.length} order(s) on your account. Could you tell me which order number you'd like to track?`,
          data: orders.map(o => ({ id: o.id, status: o.status, total: o.total })),
          observationType: 'order_list_lookup',
          // Not a failure, but not fully resolved — need the user to pick an order
        };
      }
      const order = findOrder(orderId);
      if (!order) return { response: `I couldn't find order ${orderId}. Could you double-check the order number?`, success: false };
      const statusInfo = order.trackingNumber
        ? `Status: **${order.status}** | Tracking: ${order.trackingNumber} | ETA: ${order.estimatedDelivery || 'N/A'}`
        : `Status: **${order.status}**${order.estimatedDelivery ? ` | ETA: ${order.estimatedDelivery}` : ''}`;
      return {
        response: `Here's the status for **${orderId}**:\n${statusInfo}\nItems: ${order.items.map(i => i.name).join(', ')}`,
        data: order,
        observationType: 'order_lookup',
        success: true,
      };
    }
    case 'delivery_estimate': {
      if (!orderId) return { response: 'Could you share your order number so I can check the delivery estimate?' };
      const order = findOrder(orderId);
      if (!order) return { response: `Order ${orderId} not found. Please verify the order number.`, success: false };
      return {
        response: order.estimatedDelivery
          ? `Your order **${orderId}** is estimated to arrive by **${order.estimatedDelivery}**.`
          : `Order **${orderId}** is currently **${order.status}**. I don't have a delivery estimate yet.`,
        data: { orderId, estimatedDelivery: order.estimatedDelivery, status: order.status },
        observationType: 'delivery_estimate_lookup',
        success: true,
      };
    }
    default:
      return { response: 'How can I help you with your order today? I can track orders, check statuses, and provide delivery estimates.' };
  }
}
