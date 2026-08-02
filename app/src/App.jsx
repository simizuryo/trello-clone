import { BoardProvider, useBoard } from "./context/BoardContext";
import Board from "./components/Board";

function BoardScreen() {
  const { status, error, saveError } = useBoard();

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

  return (
    <>
      <div className="topbar">
        <h1>Trello風タスク管理</h1>
        {saveError && <span className="error-banner">{saveError}</span>}
      </div>
      <Board />
    </>
  );
}

export default function App() {
  return (
    <BoardProvider>
      <BoardScreen />
    </BoardProvider>
  );
}
