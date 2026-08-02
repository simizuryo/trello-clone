import { useState } from "react";

export default function AddCardForm({ onSubmit }) {
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
      <div className="composer">
        <button type="button" className="add-trigger" onClick={open}>
          + カードを追加
        </button>
      </div>
    );
  }

  return (
    <div className="composer">
      <div className="composer-form">
        <textarea
          rows={2}
          autoFocus
          placeholder="カードのタイトルを入力"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              close();
            }
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
