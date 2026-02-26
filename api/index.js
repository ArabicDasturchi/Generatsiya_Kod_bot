const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function getAIResponse(prompt, imageBase64 = null) {
    const modelId = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    // Professional system prompt
    const systemPrompt = "Siz 'Antigravity Pro Code Bot' - professional dasturchi assistanti hisoblanasiz. Vazifangiz: foydalanuvchi yuborgan har qanday rasm (UI/UX dizayn, sxema yoki logo) yoki matnli so'rovga asosan professional, toza va chiroyli kod (HTML, CSS, JS, Python va h.k.) yozib berish. Agar rasm yuborilsa, uni diqqat bilan tahlil qiling va aynan shu dizaynni kodingizda (masalan, Tailwind CSS yoki vanila CSS bilan) qayta yarating. Har doim kod bloklaridan foydalaning. O'zbek tilida javob bering.";

    const messages = [
        { role: "system", content: systemPrompt }
    ];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "Ushbu rasmdagi dizaynni tahlil qiling va uni professional kod (HTML/CSS/JS) ko'rinishida yozib bering. Dizayn maksimal darajada chiroyli va zamonaviy bo'lsin." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: modelId,
        messages: messages,
        max_tokens: 4000, // Kod uchun ko'proq token kerak
        temperature: 0.1 // Aniqlik uchun
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 45000
    });

    return response.data.choices[0].message.content;
}

bot.start((ctx) => ctx.reply('🚀 Antigravity Pro Code Bot tayyor!\n\nMenga rasm yoki matnli vazifa yuboring, men uni professional kodga aylantiraman.'));

bot.on('text', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text);
        const chunks = answer.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
    } catch (e) {
        await ctx.reply(`❌ Xatolik: ${e.response?.data?.error?.message || e.message}`);
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
        const chunks = answer.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
    } catch (e) {
        await ctx.reply(`❌ Rasm tahlilida xato: ${e.response?.data?.error?.message || e.message}`);
    }
});

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            res.status(200).send('OK');
        }
    } else {
        res.status(200).send('Ready to code!');
    }
};
