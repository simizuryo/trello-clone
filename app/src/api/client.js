import { createLogger, createRequestId } from "../utils/logger";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const REQUEST_ID_HEADER = "X-Request-Id";

const log = createLogger("api");

// Every request carries a fresh X-Request-Id so that browser logs and backend logs
// (which put the same ID in their `requestId` field) can be correlated.
async function request(method, path, body) {
  const requestId = createRequestId();
  const headers = { [REQUEST_ID_HEADER]: requestId };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  // Query strings may contain user-entered search keywords; keep them out of logs.
  const context = { requestId, method, path: path.split("?")[0] };

  const start = Date.now();
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (err) {
    log.error("API request error", { ...context, durationMs: Date.now() - start, error: err });
    throw err;
  }
  const durationMs = Date.now() - start;
  if (!res.ok) {
    log.error("API request failed", { ...context, status: res.status, durationMs });
    throw new Error(`API request failed: ${res.status} ${path}`);
  }
  log.debug("API request completed", { ...context, status: res.status, durationMs });
  return res.json();
}

function getJson(path) {
  return request("GET", path);
}

function postJson(path, body) {
  return request("POST", path, body);
}

function patchJson(path, body) {
  return request("PATCH", path, body);
}

export function fetchLists() {
  return getJson("/api/lists");
}

export function searchCards({ listId, priority, keyword } = {}) {
  const params = new URLSearchParams();
  if (listId) params.set("listId", listId);
  if (priority) params.set("priority", priority);
  if (keyword) params.set("keyword", keyword);
  const query = params.toString();
  return getJson(`/api/cards${query ? `?${query}` : ""}`);
}

export function createList({ title }) {
  return postJson("/api/lists", { title });
}

export function createCard({ listId, title, priority, dueDate }) {
  return postJson("/api/cards", { listId, title, priority: priority || null, dueDate: dueDate || null });
}

export function updateCardDetails(id, { title, priority, dueDate }) {
  return patchJson(`/api/cards/${id}`, { title, priority: priority || null, dueDate: dueDate || null });
}

export function moveCard(id, { listId, sortOrder }) {
  return patchJson(`/api/cards/${id}/position`, { listId, sortOrder });
}
