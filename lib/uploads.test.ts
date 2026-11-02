import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_BYTES, fileProblem } from "./uploads.ts";

test("files within the rules pass", () => {
  assert.equal(fileProblem({ name: "Logo.PNG", size: 2000 }, "general"), null);
  assert.equal(fileProblem({ name: "agreement.pdf", size: MAX_BYTES }, "pdf"), null);
});

test("too big says the size and the limit", () => {
  assert.match(fileProblem({ name: "shoot.zip", size: 40 * 1024 * 1024 }, "general")!, /40\.0 MB; the limit is 25 MB/);
  assert.match(fileProblem({ name: "a.pdf", size: MAX_BYTES + 1 }, "pdf")!, /limit is 25 MB/);
});

test("wrong types are named", () => {
  assert.match(fileProblem({ name: "setup.exe", size: 10 }, "general")!, /\.exe files aren't accepted/);
  assert.match(fileProblem({ name: "README", size: 10 }, "general")!, /no file type/);
  assert.match(fileProblem({ name: "contract.docx", size: 10 }, "pdf")!, /isn't a PDF/);
});

test("empty files are refused", () => {
  assert.match(fileProblem({ name: "logo.png", size: 0 }, "general")!, /is empty/);
});
