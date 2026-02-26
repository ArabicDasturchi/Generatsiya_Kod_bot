const { Telegraf } = require('telegraf');
const axios = require('axios');

// API Kalitlari (Vercel Settings'da bo'lishi shart)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// AI Handler funksiyasi
async function handleGroqChat(ctx, prompt, imageBase64 = null) {
    try {
        await ctx.sendChatAction('typing');

        const messages = [
            { role: "system", content: "Siz 'Antigravity Pro Code Bot' assistantisiz. O'zbek tilida javob bering." }
        ];

        const userMsg = { role: "user", content: [] };
        if (prompt) userMsg.content.push({ type: "text", text: prompt });
        if (imageBase64) {
            userMsg.content.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            });
        }
        messages.push(userMsg);

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const text = response.data.choices[0].message.content;

        // Telegram 4096 belgi chegarasini hisobga olgan holda yuborish
        const chunks = text.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('Groq Error:', error.response?.data || error.message);
        await ctx.reply('❌ Xatolik yuz berdi. Iltimos, birozdan so\'ng urinib ko\'ring.');
    }
}

// Bot Buyruqlari
bot.start((ctx) => ctx.reply('🚀 Antigravity Pro Code Bot Vercel-da ishlamoqda! Menga matn yoki rasm yuboring.'));

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
        await ctx.reply('❌ Rasmni qayta ishlashda xatolik yuz berdi.');
    }
});

// Vercel talab qilgan Handler
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
        } else {
            res.status(200).send('Bot is active and healthy!');
        }
    } catch (error) {
        console.error('Vercel Webhook Error:', error);
        res.status(500).send('Internal Server Error');
    }
};
