import { test } from "node:test";
import assert from "node:assert/strict";
import { completion, daysLabel, money, newestFirst, nextDue, taskState, weeklyCompletion } from "./progress.ts";

const today = "2026-11-11";
const tasks = [
  { title: "Brief", due_on: "2026-10-20", done_on: "2026-10-19" },
  { title: "Design", due_on: "2026-11-05", done_on: "2026-11-09" },
  { title: "Build", due_on: "2026-11-10", done_on: null },
  { title: "Launch", due_on: "2026-12-01", done_on: null },
];

test("completion counts done tasks, and is unknown with no tasks", () => {
  assert.equal(completion(tasks), 50);
  assert.equal(completion([]), null);
});

test("a task is late only when open and past due", () => {
  assert.deepEqual(tasks.map((t) => taskState(t, today)), ["done", "done", "late", "open"]);
  assert.equal(taskState({ due_on: today, done_on: null }, today), "open");
});

test("weekly completion rises to today's figure", () => {
  const w = weeklyCompletion(tasks, today, 4);
  assert.equal(w.length, 4);
  assert.equal(w.at(-1), 50);
  assert.deepEqual(w, [25, 25, 25, 50]);
  assert.deepEqual(weeklyCompletion([], today), []);
});

test("next due picks the soonest open task, even a late one", () => {
  const n = nextDue(tasks, today)!;
  assert.equal(n.task.title, "Build");
  assert.equal(n.days, -1);
  assert.equal(nextDue([{ due_on: null, done_on: null }], today), null);
});

test("newest first puts undated open tasks, then the latest dates, on top", () => {
  const order = newestFirst([...tasks, { title: "Someday", due_on: null, done_on: null }]).map((t) => t.title);
  assert.deepEqual(order, ["Someday", "Launch", "Build", "Design", "Brief"]);
  assert.equal(tasks[0].title, "Brief"); // the input isn't reordered
});

test("day labels", () => {
  assert.equal(daysLabel(0), "Due today");
  assert.equal(daysLabel(1), "1 day left");
  assert.equal(daysLabel(-3), "3 days late");
  assert.equal(daysLabel(20), "3 weeks left");
});

test("money splits paid, still due and overdue", () => {
  const m = money([
    { amount_kes: 20000, due_on: "2026-10-01", paid_on: "2026-10-01" },
    { amount_kes: 15000, due_on: "2026-11-01", paid_on: null },
    { amount_kes: 15000, due_on: "2026-12-01", paid_on: null },
  ], today);
  assert.deepEqual(m, { paid: 20000, due: 30000, overdue: 15000, total: 50000 });
});
