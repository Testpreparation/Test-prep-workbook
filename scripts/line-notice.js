
const fs = require("node:fs");
const path = require("node:path");

const FIREBASE_DATABASE_URL =
  "https://test-taisaku-7e433-default-rtdb.firebaseio.com";

const LINE_CHANNEL_ACCESS_TOKEN =
  process.env.LINE_CHANNEL_ACCESS_TOKEN;

const MAX_MESSAGE_LENGTH = 5000;

const STATE_FILE = path.join(
  process.cwd(),
  "line-notice-state.json"
);

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
    const errorText = await response.text();

    throw new Error(
      `LINE一斉送信失敗: HTTP ${response.status} ${errorText}`
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
  } catch {
    throw new Error(
      "通知履歴を読み取れません。安全のため送信を停止しました。"
    );
  }

  if (
    !state ||
    !Array.isArray(state.sentIds)
  ) {
    throw new Error(
      "通知履歴の形式が正しくありません。"
    );
  }

  return {
    initialized: state.initialized === true,
    sentIds: [...new Set(state.sentIds)]
  };
}

async function main() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN が設定されていません。GitHub Secretsを確認してください。"
    );
  }

  console.log("Firebaseのお知らせを確認します。");

  const response = await fetch(
    `${FIREBASE_DATABASE_URL}/notices.json`,
    {
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Firebase取得失敗: HTTP ${response.status} ${await response.text()}`
    );
  }

  const notices = await response.json();

  const state = loadState();

  if (
    !notices ||
    typeof notices !== "object" ||
    Array.isArray(notices)
  ) {
    console.log("Firebaseにお知らせがありません。");

    if (!state.initialized) {
      state.initialized = true;
      saveState(state);
    }

    return;
  }

  const entries = Object.entries(notices).filter(
    ([id, notice]) =>
      id &&
      notice &&
      typeof notice === "object" &&
      !Array.isArray(notice)
  );

  // 初回は既存のお知らせを送らず、履歴だけ記録する
  if (!state.initialized) {
    state.initialized = true;
    state.sentIds = [
      ...new Set([
        ...state.sentIds,
        ...entries.map(([id]) => id)
      ])
    ];

    saveState(state);

    console.log(
      "初回初期化が完了しました。既存のお知らせは送信していません。"
    );

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
    console.log(
      "新しいお知らせはありません。送信をスキップします。"
    );

    return;
  }

  console.log(
    `新しいお知らせが ${newNotices.length} 件あります。`
  );

  for (const [id, notice] of newNotices) {
    const title = String(
      notice.title || "Nurse+からのお知らせ"
    );

    const content = String(notice.content || "");

    const message = `${title}\n\n${content}`.trim();

    if (!message) {
      console.log(
        `内容が空のため送信をスキップします: ${id}`
      );

      state.sentIds.push(id);
      state.sentIds = [...new Set(state.sentIds)];
      saveState(state);

      continue;
    }

    console.log(`送信対象のお知らせID: ${id}`);

    // LINE送信が成功するまで送信済みには記録しない
    await sendLine(message);

    state.sentIds.push(id);
    state.sentIds = [...new Set(state.sentIds)];

    saveState(state);

    console.log(
      `通知履歴を保存しました: ${id}`
    );
  }

  console.log("すべてのお知らせの処理が完了しました。");
}

main().catch((error) => {
  console.error(
    "LINE通知処理エラー:",
    error.message
  );

  process.exitCode = 1;
});
```
