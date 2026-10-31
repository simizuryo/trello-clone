// user-flow: 検索(サーバー)画面での一連の操作を、画面が実際に送るリクエストの組み合わせで再現する。
// 操作ごとの所要時間(複数リクエストの合計)を Trend メトリクス op_* として集計する。
//
//   初期表示   GET /api/lists と GET /api/cards を並行
//   検索       キーワード(デバウンス後の1回)→ 優先度で絞り込み
//   カード作成 POST /api/cards
//   編集       PATCH /api/cards/{id}
//   ドラッグ   PATCH /api/cards/{id}/position → GET /api/cards(画面は移動後に必ず再取得する)
//
// カード作成でデータが少しずつ増える(1反復1件)ため、実行前に毎回データを投入し直すこと。
//
// 環境変数: VUS(既定 1)、WARMUP(既定 30s)、DURATION(既定 3m)、TARGET_P95_MS(既定 200)、BASE_URL
import { group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import {
    SUMMARY_TREND_STATS, TARGET_P95_MS, createApi, loadBoard, pick, summaryOutputs,
} from './lib/common.js';

const SCENARIO = 'user-flow';
const VUS = Number(__ENV.VUS || 1);
const WARMUP = __ENV.WARMUP || '30s';
const DURATION = __ENV.DURATION || '3m';
// 操作の合間に人が考える時間(秒)
const THINK_TIME = Number(__ENV.THINK_TIME || 1);

const ops = {
    initialLoad: new Trend('op_initial_load', true),
    search: new Trend('op_search', true),
    createCard: new Trend('op_create_card', true),
    editCard: new Trend('op_edit_card', true),
    dragCard: new Trend('op_drag_card', true),
};

const thresholds = {
    'checks{scenario:measure}': ['rate==1'],
    'http_req_failed{scenario:measure}': ['rate==0'],
    'http_req_duration{scenario:measure}': [`p(95)<${TARGET_P95_MS}`],
};
for (const trend of Object.values(ops)) {
    thresholds[`${trend.name}{scenario:measure}`] = [`p(95)<${TARGET_P95_MS}`];
}

export const options = {
    scenarios: {
        warmup: { executor: 'constant-vus', vus: VUS, duration: WARMUP, gracefulStop: '5s' },
        measure: { executor: 'constant-vus', vus: VUS, duration: DURATION, startTime: WARMUP },
    },
    thresholds,
    summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
    return loadBoard(createApi(SCENARIO));
}

function timed(trend, fn) {
    const start = Date.now();
    fn();
    trend.add(Date.now() - start);
}

export default function (board) {
    const api = createApi(SCENARIO);

    group('初期表示', () => timed(ops.initialLoad, () => api.loadScreen()));
    sleep(THINK_TIME);

    group('検索', () => {
        timed(ops.search, () => api.searchCards({ keyword: 'レビュー' }));
        sleep(THINK_TIME);
        timed(ops.search, () => api.searchCards({ priority: 'HIGH' }));
    });
    sleep(THINK_TIME);

    group('カード作成', () => timed(ops.createCard, () => api.createCard({
        listId: pick(board.listIds),
        title: `perf-${__VU}-${__ITER}`,
        priority: 'MEDIUM',
    })));
    sleep(THINK_TIME);

    group('編集', () => {
        const card = pick(board.cards);
        // 優先度の絞り込み結果が実行中に変わらないよう、内容は変えずに更新する
        timed(ops.editCard, () => api.updateCard(card.id, { title: card.title, priority: card.priority, dueDate: card.dueDate }));
    });
    sleep(THINK_TIME);

    group('ドラッグ', () => timed(ops.dragCard, () => {
        api.moveCard(pick(board.cards).id, pick(board.listIds), Math.floor(Math.random() * board.cardsPerList));
        api.searchCards();
    }));
    sleep(THINK_TIME);
}

export function handleSummary(data) {
    return summaryOutputs(SCENARIO, data);
}
