const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// AI Handler
async function getAIResponse(prompt, imageBase64 = null) {
    const messages = [
        { role: "system", content: "Siz 'Antigravity Pro' assistantisiz. O'zbek tilida javob bering." },
        { role: "user", content: prompt }
    ];

    const model = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    const payload = {
        model: model,
        messages: [{
            role: "user",
            content: imageBase64 ? [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ] : prompt
        }]
    };

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
    });

    return response.data.choices[0].message.content;
}

bot.start((ctx) => ctx.reply('🚀 Antigravity Bot yaqin! Menga biror narsa yozing.'));

bot.on('text', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text);
        await ctx.reply(answer, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('Text AI Error:', e.response?.data || e.message);
        await ctx.reply('❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.');
    }
});

bot.on('photo', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const link = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        const answer = await getAIResponse(ctx.message.caption || "Ushbu rasmni tahlil qil.", base64);
        await ctx.reply(answer, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('Photo AI Error:', e.response?.data || e.message);
        await ctx.reply('❌ Rasmni tahlil qilishda xato.');
    }
});

// Vercel talab qilgan Webhook eksporti
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            console.error('HandleUpdate Error:', err);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('Antigravity Bot is active!');
    }
};
