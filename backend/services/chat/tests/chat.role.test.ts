import assert from "node:assert/strict";
import test from "node:test";
import { messageRoleFrom } from "../helpers/role.helpers";
import { ApiError } from "../middlewares/chat.middlewares";

const KEY = "secret-internal-key";

// Regression: a flipped condition made every user prompt (no key) fail with 401.
test("no internal key → user message (a normal prompt from the frontend)", () => {
    assert.equal(messageRoleFrom(undefined, KEY), "user");
    assert.equal(messageRoleFrom("", KEY), "user");
});

test("correct internal key → assistant message (agent saving its reply)", () => {
    assert.equal(messageRoleFrom(KEY, KEY), "assistant");
});

test("wrong internal key → 401, never saved as assistant", () => {
    for (const bad of ["nope", KEY + "x", KEY.slice(0, -1)]) {
        assert.throws(() => messageRoleFrom(bad, KEY), (e: unknown) => e instanceof ApiError && e.statusCode === 401);
    }
});
