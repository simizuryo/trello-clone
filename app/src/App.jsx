import { useState } from "react";
import { BoardProvider, useBoard } from "./context/BoardContext";
import Board from "./components/Board";
import SearchBoardScreen from "./components/SearchBoardScreen";

function BoardScreen() {
  const { status, error } = useBoard();

  if (status === "loading") {
    return (
      <div className="status-screen">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="status-screen">
        <p className="error-message">データベースの初期化に失敗しました: {error}</p>
      </div>
    );
  }

  return <Board />;
}

function AppShell({ view, onChangeView }) {
  const { saveError } = useBoard();

  return (
    <>
      <div className="topbar">
        <h1>Trello風タスク管理</h1>
        {view === "local" && saveError && <span className="error-banner">{saveError}</span>}
        <div className="view-tabs" role="tablist" aria-label="表示切り替え">
          <button
            type="button"
            role="tab"
            aria-selected={view === "local"}
            className={`view-tab${view === "local" ? " active" : ""}`}
            onClick={() => onChangeView("local")}
          >
            マイボード
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "search"}
            className={`view-tab${view === "search" ? " active" : ""}`}
            onClick={() => onChangeView("search")}
          >
            検索(サーバー)
          </button>
        </div>
      </div>
      {view === "local" ? <BoardScreen /> : <SearchBoardScreen />}
    </>
  );
}

export default function App() {
  const [view, setView] = useState("local");

  return (
    <BoardProvider>
      <AppShell view={view} onChangeView={setView} />
    </BoardProvider>
  );
}
