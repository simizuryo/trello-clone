// Structured JSON logger for the browser. Each entry is a single JSON line with
// timestamp, level, logger name, message and context fields; secrets and e-mail
// addresses are masked with the same rules as the backend (SensitiveDataMasker).
//
// Minimum level: VITE_LOG_LEVEL (debug | info | warn | error | silent),
// defaulting to "debug" in development and "info" in production builds.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export const MASK = "****";

const SENSITIVE_KEY = /^(pass(word|wd)?|pwd|secret|client[-_]?secret|(access[-_]?|refresh[-_]?)?token|api[-_]?key|authorization)$/i;

const VALUE_RULES = [
  [/(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, `$1${MASK}`],
  [
    /("?(?:password|passwd|pwd|secret|client[_-]?secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization)"?\s*[:=]\s*"?)([^\s",&;]+)/gi,
    `$1${MASK}`,
  ],
  [/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, `${MASK}@$1`],
];

export function maskString(text) {
  if (typeof text !== "string" || text === "") return text;
  return VALUE_RULES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

const MAX_DEPTH = 5;

export function maskValue(value, depth = 0) {
  if (typeof value === "string") return maskString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[Truncated]";
  if (value instanceof Error) {
    return { name: value.name, message: maskString(value.message), stack: maskString(value.stack) };
  }
  if (Array.isArray(value)) return value.map((v) => maskValue(v, depth + 1));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? MASK : maskValue(v, depth + 1);
  }
  return out;
}

// crypto.randomUUID is only available in secure contexts (https / localhost);
// the EC2 deployment is served over plain http, so fall back to getRandomValues.
export function createRequestId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function defaultLevel() {
  const env = import.meta.env ?? {};
  if (env.VITE_LOG_LEVEL && env.VITE_LOG_LEVEL in LEVELS) return env.VITE_LOG_LEVEL;
  return env.DEV ? "debug" : "info";
}

function consoleSink(level, line) {
  (console[level] ?? console.log)(line);
}

export function createLogger(name, { level = defaultLevel(), sink = consoleSink } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function log(entryLevel, message, context = {}) {
    if (LEVELS[entryLevel] < threshold) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level: entryLevel.toUpperCase(),
      logger: name,
      message: maskString(String(message)),
      ...maskValue(context),
    };
    sink(entryLevel, JSON.stringify(entry));
  }

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
  };
}
