const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Xabarni aqlli bo'laklash funksiyasi ---
async function sendLongMessage(ctx, text) {
    const limit = 4000;
    if (text.length <= limit) {
        return ctx.reply(text, { parse_mode: 'Markdown' }).catch(() => ctx.reply(text));
    }

    // Xabarni bo'laklarga bo'lamiz
    const chunks = text.match(/[\s\S]{1,4000}/g) || [];
    for (const chunk of chunks) {
        // Agar birinchi yuborishda xato bo'lsa (Markdown xatosi), oddiy matn sifatida yuboramiz
        await ctx.reply(chunk, { parse_mode: 'Markdown' }).catch(async () => {
            await ctx.reply(chunk);
        });
    }
}

// --- AI Core Engine ---
async function getAIResponse(prompt, imageBase64 = null) {
    const model = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    // Professional system prompt
    const systemPrompt = "Siz 'Antigravity Pro AI' - professional Senior Developer assistanti hisoblanasiz. Vazifangiz: har qanday savol yoki rasmga asosan ENG MUKAMMAL va to'liq kodni yozib berish. Javobingiz qanchalik uzun bo'lsa ham, barcha detallarni yozing. Har doim kodlarni ``` (kod bloki) ichiga oling. O'zbek tilida javob bering.";

    const messages = [{ role: "system", content: systemPrompt }];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "Ushbu rasmni tahlil qiling va professional kodini yozing." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: model,
        messages: messages,
        max_tokens: 6000, // Maksimal uzun javob uchun
        temperature: 0.1
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 55000 // 55 soniya kutish
    });

    return response.data.choices[0].message.content;
}

// --- Bot Logic ---
bot.start((ctx) => ctx.reply('🚀 Antigravity Pro Code Bot tayyor!\n\nMenga matn yoki rasm yuboring, men Uni professional kodga aylantiraman.', Markup.keyboard([['📝 Yangi suhbat']]).resize()));

bot.hears('📝 Yangi suhbat', (ctx) => ctx.reply('🔄 Yangi suhbat boshlandi!'));

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text);
        await sendLongMessage(ctx, answer);
    } catch (e) {
        console.error('Text Error:', e.response?.data || e.message);
        ctx.reply(`❌ Xatolik: ${e.response?.data?.error?.message || e.message}`);
    }
});

bot.on('photo', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const link = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        const answer = await getAIResponse(ctx.message.caption, base64);
        await sendLongMessage(ctx, answer);
    } catch (e) {
        console.error('Photo Error:', e.response?.data || e.message);
        ctx.reply(`❌ Rasmda xatolik: ${e.response?.data?.error?.message || e.message}`);
    }
});

// Vercel Handler
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            res.status(200).send('OK');
        }
    } else {
        res.status(200).send('Bot is active and ready to code!');
    }
};
