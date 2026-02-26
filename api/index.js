const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// API Keys
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// --- AI Handler ---
async function handleGroqChat(ctx, prompt, imageBase64 = null) {
    try {
        await ctx.sendChatAction('typing');

        // Vercel serverless bo'lgani uchun tarixni vaqtinchalik xotirada ushlab turamiz
        const messages = [
            { role: "system", content: "Siz 'Antigravity Pro Code Bot' assistantisiz. O'zbek tilida javob bering." },
            { role: "user", content: [] }
        ];

        if (prompt) messages[1].content.push({ type: "text", text: prompt });
        if (imageBase64) {
            messages[1].content.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            });
        }

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const text = response.data.choices[0].message.content;

        // Xabarni bo'laklab yuborish
        const limit = 3800;
        let current = text;
        while (current.length > 0) {
            if (current.length <= limit) {
                await ctx.reply(current, { parse_mode: 'Markdown' });
                break;
            }
            let pos = current.lastIndexOf('\n', limit);
            if (pos === -1) pos = limit;
            await ctx.reply(current.substring(0, pos), { parse_mode: 'Markdown' });
            current = current.substring(pos).trim();
        }
    } catch (error) {
        console.error('Groq Error:', error.message);
        ctx.reply('❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.');
    }
}

// Bot Logic
bot.start((ctx) => ctx.reply('🚀 Antigravity Pro AI Bot Onlayn (Vercel)!', Markup.keyboard([['📝 Yangi suhbat']]).resize()));

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await handleGroqChat(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const link = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        await handleGroqChat(ctx, ctx.message.caption || "Rasm tahlili", base64);
    } catch (e) {
        ctx.reply('❌ Xatolik yuz berdi.');
    }
});

// Vercel uchun eng to'g'ri Webhook callback
module.exports = bot.webhookCallback('/api/index');
