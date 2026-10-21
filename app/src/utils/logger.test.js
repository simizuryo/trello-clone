import { describe, expect, it, vi } from "vitest";
import { MASK, createLogger, createRequestId, maskString, maskValue } from "./logger";

function capture(level = "debug") {
  const lines = [];
  const logger = createLogger("test", { level, sink: (lvl, line) => lines.push({ lvl, entry: JSON.parse(line) }) });
  return { logger, lines };
}

describe("createLogger", () => {
  it("writes one JSON entry with timestamp, level, logger name, message and context", () => {
    const { logger, lines } = capture();
    logger.info("hello", { requestId: "abc", count: 2 });

    expect(lines).toHaveLength(1);
    const { lvl, entry } = lines[0];
    expect(lvl).toBe("info");
    expect(entry).toMatchObject({ level: "INFO", logger: "test", message: "hello", requestId: "abc", count: 2 });
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it("drops entries below the configured level", () => {
    const { logger, lines } = capture("warn");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(lines.map((l) => l.entry.level)).toEqual(["WARN", "ERROR"]);
  });

  it("writes nothing when silent", () => {
    const { logger, lines } = capture("silent");
    logger.error("e");
    expect(lines).toEqual([]);
  });

  it("masks secrets in the message and in context fields", () => {
    const { logger, lines } = capture();
    logger.error("login failed password=hunter2 for bob@example.com", {
      token: "abc",
      nested: { apiKey: "k", note: "Authorization: Bearer xyz" },
    });
    const { entry } = lines[0];
    expect(entry.message).toBe(`login failed password=${MASK} for ${MASK}@example.com`);
    expect(entry.token).toBe(MASK);
    expect(entry.nested.apiKey).toBe(MASK);
    expect(entry.nested.note).toBe(`Authorization: ${MASK} ${MASK}`);
  });

  it("serializes Error objects with name, message and stack", () => {
    const { logger, lines } = capture();
    logger.error("boom", { error: new TypeError("token=secret1 broke") });
    expect(lines[0].entry.error).toMatchObject({ name: "TypeError", message: `token=${MASK} broke` });
    expect(typeof lines[0].entry.error.stack).toBe("string");
  });

  it("writes to the matching console method by default", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    createLogger("c", { level: "debug" }).warn("careful");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0])).toMatchObject({ level: "WARN", logger: "c", message: "careful" });
  });
});

describe("maskString / maskValue", () => {
  it("leaves ordinary text untouched", () => {
    expect(maskString("GET /api/cards 200")).toBe("GET /api/cards 200");
  });

  it("does not mutate the input object and limits depth", () => {
    const input = { password: "p", a: { b: { c: { d: { e: { f: 1 } } } } } };
    const out = maskValue(input);
    expect(input.password).toBe("p");
    expect(out.password).toBe(MASK);
    expect(out.a.b.c.d.e).toBe("[Truncated]");
  });
});

describe("createRequestId", () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("returns unique UUIDs", () => {
    const a = createRequestId();
    expect(a).toMatch(UUID_V4);
    expect(createRequestId()).not.toBe(a);
  });

  it("falls back to getRandomValues outside secure contexts (no randomUUID)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (arr) => real.getRandomValues(arr) });
    try {
      expect(createRequestId()).toMatch(UUID_V4);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
