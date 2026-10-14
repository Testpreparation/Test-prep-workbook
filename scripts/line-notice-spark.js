
const fs = require("node:fs");
const path = require("node:path");

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL || ""
).trim().replace(/\/+$/, "");

const STATE_PATH = path.join(
  process.cwd(),
  "line-notice-state.json"
);

const MAX_TEXT_LENGTH = 5000;

function validateConfig() {
  if (!TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing.");
  }

  if (!FIREBASE_URL) {
    throw new Error("FIREBASE_DATABASE_URL is missing.");
  }

  if (process.env.LINE_NOTICE_MODE !== "production") {
    throw new Error("Production mode is not enabled.");
  }
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { initialized: false, sentIds: [] };
  }

  let state;

  try {
    state = JSON.parse(
      fs.readFileSync(STATE_PATH, "utf8")
    );
  } catch {
    throw new Error(
      "line-notice-state.json is invalid JSON. No messages were sent."
    );
  }

  if (!state || !Array.isArray(state.sentIds)) {
    throw new Error(
      "Notification history must contain a sentIds array."
    );
  }

  return {
    initialized: state.initialized === true,
    sentIds: [...new Set(state.sentIds.map(String))]
  };
}

function writeState(state) {
  const temporaryPath = STATE_PATH + ".tmp";

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );

  fs.renameSync(temporaryPath, STATE_PATH);
}

async function getPublishedNotices() {
  const response = await fetch(
    `${FIREBASE_URL}/notices.json`,
    { signal: AbortSignal.timeout(20000) }
  );

  console.log("Firebase HTTP status:", response.status);

  if (!response.ok) {
    throw new Error(
      `Firebase request failed: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (data === null) return [];

  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      "Unexpected Firebase notices data structure."
    );
  }

  return Object.entries(data).filter(([id, notice]) =>
    Boolean(id) &&
    notice &&
    typeof notice === "object" &&
    !Array.isArray(notice) &&
    (
      notice.published === true ||
      notice.isPublished === true ||
      notice.status === "published"
    )
  );
}

function makeMessage(notice) {
  const title = String(
    notice.title || "Nurse+からのお知らせ"
  ).trim();

  const content = String(
    notice.content ||
    notice.body ||
    notice.message ||
    notice.text ||
    ""
  ).trim();

  if (!content) return "";

  return `${title}\n\n${content}`.slice(
    0,
    MAX_TEXT_LENGTH
  );
}

async function broadcast(message) {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/broadcast",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        messages: [
          { type: "text", text: message }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    }
  );

  console.log("LINE broadcast HTTP status:", response.status);

  if (!response.ok) {
    const details = (
      await response.text()
    ).slice(0, 500);

    throw new Error(
      `LINE broadcast failed: HTTP ${response.status}. ${details}`
    );
  }
}

async function main() {
  validateConfig();

  console.log("NURSEPLUS_LINE_SPARK_STARTED");
  console.log("UTC:", new Date().toISOString());

  const notices = await getPublishedNotices();
  const state = readState();

  console.log("Published notices:", notices.length);
  console.log("Previously processed IDs:", state.sentIds.length);

  // 初回は過去のお知らせを送信せず、履歴に登録します。
  if (!state.initialized) {
    state.sentIds = [
      ...new Set([
        ...state.sentIds,
        ...notices.map(([id]) => id)
      ])
    ];

    state.initialized = true;
    writeState(state);

    console.log(
      "History initialized; existing notices were not sent."
    );
    return;
  }

  const sentIds = new Set(state.sentIds);

  const pending = notices
    .filter(([id]) => !sentIds.has(id))
    .sort((a, b) =>
      Number(a[1].timestamp || 0) -
      Number(b[1].timestamp || 0)
    );

  console.log("New notices:", pending.length);

  for (const [id, notice] of pending) {
    const message = makeMessage(notice);

    if (!message) {
      console.log(
        `Notice ${id} skipped: no message content.`
      );

      state.sentIds = [
        ...new Set([...state.sentIds, id])
      ];
      writeState(state);
      continue;
    }

    console.log("Sending notice ID:", id);

    await broadcast(message);

    // LINE送信成功後に履歴を更新します。
    state.sentIds = [
      ...new Set([...state.sentIds, id])
    ];

    writeState(state);

    console.log(`Notice ${id} sent and history saved.`);
  }

  console.log("LINE notice processing finished.");
}

main().catch((error) => {
  console.error(
    "LINE_NOTICE_FATAL:",
    error?.message || String(error)
  );
  process.exitCode = 1;
});
