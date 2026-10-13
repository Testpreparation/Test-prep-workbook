
const fs = require("node:fs");
const path = require("node:path");

const FIREBASE_DATABASE_URL =
  "https://test-taisaku-7e433-default-rtdb.firebaseio.com";

const LINE_CHANNEL_ACCESS_TOKEN =
  process.env.LINE_CHANNEL_ACCESS_TOKEN;

const LINE_TEST_USER_ID = process.env.LINE_TEST_USER_ID;

const STATE_FILE = path.join(process.cwd(), "line-notice-state.json");
const MAX_MESSAGE_LENGTH = 4500;

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { initialized: false, sentIds: [] };
  }

  const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));

  return {
    initialized: data.initialized === true,
    sentIds: Array.isArray(data.sentIds) ? data.sentIds : []
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

async function getNotices() {
  const response = await fetch(`${FIREBASE_DATABASE_URL}/notices.json`, {
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`Firebase取得失敗: HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data === null) return [];
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Firebaseのお知らせ形式が不正です。");
  }

  return Object.entries(data)
    .filter(([, value]) =>
      value && typeof value === "object" && !Array.isArray(value)
    )
    .map(([id, value]) => ({
      id,
      title: String(value.title || "Nurse+のお知らせ"),
      content: String(value.content || ""),
      timestamp: Number(value.timestamp) || 0
    }))
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

async function sendLine(text) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: LINE_TEST_USER_ID,
      messages: [{ type: "text", text: text.slice(0, MAX_MESSAGE_LENGTH) }]
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`LINE送信失敗: HTTP ${response.status} ${await response.text()}`);
  }
}

async function main() {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_TEST_USER_ID) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN と LINE_TEST_USER_ID をGitHub Secretsに設定してください。"
    );
  }

  const notices = await getNotices();
  const state = readState();

  console.log(`Firebaseのお知らせ: ${notices.length}件`);

  if (!state.initialized) {
    state.sentIds = notices.map((notice) => notice.id);
    state.initialized = true;
    saveState(state);
    console.log("初回基準を保存しました。次回から新着を通知します。");
    return;
  }

  const sentIds = new Set(state.sentIds);

  for (const notice of notices) {
    if (sentIds.has(notice.id)) continue;

    const message =
      `【Nurse+ 新着お知らせ】\n\n${notice.title}\n\n` +
      `${notice.content}\n\nNurse+を確認してください。`;

    await sendLine(message);

    sentIds.add(notice.id);
    state.sentIds = [...sentIds];
    saveState(state);

    console.log(`通知成功: ${notice.id}`);
  }

  console.log("確認完了");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
