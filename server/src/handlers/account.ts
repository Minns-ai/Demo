import { findCustomer } from '../data/customers.js';
import type { ParsedSidecarIntent } from 'minns-sdk';
import type { HandlerResult } from './order-tracking.js';

export function handleAccount(intent: ParsedSidecarIntent, customerId: string): HandlerResult {
  const customer = findCustomer(customerId);

  switch (intent.intent) {
    case 'account_info': {
      if (!customer) return { response: 'I couldn\'t find your account. Could you verify your customer ID?' };
      return {
        response: `**Account Details**\nName: ${customer.name}\nEmail: ${customer.email}\nTier: ${customer.tier.toUpperCase()}\nMember since: ${customer.joinedAt}\nTotal spent: $${customer.totalSpent.toFixed(2)}\nPreferred contact: ${customer.preferredContact}`,
        data: customer,
        observationType: 'account_lookup',
      };
    }
    case 'update_profile': {
      const field = intent.slots.field;
      const value = intent.slots.value;
      return {
        response: `I've updated your ${field} to "${value}". The change will be reflected in your account shortly.`,
        data: { field, value, customerId },
        observationType: 'profile_updated',
      };
    }
    case 'reset_password': {
      return {
        response: customer
          ? `A password reset link has been sent to ${customer.email}. Please check your inbox.`
          : 'I\'ll need to verify your identity first. Could you provide your email address?',
        data: { customerId, emailSent: !!customer },
        observationType: 'password_reset',
      };
    }
    default:
      return { response: 'I can help with account information, profile updates, and password resets. What do you need?' };
  }
}
