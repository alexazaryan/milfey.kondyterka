const TELEGRAM_BOT_TOKEN = "8914645879:AAHCICqcSAqlkbsIib6iSIV2KBbbe9CZFos";
const TELEGRAM_CHAT_ID = "333932386";

async function sendTelegramNotification(fields, projectName = "Сайт") {
   const lines = Object.entries(fields)
      .map(([key, val]) => `<b>${key}:</b> ${val}`)
      .join("\n");
   const text = `🔔 <b>${projectName}</b>\n━━━━━━━━━━━━\n${lines}`;
   try {
      const res = await fetch(
         `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
         {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               chat_id: TELEGRAM_CHAT_ID,
               text,
               parse_mode: "HTML",
            }),
         },
      );
      const data = await res.json();
      return data.ok;
   } catch (err) {
      return false;
   }
}
