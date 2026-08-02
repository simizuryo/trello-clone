import { useState } from "react";

export default function AddListForm({ onSubmit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  function open() {
    setValue("");
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
  }
  function submit() {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setValue("");
    } else {
      close();
    }
  }

  if (!isOpen) {
    return (
      <div className="add-list">
        <button type="button" className="add-list-trigger" onClick={open}>
          + リストを追加
        </button>
      </div>
    );
  }

  return (
    <div className="add-list">
      <div className="add-list-panel">
        <input
          type="text"
          autoFocus
          placeholder="リスト名を入力"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
        />
        <div className="composer-actions">
          <button type="button" className="btn-primary" onClick={submit}>
            追加
          </button>
          <button type="button" className="btn-text" onClick={close}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
