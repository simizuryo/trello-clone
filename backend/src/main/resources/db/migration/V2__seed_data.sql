INSERT INTO lists (id, title, sort_order) VALUES
    (1, 'Todo', 0),
    (2, 'In Progress', 1),
    (3, 'Done', 2);

INSERT INTO cards (list_id, title, sort_order, priority, due_date) VALUES
    (1, '要件定義をレビューする', 0, 'HIGH', '2026-08-10'),
    (1, 'ワイヤーフレームを作成する', 1, 'MEDIUM', '2026-08-20'),
    (1, '技術選定のメモを書く', 2, NULL, NULL),
    (2, 'READ APIを実装する', 0, 'HIGH', '2026-08-05'),
    (2, 'テストデータを投入する', 1, 'MEDIUM', NULL),
    (2, 'ドキュメントを更新する', 2, 'LOW', '2026-09-01'),
    (3, 'DB接続確認を行う', 0, 'HIGH', '2026-08-01'),
    (3, 'docker-composeを整備する', 1, NULL, '2026-07-30');

SELECT setval('lists_id_seq', (SELECT MAX(id) FROM lists));
