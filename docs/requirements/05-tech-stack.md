# 技術スタック

## 9. 技術スタック
- React + TypeScript + Vite
- ドラッグ&ドロップ: `@dnd-kit`(リスト内並び替え・リスト間移動の両方に対応)
- 状態管理: React標準の `useState` / `useContext`(v1では外部ライブラリ不要)
- データ保存: ブラウザ `IndexedDB`(`idb`ライブラリでPromiseベースにラップして利用)
