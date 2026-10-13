
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

const MAX_MESSAGE_LENGTH = 4500;

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { initialized: false, sentIds: [] };
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(STATE_FILE, "utf8")
    );

    return {
      initialized: parsed.initialized === true,
      sentIds: Array.isArray(parsed.sentIds)
        ? parsed.sentIds.filter((id) => typeof id === "string")
        : []
    };
  } catch (error) {
    throw new Error(
      "通知状態ファイルを読み取れません。JSONを確認してください。"
    );
  }
}

function saveState(state) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );
}

async function getFirebaseNotices() {
  const url = `${FIREBASE_DATABASE_URL}/notices.json`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(
      `Firebaseの取得に失敗しました: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (data === null) {
    return [];
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Firebaseのお知らせデータの形式が不正です。");
  }

  return Object.entries(data)
    .filter(([id, notice]) =>
      typeof id === "string" &&
      notice !== null &&
      typeof notice === "object" &&
      !Array.isArray(notice)
    )
    .map(([id, notice]) => ({
      id,
      title: String(notice.title || "Nurse+のお知らせ"),
      content: String(notice.content || ""),
      timestamp: notice.timestamp ?? null
    }))
    .sort((a, b) => {
      const timeA = Number(a.timestamp) || 0;
      const timeB = Number(b.timestamp) || 0;
      return timeA - timeB || a.id.localeCompare(b.id);
    });
}

async function sendLineMessage(text) {
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
    const details = await response.text();

    throw new Error(
      `LINE送信に失敗しました: HTTP ${response.status} ${details}`
    );
  }
}

function formatNotice(notice) {
  const text =
    `【Nurse+ 新着お知らせ】\n\n` +
    `${notice.title}\n\n` +
    `${notice.content}\n\n` +
    `Nurse+を確認してください。`;

  return text.slice(0, MAX_MESSAGE_LENGTH);
}

async function main() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN がGitHub Secretsに設定されていません。"
    );
  }

  console.log("Firebaseのお知らせを確認しています。");

  const notices = await getFirebaseNotices();
  const state = readState();

  console.log(`お知らせ件数: ${notices.length}`);

  // 初回は既存のお知らせを記録するだけにして、
  // 過去のお知らせが大量送信されるのを防ぐ。
  if (!state.initialized) {
    state.sentIds = notices.map((notice) => notice.id);
    state.initialized = true;
    saveState(state);

    console.log(
      "初回の基準を記録しました。次回から新着を通知します。"
    );
    return;
  }

  const sentIds = new Set(state.sentIds);
  const newNotices = notices.filter(
    (notice) => !sentIds.has(notice.id)
  );

  if (newNotices.length === 0) {
    console.log("新着のお知らせはありません。");
    return;
  }

  console.log(`新着のお知らせ: ${newNotices.length}件`);

  for (const notice of newNotices) {
    const message = formatNotice(notice);

    await sendLineMessage(message);

    // 送信成功後にだけ通知済みとして記録する。
    sentIds.add(notice.id);
    state.sentIds = [...sentIds];
    saveState(state);

    console.log(`通知成功: ${notice.id}`);
  }

  console.log("新着お知らせの通知が完了しました。");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
