export function initialState() {
  return { status: "loading", error: null, lists: [], cards: [] };
}

export function reducer(state, action) {
  switch (action.type) {
    case "LOAD_SUCCESS":
      return { status: "ready", error: null, lists: action.lists, cards: action.cards };
    case "LOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "SET_LISTS":
      return { ...state, lists: action.lists };
    case "SET_CARDS":
      return { ...state, cards: action.cards };
    case "SAVE_ERROR":
      return { ...state, saveError: action.error };
    default:
      return state;
  }
}
