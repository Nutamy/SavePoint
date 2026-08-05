export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();
    const { name, phone, cart, total } = data;

    if (!name || !phone || !cart || cart.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Формируем красивое сообщение для Telegram
    let itemsText = cart.map(item => `▪️ ${item.name} x${item.qty} — ${item.price * item.qty} ₸`).join("\n");
    
    const message = 
      `🎮 **НОВЫЙ ЗАКАЗ [SAVE POINT]**\n\n` +
      `👤 **Имя:** ${name}\n` +
      `📞 **Телефон:** ${phone}\n\n` +
      `📦 **Состав заказа:**\n${itemsText}\n\n` +
      `💰 **Итого к оплате:** ${total} ₸\n` +
      `⚡ Статус: Ожидает выставления счёта`;

    // Отправка в Telegram API
    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      }),
    });

    if (!telegramResponse.ok) {
      throw new Error("Failed to send message to Telegram");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}