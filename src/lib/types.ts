// Shared domain types (client + server)

export type Role = 'CUSTOMER' | 'OWNER' | 'MANAGER' | 'PACKING' | 'SUPPORT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
}

export interface ProductVariant {
  label: string;
  weightG: number;
  priceDelta: number; // paise
}

export interface ProductFaq { qEn: string; qHi: string; aEn: string; aHi: string; }
export interface NutritionRow { label: string; per100g: string; }

export interface Product {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  taglineEn: string;
  taglineHi: string;
  storyEn: string;
  storyHi: string;
  ingredientsEn: string;
  ingredientsHi: string;
  allergensEn: string;
  allergensHi: string;
  storageEn: string;
  storageHi: string;
  shelfLifeDays: number;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameHi: string;
  mrp: number; // paise
  price: number; // paise
  gstRate: number;
  hsn: string;
  stock: number;
  lowStockAt: number;
  isFeatured: boolean;
  isDemo: boolean;
  batchDate: string;
  images: string[];
  variants: ProductVariant[];
  faq: ProductFaq[];
  nutrition: NutritionRow[];
  seoTitle: string;
  seoDesc: string;
  rating: number;
  reviewCount: number;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  descEn: string;
  descHi: string;
}

export interface ReviewDto {
  id: string;
  productId: string;
  name: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
}

export interface CartLine {
  slug: string;
  variantLabel: string;
  weightG: number;
  unitPrice: number; // paise, incl. variant delta
  mrp: number;
  qty: number;
}

export interface AddressDto {
  id?: string;
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface OrderBase {
  id: string;
  number: string;
  status: string;
  email: string;
  phone: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string;
  giftNote: string;
  paymentProvider: string;
  paymentOrderId: string;
  paymentId: string;
  paymentMethod: string;
  trackingNumber: string;
  courier: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  items: {
    slug: string;
    nameEn: string;
    variantLabel: string;
    weightG: number;
    unitPrice: number;
    mrp: number;
    qty: number;
    lineTotal: number;
    image: string;
  }[];
  address: AddressDto | null;
}

export interface ChhathYearDto {
  year: number;
  nahayKhay: string;
  kharna: string;
  sandhyaArghya: string;
  ushaArghya: string;
  note: string;
}

export interface Bootstrap {
  announcement: { active: boolean; textEn: string; textHi: string; code: string; discount: string; note: string };
  hero: { titleEn: string; titleHi: string; subEn: string; subHi?: string; ctaPrimary: string; ctaSecondary: string; proof: string[] };
  business: { email: string; phone: string; address: string; gstin: string };
  shipping: { freeAbovePaise: number; flatPaise: number; defaultMinDays: number; defaultMaxDays: number };
  flags: { music: boolean; exitIntent: boolean; whatsapp: boolean; reviews: boolean };
  footer: { signoff: string; tagHi: string };
  categories: Category[];
  chhathUpcoming: ChhathYearDto | null;
  chhathAll: ChhathYearDto[];
  paymentMode: 'razorpay' | 'sandbox';
  razorpayKeyId: string;
  googleEnabled: boolean;
}

export interface DeliveryCheck {
  serviceable: boolean;
  city: string;
  state: string;
  minDays: number;
  maxDays: number;
  etaLabel: string;
}

/* ── Admin DTO addenda (Task 13 — additive only) ─────────────────────── */

export interface OrderDto extends OrderBase {
  /** Admin detail only — billing snapshot when it differed from shipping. */
  billing?: AddressDto | null;
  /** Admin detail only — GST invoice fields {legalName, gstin, invoiceEmail}. */
  gst?: { legalName?: string; gstin?: string; invoiceEmail?: string } | null;
  /** Admin detail only — checkout consent record (Consumer Protection Rules). */
  consentAt?: string | null;
  consentIp?: string;
  consentVersion?: string;
  /** Admin detail only — payment event timeline. */
  paymentEvents?: {
    id: string;
    provider: string;
    eventType: string;
    externalEventId: string;
    paymentOrderId: string;
    paymentId: string;
    signatureValid: boolean;
    processed: boolean;
    createdAt: string;
  }[];
}

export interface AdminCouponDto {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number; // percent or paise
  minSubtotal: number;
  maxDiscount: number;
  active: boolean;
  expiresAt: string | null;
  usageCount: number;
  note: string;
}

export interface AdminClaimDto {
  id: string;
  claimNumber: string;
  orderNumber: string;
  email: string;
  type: 'DAMAGED' | 'WRONG_ITEM' | 'EXPIRED' | 'MISSING' | 'OTHER';
  description: string;
  evidencePath: string;
  status: 'OPEN' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditRow {
  id: string;
  actor: string;
  action: string;
  metaJson: string;
  createdAt: string;
}

export interface AdminCustomerDto {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export type PaymentMode = 'razorpay' | 'sandbox';
