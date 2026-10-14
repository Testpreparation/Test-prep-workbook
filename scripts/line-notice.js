const fs = require("fs");
const path = require("path");

const FIREBASE_DATABASE_URL =
"https://test-taisaku-7e433-default-rtdb.firebaseio.com";

const LINE_CHANNEL_ACCESS_TOKEN =
process.env.LINE_CHANNEL_ACCESS_TOKEN;

const LINE_TEST_USER_ID =
process.env.LINE_TEST_USER_ID;

const LINE_NOTICE_MODE =
process.env.LINE_NOTICE_MODE === "production"
? "production"
: "test";

const STATE_FILE = path.join(
process.cwd(),
"line-notice-state.json"
);

const MAX_MESSAGE_LENGTH = 5000;

async function sendLine(text) {
if (!LINE_CHANNEL_ACCESS_TOKEN) {
throw new Error(
"LINE_CHANNEL_ACCESS_TOKEN が設定されていません。"
);
}

const isProduction = LINE_NOTICE_MODE === "production";

if (!isProduction && !LINE_TEST_USER_ID) {
throw new Error(
"LINE_TEST_USER_ID が設定されていません。送信を中止します。"
);
}

const endpoint = isProduction
? "https://api.line.me/v2/bot/message/broadcast"
: "https://api.line.me/v2/bot/message/push";

const message = {
type: "text",
text: String(text).slice(0, MAX_MESSAGE_LENGTH)
};

const body = isProduction
? { messages: [message] }
: {
to: LINE_TEST_USER_ID,
messages: [message]
};

const response = await fetch(endpoint, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
},
body: JSON.stringify(body),
signal: AbortSignal.timeout(20000)
});

if (!response.ok) {
throw new Error(
"LINE送信失敗: HTTP " +
response.status +
" " +
await response.text()
);
}

console.log(
isProduction
? "LINE全員向け送信に成功しました。"
: "LINEテスト送信に成功しました（指定した1人のみ）。"
);
}

function loadState() {
if (!fs.existsSync(STATE_FILE)) {
return { initialized: false, sentIds: [] };
}

let state;

try {
state = JSON.parse(
fs.readFileSync(STATE_FILE, "utf8")
);
} catch {
throw new Error("通知履歴のJSONが壊れています。");
}

if (!state || !Array.isArray(state.sentIds)) {
throw new Error("通知履歴の形式が正しくありません。");
}

return {
initialized: state.initialized === true,
sentIds: [...new Set(state.sentIds)]
};
}

function saveState(state) {
fs.writeFileSync(
STATE_FILE,
JSON.stringify(state, null, 2) + "\n",
"utf8"
);
}

async function main() {
if (!LINE_CHANNEL_ACCESS_TOKEN) {
throw new Error(
"LINE_CHANNEL_ACCESS_TOKEN が設定されていません。"
);
}

console.log("通知モード: " + LINE_NOTICE_MODE);

// テストでは固定メッセージだけを自分に送る。
// Firebaseのお知らせと通知履歴には触れない。
if (LINE_NOTICE_MODE === "test") {
if (!LINE_TEST_USER_ID) {
throw new Error(
"LINE_TEST_USER_ID が設定されていません。送信を中止します。"
);
}

await sendLine(
  "【Nurse+ LINEテスト】\n\n" +
  "テスト通知が正常に届きました。\n" +
  "この通知はテスト用で、実際のお知らせではありません。"
);

console.log("テスト完了。通知履歴は変更していません。");
return;

}

// 本番モード
console.log("Firebaseのお知らせを確認します。");

const response = await fetch(
FIREBASE_DATABASE_URL + "/notices.json",
{ signal: AbortSignal.timeout(20000) }
);

if (!response.ok) {
throw new Error(
"Firebase取得失敗: HTTP " + response.status
);
}

const notices = await response.json();
const state = loadState();

const entries =
notices &&
typeof notices === "object" &&
!Array.isArray(notices)
? Object.entries(notices).filter(
([id, notice]) =>
id &&
notice &&
typeof notice === "object" &&
!Array.isArray(notice) &&
notice.published === true
)
: [];

// 初回は過去のお知らせを記録するだけで送信しない。
if (!state.initialized) {
state.initialized = true;
state.sentIds = [
...new Set([
...state.sentIds,
...entries.map(([id]) => id)
])
];

saveState(state);
console.log("初回初期化完了。過去のお知らせは送信しません。");
return;

}

const sentIds = new Set(state.sentIds);

const newNotices = entries
.filter(([id]) => !sentIds.has(id))
.sort(
(a, b) =>
Number(a[1].timestamp || 0) -
Number(b[1].timestamp || 0)
);

console.log("公開済みのお知らせ数: " + entries.length);
console.log("未処理のお知らせ数: " + newNotices.length);

if (newNotices.length === 0) {
console.log("新しいお知らせはありません。");
return;
}

for (const [id, notice] of newNotices) {
const title = String(
notice.title || "Nurse+からのお知らせ"
);
const content = String(notice.content || "");
const message = (title + "\n\n" + content).trim();

if (!content.trim()) {
  console.log("本文が空のため送信しません: " + id);
  continue;
}

console.log("処理対象ID: " + id);

await sendLine(message);

state.sentIds.push(id);
state.sentIds = [...new Set(state.sentIds)];
saveState(state);

console.log("処理済みIDを保存しました: " + id);

}

console.log("本番通知処理が完了しました。");
}

main().catch((error) => {
console.error("LINE通知エラー:", error.message);
process.exitCode = 1;
});
