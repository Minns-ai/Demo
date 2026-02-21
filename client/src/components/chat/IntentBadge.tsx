import Badge from '../shared/Badge';

const intentColors: Record<string, 'brand' | 'green' | 'amber' | 'red' | 'gray'> = {
  track_order: 'brand',
  order_status: 'brand',
  delivery_estimate: 'brand',
  initiate_return: 'amber',
  refund_status: 'amber',
  exchange: 'amber',
  product_info: 'green',
  availability: 'green',
  recommend: 'green',
  file_complaint: 'red',
  escalate: 'red',
  feedback: 'green',
  account_info: 'brand',
  update_profile: 'brand',
  reset_password: 'amber',
  query: 'gray',
};

export default function IntentBadge({ intent, confidence }: { intent: string; confidence?: number }) {
  const variant = intentColors[intent] || 'gray';
  return (
    <Badge variant={variant}>
      {intent}
      {confidence != null && <span className="ml-1 opacity-60">{(confidence * 100).toFixed(0)}%</span>}
    </Badge>
  );
}
