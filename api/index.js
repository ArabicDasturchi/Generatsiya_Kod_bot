const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function getAIResponse(prompt, imageBase64 = null) {
    // Modelni tanlash
    const modelId = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    // Xabar strukturasini yaratish
    const messages = [
        { role: "system", content: "Siz 'Antigravity Pro' assistantisiz. O'zbek tilida javob bering." }
    ];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: modelId,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 25000 // 25 soniya kutish
    });

    return response.data.choices[0].message.content;
}

bot.start((ctx) => ctx.reply('🚀 Antigravity Bot Tayyor! Menga nimadir yozing.'));

bot.on('text', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text);
        await ctx.reply(answer, { parse_mode: 'Markdown' });
    } catch (e) {
        const errorMsg = e.response?.data?.error?.message || e.message;
        console.error('Groq Text Error:', errorMsg);
        await ctx.reply(`❌ Xatolik: ${errorMsg}`);
    }
});

bot.on('photo', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const link = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        const answer = await getAIResponse(ctx.message.caption || "Rasmni tahlil qil.", base64);
        await ctx.reply(answer, { parse_mode: 'Markdown' });
    } catch (e) {
        const errorMsg = e.response?.data?.error?.message || e.message;
        console.error('Groq Photo Error:', errorMsg);
        await ctx.reply(`❌ Rasmda xato: ${errorMsg}`);
    }
});

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            console.error('Update Error:', err);
            res.status(200).send('OK'); // Telegramga 200 qaytarish kerak, yo'qsa qayta-qayta yuboraveradi
        }
    } else {
        res.status(200).send('Antigravity Bot is active!');
    }
};
