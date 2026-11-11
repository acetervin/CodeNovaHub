import { test } from "node:test";
import assert from "node:assert/strict";
import { nudgeContact, nudgeHref, nudgeMessage } from "./nudge.ts";

const amina = { name: "Amina Wanjiku", phone: null, email: "amina@example.com" };
const otieno = { name: "Otieno", phone: "254712345678", email: null };

test("prefers someone with a phone, falls back to email, else nothing", () => {
  assert.equal(nudgeContact([amina, otieno]), otieno);
  assert.equal(nudgeContact([amina]), amina);
  assert.equal(nudgeContact([{ name: "x", phone: null, email: null }]), undefined);
});

test("WhatsApp for a phone, email otherwise, with the message encoded", () => {
  assert.equal(nudgeHref(otieno, "Hi & bye"), "https://wa.me/254712345678?text=Hi%20%26%20bye");
  assert.match(nudgeHref(amina, "Hi")!, /^mailto:amina@example\.com\?subject=.+&body=Hi$/);
  assert.equal(nudgeHref(undefined, "Hi"), null);
});

test("message says late or due", () => {
  const base = { first: "Amina", what: '"Logo"', project: "Bakery website", link: "https://hub/p/1" };
  assert.equal(nudgeMessage({ ...base, due: "8 Nov 2026", late: true }),
    'Hi Amina, a quick reminder from CodeNova about "Logo" for Bakery website, which was due 8 Nov 2026. You can see it here: https://hub/p/1');
  assert.match(nudgeMessage({ ...base, due: "20 Nov 2026", late: false }), /, due 20 Nov 2026\./);
  assert.match(nudgeMessage({ ...base, due: null, late: false }), /Bakery website\. You can/);
});
