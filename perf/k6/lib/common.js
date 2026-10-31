import http from 'k6/http';
import { check, fail } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';

// 非機能要件「操作時の応答が体感200ms以内」に合わせたしきい値
export const TARGET_P95_MS = Number(__ENV.TARGET_P95_MS || 200);

export const SUMMARY_TREND_STATS = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'];

let requestSeq = 0;

// バックエンドの相関IDの形式(英数字と ._-、64文字以内)に合わせる。サーバーログの requestId で突き合わせられる
function requestId(scenarioName) {
    requestSeq += 1;
    // setup() の実行中は __ITER が定義されていない
    const iter = typeof __ITER === 'undefined' ? 'setup' : __ITER;
    return `perf-${scenarioName}-${__VU}-${iter}-${requestSeq}`.slice(0, 64);
}

function params(scenarioName, name) {
    return {
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId(scenarioName) },
        tags: { name },
    };
}

function expectStatus(res, name, status) {
    check(res, { [`${name} -> ${status}`]: (r) => r.status === status });
    return res;
}

export function createApi(scenarioName) {
    return {
        getLists() {
            const name = 'GET /api/lists';
            return expectStatus(http.get(`${BASE_URL}/api/lists`, params(scenarioName, name)), name, 200);
        },
        // 絞り込み条件ごとに応答時間を分けて集計するため、指定したパラメータ名をメトリクス名に含める(例: GET /api/cards?keyword)
        searchCards(query = {}) {
            const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '');
            const name = `GET /api/cards${entries.length ? `?${entries.map(([k]) => k).join('&')}` : ''}`;
            const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            const url = `${BASE_URL}/api/cards${qs ? `?${qs}` : ''}`;
            return expectStatus(http.get(url, params(scenarioName, name)), name, 200);
        },
        // 画面の初期表示と同じく、リスト一覧とカード一覧を並行して取得する
        loadScreen() {
            const [lists, cards] = http.batch([
                ['GET', `${BASE_URL}/api/lists`, null, params(scenarioName, 'GET /api/lists')],
                ['GET', `${BASE_URL}/api/cards`, null, params(scenarioName, 'GET /api/cards')],
            ]);
            expectStatus(lists, 'GET /api/lists', 200);
            expectStatus(cards, 'GET /api/cards', 200);
            return [lists, cards];
        },
        createCard(body) {
            const name = 'POST /api/cards';
            return expectStatus(
                http.post(`${BASE_URL}/api/cards`, JSON.stringify(body), params(scenarioName, name)), name, 201);
        },
        updateCard(id, body) {
            const name = 'PATCH /api/cards/{id}';
            return expectStatus(
                http.patch(`${BASE_URL}/api/cards/${id}`, JSON.stringify(body), params(scenarioName, name)), name, 200);
        },
        moveCard(id, listId, sortOrder) {
            const name = 'PATCH /api/cards/{id}/position';
            return expectStatus(
                http.patch(`${BASE_URL}/api/cards/${id}/position`, JSON.stringify({ listId, sortOrder }),
                    params(scenarioName, name)),
                name, 200);
        },
    };
}

// 計測前にボードの状態を取得する。データが投入されていなければ中断する
export function loadBoard(api) {
    const lists = api.getLists().json();
    const cards = api.searchCards().json();
    if (!Array.isArray(lists) || lists.length === 0 || !Array.isArray(cards) || cards.length === 0) {
        fail(`No lists/cards found at ${BASE_URL}. Seed the perf database first (see perf/README.md).`);
    }
    console.log(`Board loaded: ${lists.length} lists, ${cards.length} cards (${BASE_URL})`);
    return {
        listIds: lists.map((l) => l.id),
        cards: cards.map((c) => ({ id: c.id, title: c.title, priority: c.priority, dueDate: c.dueDate })),
        cardsPerList: Math.ceil(cards.length / lists.length),
    };
}

export function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

// 結果を標準出力と perf/results/<シナリオ>-<日時>.json に出力する
export function summaryOutputs(scenarioName, data) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: false }),
        [`/results/${scenarioName}-${stamp}.json`]: JSON.stringify(data, null, 2),
    };
}
