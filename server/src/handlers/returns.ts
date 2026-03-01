import { findOrder } from '../data/orders.js';
import type { ParsedSidecarIntent } from 'minns-sdk';
import type { HandlerResult } from './order-tracking.js';

export function handleReturns(intent: ParsedSidecarIntent, customerId: string): HandlerResult {
  const orderId = intent.slots.order_id != null ? String(intent.slots.order_id) : undefined;

  switch (intent.intent) {
    case 'initiate_return': {
      if (!orderId) return { response: 'I\'d be happy to help with a return. What\'s your order number?' };
      const order = findOrder(orderId);
      if (!order) return { response: `I couldn't find order ${orderId}. Could you check the order number?`, success: false };
      if (order.status === 'returned') return { response: `Order **${orderId}** has already been returned.`, success: false };
      const reason = intent.slots.reason != null ? String(intent.slots.reason) : 'not specified';
      return {
        response: `I've initiated a return for order **${orderId}** (${order.items.map(i => i.name).join(', ')}). Reason: ${reason}. You'll receive a prepaid return label via email within 24 hours. Once we receive the item, your refund of **$${order.total.toFixed(2)}** will be processed within 3-5 business days.`,
        data: { orderId, total: order.total, reason, items: order.items },
        observationType: 'return_initiated',
        success: true,
      };
    }
    case 'refund_status': {
      return {
        response: orderId
          ? `Refund for order **${orderId}** is being processed. Typical processing time is 3-5 business days after we receive the returned item.`
          : 'Could you share the order number you\'d like to check the refund status for?',
        observationType: 'refund_status_check',
        success: !!orderId,
      };
    }
    case 'exchange': {
      if (!orderId) return { response: 'For an exchange, I\'ll need your order number. What is it?' };
      const order = findOrder(orderId);
      if (!order) return { response: `Order ${orderId} not found.`, success: false };
      return {
        response: `I can arrange an exchange for order **${orderId}**. Would you like to exchange for a different size/color, or a completely different product?`,
        data: { orderId, currentItems: order.items },
        observationType: 'exchange_initiated',
        success: true,
      };
    }
    default:
      return { response: 'I can help with returns, refunds, and exchanges. What would you like to do?' };
  }
}
