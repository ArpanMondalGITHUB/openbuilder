import assert from "node:assert/strict";
import test from "node:test";

process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL = "";

const { accessTokenBlockKey, accessTokenBlockTtl } =
  require("../middlewares/auth.middlewares") as typeof import("../middlewares/auth.middlewares");

test("access token blacklist key is namespaced", () => {
  assert.equal(accessTokenBlockKey("abc"), "auth:access-token:abc");
});

test("access token blacklist ttl uses remaining token life", () => {
  assert.equal(accessTokenBlockTtl(1_100, 1_000), 100);
});

test("access token blacklist ttl never drops below one second", () => {
  assert.equal(accessTokenBlockTtl(999, 1_000), 1);
});
