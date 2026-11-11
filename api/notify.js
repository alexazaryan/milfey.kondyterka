// Отправка уведомлений в Telegram-бот магазина.
// Токен и ID чата берутся из настроек Vercel: TG_TOKEN и TG_CHAT_ID — в коде их нет.
// Сюда пишет сайт (заказы из корзины, «Співпраця») и AI-ассистент AzaCode (заказы через чат).
module.exports = async (req, res) => {
   if (req.method !== "POST") return res.status(405).json({ ok: false });
   const token = process.env.TG_TOKEN;
   const chat = process.env.TG_CHAT_ID;
   if (!token || !chat) return res.status(500).json({ ok: false, error: "not configured" });

   let body = req.body;
   if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
   }
   const text = String((body && body.text) || "").slice(0, 3900);
   if (!text.trim()) return res.status(400).json({ ok: false });

   try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      const data = await r.json().catch(() => ({}));
      return res.status(data.ok ? 200 : 502).json({ ok: Boolean(data.ok) });
   } catch (e) {
      return res.status(502).json({ ok: false });
   }
};
