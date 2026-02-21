import type { ParsedSidecarIntent } from 'minns-sdk';
import type { HandlerResult } from './order-tracking.js';

let complaintCounter = 5000;

export function handleComplaints(intent: ParsedSidecarIntent): HandlerResult {
  switch (intent.intent) {
    case 'file_complaint': {
      const subject = intent.slots.subject || 'general complaint';
      const orderId = intent.slots.order_id;
      complaintCounter++;
      const complaintId = `CMP-${complaintCounter}`;
      return {
        response: `I'm sorry to hear about your experience. I've filed complaint **${complaintId}** regarding: "${subject}"${orderId ? ` (related to order ${orderId})` : ''}. Our team will review this within 24 hours and follow up with you.`,
        data: { complaintId, subject, orderId },
        observationType: 'complaint_filed',
      };
    }
    case 'escalate': {
      const complaintId = intent.slots.complaint_id;
      return {
        response: complaintId
          ? `Complaint **${complaintId}** has been escalated to a senior support specialist. You'll receive a call within 2 hours.`
          : `I can escalate your issue to a senior specialist. Could you provide the complaint ID, or would you like me to create a new one?`,
        data: { complaintId, escalated: true },
        observationType: 'complaint_escalated',
      };
    }
    case 'feedback': {
      const rating = intent.slots.rating;
      const comment = intent.slots.comment;
      return {
        response: `Thank you for your feedback!${rating ? ` Rating: ${rating}/5.` : ''}${comment ? ` "${comment}"` : ''} We value your input and use it to improve our service.`,
        data: { rating, comment },
        observationType: 'feedback_received',
      };
    }
    default:
      return { response: 'I\'m here to help with any concerns. Would you like to file a complaint, provide feedback, or escalate an existing issue?' };
  }
}
