// Reminders Kevin sends himself, from his own WhatsApp or email. The hub never messages a client on its own.

export type Contact = { name: string; phone: string | null; email: string | null };

/** The contact to nudge: the first one with a phone (WhatsApp), else the first with an email. */
export const nudgeContact = (contacts: Contact[]) => contacts.find((c) => c.phone) ?? contacts.find((c) => c.email);

/** A WhatsApp link with the message filled in, or an email link if there's no phone; null if neither. */
export function nudgeHref(c: Contact | undefined, message: string): string | null {
  if (c?.phone) return `https://wa.me/${c.phone}?text=${encodeURIComponent(message)}`;
  if (c?.email) return `mailto:${c.email}?subject=${encodeURIComponent("A quick reminder from CodeNova")}&body=${encodeURIComponent(message)}`;
  return null;
}

/** "Hi Amina, a quick reminder from CodeNova about "Logo" for Bakery website, which was due 8 Nov 2026. …" */
export function nudgeMessage({ first, what, project, due, late, link }: {
  first: string; what: string; project: string; due: string | null; late: boolean; link: string;
}) {
  const when = due ? `, ${late ? "which was due" : "due"} ${due}` : "";
  return `Hi ${first}, a quick reminder from CodeNova about ${what} for ${project}${when}. You can see it here: ${link}`;
}
