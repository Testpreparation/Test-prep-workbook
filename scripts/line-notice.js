```javascript
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
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
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
      `LINE一斉送信失敗: HTTP ${response.status} ${await response.text()}`
    );
  }

  console.log("LINE一斉送信に成功しました。");
}

async function main() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN が設定されていません。"
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

  if (!notices || typeof notices !== "object") {
    console.log("お知らせがありません。");
    return;
  }

  let state = {
    initialized: false,
    sentIds: []
  };

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(
        fs.readFileSync(STATE_FILE, "utf8")
      );
    } catch {
      throw new Error(
        "通知履歴を読み取れません。安全のため送信を停止しました。"
      );
    }
  }

  if (!state || !Array.isArray(state.sentIds)) {
    throw new Error("通知履歴の形式が正しくありません。");
  }

  const entries = Object.entries(notices);

  // 初回は過去のお知らせを送信しない
  if (!state.initialized) {
    state.initialized = true;
    state.sentIds = [...new Set(state.sentIds)];
    saveState(state);
    console.log("初期化しました。今回は送信しません。");
    return;
  }

  const sentIds = new Set(state.sentIds);

  const newNotices = entries
    .filter(([id, notice]) =>
      !sentIds.has(id) &&
      notice &&
      typeof notice === "object"
    )
    .sort((a, b) =>
      (a[1].timestamp || 0) - (b[1].timestamp || 0)
    );

  if (newNotices.length === 0) {
    console.log("新しいお知らせはありません。");
    return;
  }

  for (const [id, notice] of newNotices) {
    const title = String(
      notice.title || "Nurse+からのお知らせ"
    );
    const content = String(notice.content || "");
    const message = `${title}\n\n${content}`;

    console.log(`送信対象: ${id}`);

    await sendLine(message);

    state.sentIds.push(id);
    state.sentIds = [...new Set(state.sentIds)];
    saveState(state);

    console.log(`送信済みとして記録: ${id}`);
  }

  console.log("通知処理が完了しました。");
}

function saveState(state) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );
}

main().catch(error => {
  console.error("LINE通知エラー:", error.message);
  process.exitCode = 1;
});
```
