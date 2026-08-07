const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function getJson(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
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
