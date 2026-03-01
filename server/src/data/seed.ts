import { client } from '../minns/client.js';
import { config } from '../config.js';

const AGENT_TYPE = 'customer-service';

/**
 * Seed MINNS with demo claims and strategies on startup.
 * Sends context events (for claim extraction) and action+outcome events
 * (for strategy formation) through the real SDK pipeline.
 */
export async function seedDemoData(): Promise<void> {
  console.log('[seed] Seeding demo data into MINNS...');

  const bc = { agentId: config.agentId, sessionId: config.sessionId, enableSemantic: true };

  // ── Context events → these generate claims ────────────────────────
  const claimTexts = [
    'Alice Chen (CUST-100) is a premium-tier customer who prefers email communication and has spent $1,289.50 total.',
    'Alice Chen ordered Wireless Noise-Cancelling Headphones (ORD-1001), shipped with tracking number TRK-88291, estimated delivery February 20, 2026.',
    'Alice Chen placed an order for jeans with delivery requested for Wednesday, September 3, 2026.',
    'Bob Martinez (CUST-101) is a standard-tier customer. His order ORD-1003 experienced a late delivery and he filed complaint CMP-1001.',
    'Carol Wang (CUST-102) is a VIP customer with $4,520 total spend. She prefers phone support and has ordered multiple monitors.',
    'TechGear offers free returns within 30 days for all premium and VIP customers.',
    'The 27" 4K Monitor (PROD-D4) is the highest-rated product at 4.8 stars and costs $449.99.',
    'The Webcam Pro 4K (PROD-F6) is currently out of stock. Customers can sign up for restock notifications.',
    'Order ORD-1002 for Bob Martinez contains an Ergonomic Keyboard, status: delivered on February 10, 2026.',
    'Alice Chen mentioned she prefers vegetarian restaurants and is interested in travel accessories for upcoming trips.',
  ];

  for (const text of claimTexts) {
    try {
      await client.event(AGENT_TYPE, bc).context(text, 'fact').send();
    } catch {
      // Non-fatal — continue seeding
    }
  }

  // ── Action + Outcome events → these generate strategies ───────────
  const strategyScenarios = [
    {
      goal: 'Track customer order',
      action: 'track_order',
      params: { order_id: 'ORD-1001' },
      result: { status: 'shipped', tracking: 'TRK-88291' },
      success: true,
    },
    {
      goal: 'Handle product recommendation',
      action: 'recommend',
      params: { category: 'peripherals' },
      result: { products: ['Ergonomic Keyboard', 'Wireless Mouse', 'Webcam Pro 4K'] },
      success: true,
    },
    {
      goal: 'Process customer return',
      action: 'initiate_return',
      params: { order_id: 'ORD-1002', reason: 'Wrong size' },
      result: { return_id: 'RET-5001', label_sent: true },
      success: true,
    },
    {
      goal: 'Resolve customer complaint',
      action: 'file_complaint',
      params: { subject: 'Late delivery', order_id: 'ORD-1003' },
      result: { complaint_id: 'CMP-1001', priority: 'high' },
      success: true,
    },
    {
      goal: 'Place new order for customer',
      action: 'place_order',
      params: { product: 'jeans', quantity: 1, delivery_date: 'Wednesday September 3' },
      result: { order_id: 'ORD-2050', status: 'processing' },
      success: true,
    },
  ];

  for (const s of strategyScenarios) {
    try {
      // Action event
      await client.event(AGENT_TYPE, bc)
        .action(s.action, s.params)
        .goal(s.goal, 3, 0.5)
        .outcome(s.result)
        .send();

      // Outcome learning event
      await client.event(AGENT_TYPE, bc)
        .learning({ Outcome: { query_id: `seed-${s.action}`, success: s.success } })
        .send();
    } catch {
      // Non-fatal
    }
  }

  // ── Ingest a sample conversation for structured memory ────────────
  try {
    await client.ingestConversations({
      case_id: 'demo_customer_history',
      sessions: [
        {
          session_id: 'demo_session_1',
          topic: 'Customer order history',
          messages: [
            { role: 'user', content: 'Alice Chen: I ordered jeans for delivery on Wednesday September 3rd.' },
            { role: 'user', content: 'Alice Chen: My order ORD-1001 has Wireless Noise-Cancelling Headphones, shipped with tracking TRK-88291.' },
            { role: 'user', content: 'Bob Martinez: My order ORD-1003 was delivered late. I want to file a complaint.' },
            { role: 'user', content: 'Carol Wang: I love the 27 inch 4K Monitor. Can you recommend similar products?' },
            { role: 'user', content: 'Alice Chen prefers email communication and vegetarian restaurants.' },
          ],
        },
      ],
      include_assistant_facts: false,
    });
  } catch {
    // Non-fatal
  }

  console.log('[seed] Demo data seeded successfully.');
}
