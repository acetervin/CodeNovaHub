// Numbers the dashboard and the client portal show. Dates are YYYY-MM-DD strings in Nairobi time.

type Task = { title?: string; due_on: string | null; done_on: string | null };
type Payment = { amount_kes: number; due_on: string | null; paid_on: string | null };

const DAY = 86_400_000;
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export type TaskState = "done" | "late" | "open";
export const taskState = (t: Task, today: string): TaskState =>
  t.done_on ? "done" : t.due_on && t.due_on < today ? "late" : "open";

/** Share of tasks done, 0–100, or null when there are no tasks to measure. */
export function completion(tasks: Task[]): number | null {
  if (!tasks.length) return null;
  return Math.round((tasks.filter((t) => t.done_on).length / tasks.length) * 100);
}

/** Newest first: a done task by when it was done, an open one by when it's due. Undated open tasks go on top. */
export const newestFirst = <T extends Task>(tasks: T[]) =>
  [...tasks].sort((a, b) => (b.done_on ?? b.due_on ?? "9999").localeCompare(a.done_on ?? a.due_on ?? "9999"));

/** Completion at the end of each of the last `weeks` weeks, oldest first. The last bar is today. */
export function weeklyCompletion(tasks: Task[], today: string, weeks = 8): number[] {
  if (!tasks.length) return [];
  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(Date.parse(today) - (weeks - 1 - i) * 7 * DAY).toISOString().slice(0, 10);
    return Math.round((tasks.filter((t) => t.done_on && t.done_on <= end).length / tasks.length) * 100);
  });
}

/** The open task due soonest, and how many days are left (negative = late). */
export function nextDue<T extends Task>(tasks: T[], today: string): { task: T; days: number } | null {
  const open = tasks.filter((t) => !t.done_on && t.due_on).sort((a, b) => a.due_on!.localeCompare(b.due_on!));
  return open.length ? { task: open[0], days: daysBetween(today, open[0].due_on!) } : null;
}

export function daysLabel(days: number): string {
  if (days === 0) return "Due today";
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} late`;
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"} left`;
  const w = Math.round(days / 7);
  return `${w} weeks left`;
}

export function money(payments: Payment[], today: string) {
  const paid = payments.filter((p) => p.paid_on).reduce((s, p) => s + p.amount_kes, 0);
  const due = payments.filter((p) => !p.paid_on).reduce((s, p) => s + p.amount_kes, 0);
  const overdue = payments.filter((p) => !p.paid_on && p.due_on && p.due_on < today).reduce((s, p) => s + p.amount_kes, 0);
  return { paid, due, overdue, total: paid + due };
}
