// Reading and checking form input at the trust boundary. Every server action goes through these.

export class FormError extends Error {}

const raw = (f: FormData, key: string) => {
  const v = f.get(key);
  return typeof v === "string" ? v.trim() : "";
};

export function text(f: FormData, key: string, label: string, max = 2000): string | null {
  const v = raw(f, key);
  if (v.length > max) throw new FormError(`${label} is too long (${max} characters at most).`);
  return v || null;
}

export function required(f: FormData, key: string, label: string, max = 200): string {
  const v = text(f, key, label, max);
  if (!v) throw new FormError(`${label} is required.`);
  return v;
}

/** Whole shillings. Accepts "49,000" or "49 000". */
export function kes(f: FormData, key: string, label: string): number | null {
  const v = raw(f, key).replace(/[,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 0) throw new FormError(`${label} must be a whole number of shillings.`);
  return n;
}

export function date(f: FormData, key: string, label: string): string | null {
  const v = raw(f, key);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new FormError(`${label} isn't a valid date.`);
  return v;
}

export function url(f: FormData, key: string, label: string): string | null {
  const v = raw(f, key);
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(withScheme).toString().replace(/\/$/, "");
  } catch {
    throw new FormError(`${label} isn't a valid web address.`);
  }
}

export function oneOf<T extends string>(f: FormData, key: string, label: string, options: readonly T[]): T | null {
  const v = raw(f, key);
  if (!v) return null;
  if (!options.includes(v as T)) throw new FormError(`${label} has an unexpected value.`);
  return v as T;
}

export function uuid(v: unknown): string {
  if (typeof v !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    throw new FormError("That item no longer exists. Reload the page.");
  }
  return v;
}

export function email(f: FormData, key: string): string | null {
  const v = raw(f, key).toLowerCase();
  if (!v) return null;
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new FormError("That email address doesn't look right.");
  return v;
}

/** Kenyan numbers to the form Supabase stores: 0712 345 678, +254712345678 → 254712345678. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  if (!digits) return null;
  if (!/^\+?\d+$/.test(digits)) return null;
  let n = digits.replace(/^\+/, "");
  if (/^0[17]\d{8}$/.test(n)) n = `254${n.slice(1)}`;
  return /^\d{10,15}$/.test(n) ? n : null;
}

export function phone(f: FormData, key: string): string | null {
  const v = raw(f, key);
  if (!v) return null;
  const n = normalizePhone(v);
  if (!n) throw new FormError("That phone number doesn't look right. Use 0712 345 678 or +254 712 345 678.");
  return n;
}

/** Today's date in Nairobi, as YYYY-MM-DD. */
export const nairobiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
