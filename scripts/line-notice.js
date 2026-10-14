
const fs = require("node:fs");
const path = require("node:path");

const FIREBASE_DATABASE_URL =
  "https://test-taisaku-7e433-default-rtdb.firebaseio.com";

const LINE_CHANNEL_ACCESS_TOKEN =
  process.env.LINE_CHANNEL_ACCESS_TOKEN;

const STATE_FILE = path.join(
  process.cwd(),
  "line-notice-state.json"
);

const MAX_MESSAGE_LENGTH = 5000;

async function sendLine(text) {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/broadcast",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
      },
      body: JSON.stringify({
        messages: [
          {
            type: "text",
            text: text.slice(0, MAX_MESSAGE_LENGTH)
          }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!response.ok) {
    throw new Error(
      "LINE送信失敗: HTTP " +
      response.status +
      " " +
      await response.text()
    );
  }

  console.log("LINE一斉送信に成功しました。");
}

function saveState(state) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      initialized: false,
      sentIds: []
    };
  }

  let state;

  try {
    state = JSON.parse(
      fs.readFileSync(STATE_FILE, "utf8")
    );
  } catch (error) {
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

async function main() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN が設定されていません。"
    );
  }

  console.log("Firebaseのお知らせを確認します。");

  const response = await fetch(
    FIREBASE_DATABASE_URL + "/notices.json",
    {
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!response.ok) {
    throw new Error(
      "Firebase取得失敗: HTTP " + response.status
    );
  }

  const notices = await response.json();
  const state = loadState();

  
const entries =
  notices && typeof notices === "object" && !Array.isArray(notices)
    ? Object.entries(notices).filter(
        ([id, notice]) =>
          id &&
          notice &&
          typeof notice === "object" &&
          !Array.isArray(notice) &&
          notice.published === true
      )
    : [];


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

  if (newNotices.length === 0) {
    console.log("新しいお知らせはありません。");
    return;
  }

  console.log("新しいお知らせ: " + newNotices.length + "件");

  for (const [id, notice] of newNotices) {
    const title = String(
      notice.title || "Nurse+からのお知らせ"
    );

    const content = String(notice.content || "");
    const message = (title + "\n\n" + content).trim();

    if (!message) {
      console.log("内容が空のためスキップ: " + id);
      continue;
    }

    console.log("送信対象ID: " + id);

    await sendLine(message);

    state.sentIds.push(id);
    state.sentIds = [...new Set(state.sentIds)];
    saveState(state);

    console.log("通知履歴を保存: " + id);
  }

  console.log("通知処理が完了しました。");
}

main().catch((error) => {
  console.error("LINE通知エラー:", error.message);
  process.exitCode = 1;
});
