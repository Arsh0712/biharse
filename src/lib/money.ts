// Money helpers — everything internal is paise (Int)
export const toRupees = (paise: number) => paise / 100;

export function formatINR(paise: number, opts?: { decimals?: boolean }) {
  const v = toRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(v);
}

export function savingsPct(mrp: number, price: number) {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);
