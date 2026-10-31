// baseline: 1ユーザーで各エンドポイントを順に呼び、エンドポイント別の応答時間を測る。
// 非機能要件(500件で200ms以内)の合否判定に使う。
//
// 環境変数: WARMUP(既定 30s)、DURATION(既定 1m)、TARGET_P95_MS(既定 200)、BASE_URL
import { sleep } from 'k6';
import {
    SUMMARY_TREND_STATS, TARGET_P95_MS, createApi, loadBoard, pick, summaryOutputs,
} from './lib/common.js';

const SCENARIO = 'baseline';
const WARMUP = __ENV.WARMUP || '30s';
const DURATION = __ENV.DURATION || '1m';

const ENDPOINTS = [
    'GET /api/lists',
    'GET /api/cards',
    'GET /api/cards?keyword',
    'GET /api/cards?priority',
    'GET /api/cards?listId',
    'PATCH /api/cards/{id}',
    'PATCH /api/cards/{id}/position',
];

const thresholds = {
    'checks{scenario:measure}': ['rate==1'],
    'http_req_failed{scenario:measure}': ['rate==0'],
};
for (const name of ENDPOINTS) {
    thresholds[`http_req_duration{scenario:measure,name:${name}}`] = [`p(95)<${TARGET_P95_MS}`];
}

export const options = {
    scenarios: {
        // JITコンパイルやコネクションプールが温まるまでの計測値は判定に含めない
        warmup: { executor: 'constant-vus', vus: 1, duration: WARMUP, gracefulStop: '5s' },
        measure: { executor: 'constant-vus', vus: 1, duration: DURATION, startTime: WARMUP },
    },
    thresholds,
    summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
    return loadBoard(createApi(SCENARIO));
}

export default function (board) {
    const api = createApi(SCENARIO);

    api.getLists();
    api.searchCards();
    api.searchCards({ keyword: 'テスト' });
    api.searchCards({ priority: 'HIGH' });
    api.searchCards({ listId: pick(board.listIds) });

    // 内容を変えずに更新して、データ量を変えずに更新処理の時間だけを測る
    const card = pick(board.cards);
    api.updateCard(card.id, { title: card.title, priority: card.priority, dueDate: card.dueDate });

    // ランダムなリストのランダムな位置へ移動する。カードの総数は変わらず、各リストの件数もおおむね均等に保たれる
    api.moveCard(pick(board.cards).id, pick(board.listIds), Math.floor(Math.random() * board.cardsPerList));

    sleep(0.5);
}

export function handleSummary(data) {
    return summaryOutputs(SCENARIO, data);
}
