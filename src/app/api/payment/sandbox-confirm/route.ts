import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sandboxGatewayResult } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * Sandbox gateway step: mirrors what Razorpay Checkout does after collecting a payment.
 * Returns paymentId + signature WITHOUT touching the order — the client still posts to
 * /api/payment/verify, which runs the exact same HMAC verification as the live flow.
 */
export async function POST(req: NextRequest) {
  const { paymentOrderId, method } = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (!paymentOrderId) return NextResponse.json({ error: 'paymentOrderId required' }, { status: 400 });

  const order = await db.order.findFirst({ where: { paymentOrderId } });
  if (!order) return NextResponse.json({ error: 'Unknown payment order' }, { status: 404 });
  if (order.paymentProvider !== 'sandbox') {
    return NextResponse.json({ error: 'Not available in live Razorpay mode' }, { status: 400 });
  }

  const result = sandboxGatewayResult(paymentOrderId, method || 'upi');
  return NextResponse.json({
    paymentOrderId,
    paymentId: result.paymentId,
    signature: result.signature,
    method: method || 'upi',
    amount: order.total,
    status: 'captured',
  });
}
