require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const LocalSession = require('telegraf-session-local');
const axios = require('axios');

// --- Configuration ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!GROQ_API_KEY || !TELEGRAM_BOT_TOKEN) {
    console.error('❌ API Keys missing');
}

// Initialize Bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Vercel read-only bo'lgani uchun sessiyani /tmp ga saqlaymiz
const localSession = new LocalSession({ database: '/tmp/sessions.json' });
bot.use(localSession.middleware());

// --- AI Handler ---
async function handleGroqChat(ctx, prompt, imageBase64 = null) {
    try {
        if (!ctx.session.history) ctx.session.history = [];
        const messages = [
            { role: "system", content: "Siz 'Antigravity Pro Code Bot' assistantisiz. O'zbek tilida javob bering." },
            ...ctx.session.history
        ];

        const currentUserMessage = { role: "user", content: [] };
        if (prompt) currentUserMessage.content.push({ type: "text", text: prompt });
        if (imageBase64) {
            currentUserMessage.content.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            });
        }
        messages.push(currentUserMessage);

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const text = response.data.choices[0].message.content;
        ctx.session.history.push({ role: "user", content: prompt || "Rasm yuborildi" });
        ctx.session.history.push({ role: "assistant", content: text });
        if (ctx.session.history.length > 10) ctx.session.history = ctx.session.history.slice(-6);

        // Split long messages
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

// Menus
const mainBtn = [['📝 Yangi suhbat', '🧠 AI Rejimi'], ['📊 Statistika', '⚙️ Sozlamalar']];
const getKeyboard = () => Markup.keyboard(mainBtn).resize();

// Bot Logic
bot.start((ctx) => ctx.reply('🚀 Antigravity Pro AI Botga xush kelibsiz!', getKeyboard()));
bot.hears(['📝 Yangi suhbat', '📝 New Chat'], (ctx) => {
    ctx.session.history = [];
    ctx.reply('✅ Suhbat tarixingiz tozalandi.');
});

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await handleGroqChat(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        await handleGroqChat(ctx, ctx.message.caption || "Rasm tahlili", base64);
    } catch (e) {
        ctx.reply('❌ Rasmni yuklashda xatolik.');
    }
});

// --- Vercel Export (Webhook) ---
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
        } else {
            res.status(200).send('Antigravity Bot is active on Vercel!');
        }
    } catch (e) {
        console.error('Webhook Error:', e);
        res.status(500).send('Error');
    }
};
