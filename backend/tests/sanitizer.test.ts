import assert from "node:assert/strict";
import test from "node:test";
import { escapeSql, sanitizeObject } from "../src/core/utils/sanitizer";

test("escapeSql escapes control characters and SQL-sensitive punctuation", () => {
  assert.equal(escapeSql("a\0\b\t\x1a\n\r\"'\\%z"), "a\\0\\b\\t\\z\\n\\r\\\"\\'\\\\\\%z");
});

test("sanitizeObject preserves its input shape while sanitizing string values", () => {
  const result = sanitizeObject({ title: "<b>Hello</b>", nested: { note: "<script>x</script>safe" } });
  assert.deepEqual(result, { title: "Hello", nested: { note: "safe" } });
});
