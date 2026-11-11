// Уведомления в Telegram. Токен и ID чата больше не в коде — они в настройках Vercel
// (TG_TOKEN, TG_CHAT_ID), а сайт отправляет текст в свою функцию /api/notify.
async function sendTelegramNotification(fields, projectName = "Сайт") {
   const lines = Object.entries(fields)
      .map(([key, val]) => `<b>${key}:</b> ${val}`)
      .join("\n");
   const text = `🔔 <b>${projectName}</b>\n━━━━━━━━━━━━\n${lines}`;
   try {
      const res = await fetch("/api/notify", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ text }),
      });
      const data = await res.json();
      return data.ok;
   } catch (err) {
      return false;
   }
}
