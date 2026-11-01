// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { FormError, date, email, kes, normalizePhone, url } from "./form.ts";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

test("phone numbers normalise to 254…", () => {
  assert.equal(normalizePhone("0712 345 678"), "254712345678");
  assert.equal(normalizePhone("0112345678"), "254112345678");
  assert.equal(normalizePhone("+254 712-345-678"), "254712345678");
  assert.equal(normalizePhone("254712345678"), "254712345678");
  assert.equal(normalizePhone("+44 7700 900123"), "447700900123");
  assert.equal(normalizePhone("0712"), null);
  assert.equal(normalizePhone("07123abc78"), null);
  assert.equal(normalizePhone(""), null);
});

test("shillings accept separators, reject decimals and negatives", () => {
  assert.equal(kes(fd({ a: "49,000" }), "a", "Amount"), 49000);
  assert.equal(kes(fd({ a: "49 000" }), "a", "Amount"), 49000);
  assert.equal(kes(fd({ a: "" }), "a", "Amount"), null);
  assert.throws(() => kes(fd({ a: "10.5" }), "a", "Amount"), FormError);
  assert.throws(() => kes(fd({ a: "-1" }), "a", "Amount"), FormError);
});

test("dates, links and emails", () => {
  assert.equal(date(fd({ d: "2026-11-04" }), "d", "Due"), "2026-11-04");
  assert.throws(() => date(fd({ d: "2026-13-40" }), "d", "Due"), FormError);
  assert.equal(url(fd({ u: "minada.ke" }), "u", "Live link"), "https://minada.ke");
  assert.throws(() => url(fd({ u: "not a url" }), "u", "Live link"), FormError);
  assert.equal(email(fd({ e: " Owner@Tetezi.CO.KE " }), "e"), "owner@tetezi.co.ke");
  assert.throws(() => email(fd({ e: "owner@" }), "e"), FormError);
});
