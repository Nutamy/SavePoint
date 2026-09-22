// Escapes MarkdownV2 special characters so user-provided text (name, phone)
// can never break Telegram's message formatting or get interpreted as markup.
function escapeMdV2(value) {
  return String(value).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function isValidPhone(phone) {
  // Loose but sane: digits, spaces, +, -, parentheses, 6-20 chars total, at least 6 digits.
  const digits = phone.replace(/\D/g, "");
  return /^[\d\s()+-]{6,20}$/.test(phone) && digits.length >= 6 && digits.length <= 15;
}

// Loose date/time sanity checks: not cryptographically strict, just enough to
// catch empty fields and obviously malformed input before it reaches Telegram.
function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}
function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ""));
}

async function checkRateLimit(env, request, bucket) {
  if (!env.RATE_LIMIT_KV) return true;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `${bucket}:${ip}`;
  const recent = await env.RATE_LIMIT_KV.get(key);
  if (recent) return false;
  await env.RATE_LIMIT_KV.put(key, "1", { expirationTtl: 30 });
  return true;
}

async function sendTelegramMessage(env, message) {
  const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const telegramResponse = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "MarkdownV2",
    }),
  });
  if (!telegramResponse.ok) {
    const errBody = await telegramResponse.text();
    console.error("Telegram API error:", errBody);
    throw new Error("Failed to send message to Telegram");
  }
}

async function handleBooking(context, data) {
  const { request, env } = context;
  const { date, time, guests, drink, note, name, phone, website, table, tableZone, tableSeats } = data;

  if (website) {
    return new Response(JSON.stringify({ success: false, error: "Invalid data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const trimmedName = String(name || "").trim().slice(0, 80);
  const trimmedPhone = String(phone || "").trim().slice(0, 20);
  const guestsNum = Math.max(1, Math.min(12, parseInt(guests, 10) || 0));

  if (trimmedName.length < 2) {
    return new Response(JSON.stringify({ success: false, error: "Invalid name" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isValidPhone(trimmedPhone)) {
    return new Response(JSON.stringify({ success: false, error: "Invalid phone" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isValidDate(date) || !isValidTime(time)) {
    return new Response(JSON.stringify({ success: false, error: "Invalid date/time" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allowed = await checkRateLimit(env, request, "booking");
  if (!allowed) {
    return new Response(JSON.stringify({ success: false, error: "Too many requests, try again in a minute" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const trimmedDrink = String(drink || "").trim().slice(0, 60);
  const trimmedNote = String(note || "").trim().slice(0, 140);
  const trimmedTable = String(table || "").trim().slice(0, 10);
  const trimmedTableZone = String(tableZone || "").trim().slice(0, 40);
  const seatsNum = parseInt(tableSeats, 10);
  const tableLine = trimmedTable
    ? `🪑 *Стол:* ${escapeMdV2(trimmedTable)}${trimmedTableZone ? ` (${escapeMdV2(trimmedTableZone)}${Number.isFinite(seatsNum) && seatsNum > 0 ? ", " + escapeMdV2(String(seatsNum)) + " мест" : ""})` : ""}\n`
    : "";

  const message =
    `📅 *НОВАЯ БРОНЬ СТОЛА \\[SAVE POINT\\]*\n\n` +
    `👤 *Имя:* ${escapeMdV2(trimmedName)}\n` +
    `📞 *Телефон:* ${escapeMdV2(trimmedPhone)}\n` +
    `🗓 *Дата:* ${escapeMdV2(date)}\n` +
    `⏰ *Время:* ${escapeMdV2(time)}\n` +
    `👥 *Гостей:* ${escapeMdV2(String(guestsNum))}\n` +
    tableLine +
    `☕ *Предзаказ:* ${trimmedDrink ? escapeMdV2(trimmedDrink) : "нет"}\n` +
    (trimmedNote ? `📝 *Комментарий:* ${escapeMdV2(trimmedNote)}\n` : "") +
    `🎁 *Промокод:* SAVEPOINT20 \\(\\-20% на первый напиток\\)\n` +
    `⚡ Статус: Ожидает подтверждения`;

  try {
    await sendTelegramMessage(env, message);
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    if (data && data.type === "booking") {
      return handleBooking(context, data);
    }

    const { name, phone, cart, total, website, comment, addons } = data;

    // Honeypot: real users never fill this hidden field. Bots that auto-fill every
    // input do. Fail quietly (same-shaped response) instead of telling bots why.
    if (website) {
      return new Response(JSON.stringify({ success: false, error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!name || !phone || !Array.isArray(cart) || cart.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const trimmedName = String(name).trim().slice(0, 80);
    const trimmedPhone = String(phone).trim().slice(0, 20);

    if (trimmedName.length < 2) {
      return new Response(JSON.stringify({ success: false, error: "Invalid name" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidPhone(trimmedPhone)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid phone" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (cart.length > 20) {
      return new Response(JSON.stringify({ success: false, error: "Cart too large" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Optional: enable Cloudflare KV-based rate limiting by creating a KV namespace
    // and binding it as RATE_LIMIT_KV in the Pages project settings. Without that
    // binding this block is skipped and the endpoint behaves as before.
    const allowed = await checkRateLimit(env, request, "order");
    if (!allowed) {
      return new Response(JSON.stringify({ success: false, error: "Too many requests, try again in a minute" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    let safeTotal = 0;
    const itemsText = cart
      .slice(0, 20)
      .map((item) => {
        const itemName = escapeMdV2(String(item.name || "").slice(0, 60));
        const qty = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));
        const price = Math.max(0, parseInt(item.price, 10) || 0);
        const lineTotal = qty * price;
        safeTotal += lineTotal;
        return `▪️ ${itemName} x${qty} — ${lineTotal} ₸`;
      })
      .join("\n");

    const trimmedComment = String(comment || "").trim().slice(0, 140);

    // Add-on modifiers (alt milk, extra shot, syrup, own-cup discount) are order-level,
    // not tied to one cart line — same fixed set the front-end offers, but re-clamped
    // here since the request body is client-controlled.
    let addonsText = "";
    if (Array.isArray(addons) && addons.length) {
      addonsText = addons
        .slice(0, 10)
        .map((a) => {
          const label = escapeMdV2(String(a.label || "").slice(0, 40));
          const price = Math.max(-2000, Math.min(5000, parseInt(a.price, 10) || 0));
          safeTotal += price;
          return `➕ ${label} (${price > 0 ? "\\+" : "\\-"}${escapeMdV2(String(Math.abs(price)))} ₸)`;
        })
        .join("\n") + "\n";
    }

    // Build the Telegram message (MarkdownV2: dynamic fields are escaped,
    // the *bold* markers are placed manually and left un-escaped).
    const message =
      `🎮 *НОВЫЙ ЗАКАЗ \\[SAVE POINT\\]*\n\n` +
      `👤 *Имя:* ${escapeMdV2(trimmedName)}\n` +
      `📞 *Телефон:* ${escapeMdV2(trimmedPhone)}\n\n` +
      `📦 *Состав заказа:*\n${itemsText}\n` +
      (addonsText ? `\n${addonsText}` : "\n") +
      (trimmedComment ? `📝 *Комментарий:* ${escapeMdV2(trimmedComment)}\n` : "") +
      `💰 *Итого к оплате:* ${escapeMdV2(String(safeTotal))} ₸\n` +
      `⚡ Статус: Ожидает выставления счёта`;

    await sendTelegramMessage(env, message);

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
