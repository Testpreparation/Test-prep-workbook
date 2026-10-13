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
}
