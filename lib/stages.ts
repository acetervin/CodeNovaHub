// Mirrors the project_status and payment_plan enums in supabase/migrations.
export const STAGES = [
  ["enquiry", "Enquiry"],
  ["quoted", "Quoted"],
  ["signed", "Signed"],
  ["building", "Building"],
  ["review", "In review"],
  ["live", "Live"],
  ["care", "Care plan"],
  ["closed", "Closed"],
] as const;
export type Stage = (typeof STAGES)[number][0];
export const STAGE_IDS = STAGES.map(([id]) => id);
export const stageLabel: Record<string, string> = Object.fromEntries(STAGES);

export const PLANS = [
  ["per_job", "Pay per job"],
  ["monthly", "Monthly plan"],
  ["lease", "Lease to own"],
  ["hourly", "Hourly"],
] as const;
export const PLAN_IDS = PLANS.map(([id]) => id);

export const DOC_KINDS = [
  ["agreement", "Agreement"],
  ["addendum", "Addendum"],
  ["options", "Options sheet"],
  ["schedule", "Billing schedule"],
  ["invoice", "Invoice"],
  ["other", "Other"],
] as const;
export const DOC_KIND_IDS = DOC_KINDS.map(([id]) => id);
export const docKindLabel: Record<string, string> = Object.fromEntries(DOC_KINDS);

export const shillings = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
// A plain date (2026-11-11) is a calendar day; a timestamp is shown as the day it was in Nairobi.
export const shortDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: d.length > 10 ? "Africa/Nairobi" : "UTC" });
