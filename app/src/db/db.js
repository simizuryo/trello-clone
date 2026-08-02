import { openDB } from "idb";

const DB_NAME = "trello-clone-db";
const DB_VERSION = 1;
const LISTS_STORE = "lists";
const CARDS_STORE = "cards";

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(LISTS_STORE)) {
          db.createObjectStore(LISTS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CARDS_STORE)) {
          const cardStore = db.createObjectStore(CARDS_STORE, { keyPath: "id" });
          cardStore.createIndex("by-listId", "listId");
        }
      },
    });
  }
  return dbPromise;
}

export async function loadBoard() {
  const db = await getDB();
  const [lists, cards] = await Promise.all([
    db.getAll(LISTS_STORE),
    db.getAll(CARDS_STORE),
  ]);
  return { lists, cards };
}

export async function putList(list) {
  const db = await getDB();
  await db.put(LISTS_STORE, list);
}

export async function deleteListWithCards(listId) {
  const db = await getDB();
  const tx = db.transaction([LISTS_STORE, CARDS_STORE], "readwrite");
  const cardIndex = tx.objectStore(CARDS_STORE).index("by-listId");
  const cardKeys = await cardIndex.getAllKeys(listId);
  await Promise.all([
    tx.objectStore(LISTS_STORE).delete(listId),
    ...cardKeys.map((key) => tx.objectStore(CARDS_STORE).delete(key)),
  ]);
  await tx.done;
}

export async function putCard(card) {
  const db = await getDB();
  await db.put(CARDS_STORE, card);
}

export async function putCards(cards) {
  const db = await getDB();
  const tx = db.transaction(CARDS_STORE, "readwrite");
  await Promise.all(cards.map((card) => tx.store.put(card)));
  await tx.done;
}

export async function deleteCard(cardId) {
  const db = await getDB();
  await db.delete(CARDS_STORE, cardId);
}

export async function putLists(lists) {
  const db = await getDB();
  const tx = db.transaction(LISTS_STORE, "readwrite");
  await Promise.all(lists.map((list) => tx.store.put(list)));
  await tx.done;
}
