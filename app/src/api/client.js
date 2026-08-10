const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function getJson(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${path}`);
  }
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${path}`);
  }
  return res.json();
}

async function patchJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${path}`);
  }
  return res.json();
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
