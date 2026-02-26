const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// AI Funksiyasi
async function getAIResponse(prompt, imageBase64 = null) {
    // Eng barqaror modellar
    const model = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

    const messages = [
        { role: "system", content: "Siz 'Antigravity AI' dasturchi assistanti. O'zbek tilida, kodlar bilan javob bering." }
    ];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "Ushbu rasmni tahlil qiling va kod yozing." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: model,
        messages: messages,
        max_tokens: 3000,
        temperature: 0.2
    }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 30000
    });

    return response.data.choices[0].message.content;
}

// Bot Buyruqlari
bot.start((ctx) => ctx.reply('🚀 Antigravity Super AI Onlayn!\n\nMenga matn yoki rasm yuboring.', Markup.keyboard([['📝 Yangi suhbat', '📊 Statistika']]).resize()));

bot.hears('📊 Statistika', (ctx) => ctx.reply('📈 Bot holati: Aktiv 24/7\n🚀 Platforma: Vercel Cloud'));
bot.hears('📝 Yangi suhbat', (ctx) => ctx.reply('🔄 Yangi suhbat boshlandi!'));

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text);
        // Oddiy HTML javob sifatida yuboramiz (Markdown xatolik bermasligi uchun)
        await ctx.reply(answer).catch(() => ctx.reply(answer.substring(0, 4000)));
    } catch (e) {
        console.error(e);
        ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
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
        await ctx.reply(answer);
    } catch (e) {
        ctx.reply('❌ Rasm tahlilida xatolik.');
    }
});

// Vercel uchun yagona Handler
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            console.error(err);
            res.status(200).send('OK');
        }
    } else {
        res.status(200).send('Bot is running perfectly!');
    }
};
