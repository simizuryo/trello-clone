-- パフォーマンステスト用のデータ投入。既存のリスト・カードをすべて削除してから、指定件数を投入する。
--
-- 変数(psqlの -v で指定):
--   lists  リスト数(既定 10)
--   cards  1リストあたりのカード数(既定 50)
--
-- 開発用DBを誤って消さないよう、DB名が _perf で終わる場合だけ実行する。
-- スキーマはバックエンド起動時のFlywayマイグレーションで作成済みであること。

\if :{?lists}
\else
  \set lists 10
\endif
\if :{?cards}
\else
  \set cards 50
\endif

DO $$
BEGIN
    IF current_database() NOT LIKE '%\_perf' THEN
        RAISE EXCEPTION 'Refusing to seed database "%": its name must end with _perf', current_database();
    END IF;
END
$$;

BEGIN;

TRUNCATE cards, lists RESTART IDENTITY;

INSERT INTO lists (title, sort_order)
SELECT 'リスト' || i, i - 1
FROM generate_series(1, :lists) AS i;

-- タイトルの先頭語・優先度・期限を周期的に変え、キーワード検索や優先度の絞り込みが一定割合でヒットするようにする
INSERT INTO cards (list_id, title, sort_order, priority, due_date)
SELECT l.id,
       (ARRAY['レビュー', '設計', '実装', 'テスト', 'デプロイ'])[1 + n % 5] || 'タスク ' || l.id || '-' || n,
       n - 1,
       (ARRAY['HIGH', 'MEDIUM', 'LOW', NULL])[1 + n % 4],
       CASE WHEN n % 3 = 0 THEN NULL ELSE DATE '2026-11-01' + n % 60 END
FROM lists AS l
CROSS JOIN generate_series(1, :cards) AS n;

COMMIT;

ANALYZE lists;
ANALYZE cards;

SELECT (SELECT count(*) FROM lists) AS lists, (SELECT count(*) FROM cards) AS cards;
