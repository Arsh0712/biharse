import type { OrderDto } from './types';

export interface DbPaymentEventLite {
  id: string;
  provider: string;
  eventType: string;
  externalEventId: string;
  paymentOrderId: string;
  paymentId: string;
  signatureValid: boolean;
  processed: boolean;
  createdAt: Date;
}

type DbOrder = {
  id: string; number: string; status: string; email: string; phone: string;
  subtotal: number; discount: number; shipping: number; total: number;
  couponCode: string; giftNote: string; gstFieldsJson: string; addressJson: string;
  billingJson?: string; consentAt?: Date | null; consentIp?: string; consentVersion?: string;
  paymentProvider: string; paymentOrderId: string; paymentId: string; paymentMethod: string;
  trackingNumber: string; courier: string; shippedAt: Date | null; deliveredAt: Date | null;
  createdAt: Date; items: { slug: string; nameEn: string; variantLabel: string; weightG: number; unitPrice: number; mrp: number; qty: number; lineTotal: number; image: string }[];
  paymentEvents?: DbPaymentEventLite[];
};

/** Admin-only detail — serialized additively (order detail drawer + CSV export). */
export function serializeOrder(o: DbOrder): OrderDto {
  let address: OrderDto['address'] = null;
  try { address = JSON.parse(o.addressJson); } catch { address = null; }
  let billing: OrderDto['billing'] = null;
  try { billing = o.billingJson ? (JSON.parse(o.billingJson) as OrderDto['billing']) : null; } catch { billing = null; }
  let gst: OrderDto['gst'] = null;
  try { gst = o.gstFieldsJson ? (JSON.parse(o.gstFieldsJson) as OrderDto['gst']) : null; } catch { gst = null; }

  return {
    id: o.id,
    number: o.number,
    status: o.status,
    email: o.email,
    phone: o.phone,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    couponCode: o.couponCode,
    giftNote: o.giftNote,
    paymentProvider: o.paymentProvider,
    paymentOrderId: o.paymentOrderId,
    paymentId: o.paymentId,
    paymentMethod: o.paymentMethod,
    trackingNumber: o.trackingNumber,
    courier: o.courier,
    shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    items: o.items,
    address,
    // admin-only addenda (optional — older storefront payloads unaffected)
    billing: billing ?? null,
    gst: gst ?? null,
    consentAt: o.consentAt ? new Date(o.consentAt).toISOString() : null,
    consentIp: o.consentIp ?? '',
    consentVersion: o.consentVersion ?? '',
    paymentEvents: (o.paymentEvents ?? []).map((e) => ({
      id: e.id,
      provider: e.provider,
      eventType: e.eventType,
      externalEventId: e.externalEventId,
      paymentOrderId: e.paymentOrderId,
      paymentId: e.paymentId,
      signatureValid: e.signatureValid,
      processed: e.processed,
      createdAt: new Date(e.createdAt).toISOString(),
    })),
  };
}
