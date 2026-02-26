const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Professional System Prompts ---
const modePrompts = {
    developer: "Siz 'Senior Full-Stack Developer'siz. Kodni Clean Code va SOLID printsiplarida yozasiz. Har bir kodga batafsil izoh berasiz.",
    designer: "Siz 'Professional UI/UX Designer'siz. Rasmlarni Tailwind yoki Modern CSS-ga o'tkazishda dizayn va ranglar uyg'unligiga e'tibor berasiz.",
    debugger: "Siz 'Expert QA Engineer'siz. Koddagi mantiqiy xatolarni topib, ularni optimallashtirish yo'llarini ko'rsatasiz.",
    general: "Siz 'Antigravity AI' - yuqori darajadagi intellektual assistantisiz."
};

// --- Smart Message Splitting (Prevents Markdown Errors) ---
async function sendSafeMessage(ctx, text) {
    const limit = 3900;
    if (text.length <= limit) {
        return ctx.reply(text, { parse_mode: 'Markdown' }).catch(() => ctx.reply(text));
    }

    const chunks = text.match(/[\s\S]{1,3900}/g) || [];
    for (const chunk of chunks) {
        // Agar bo'lakda ``` boshlanib, tugallanmagan bo'lsa, yopib qo'yamiz
        let fixedChunk = chunk;
        const codeBlockCount = (chunk.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
            fixedChunk += "\n```";
        }
        await ctx.reply(fixedChunk, { parse_mode: 'Markdown' }).catch(() => ctx.reply(fixedChunk));
    }
}

// --- AI Core Engine ---
async function getAIResponse(prompt, imageBase64 = null, mode = 'general') {
    const modelId = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";
    const systemContent = `${modePrompts[mode]} O'zbek tilida javob bering. Kodlarni doimo \`\`\` (kod bloki) ichiga oling.`;

    const messages = [{ role: "system", content: systemContent }];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "Ushbu dizaynni tahlil qil va kodini yoz." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: modelId,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.3
    }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 55000
    });

    return res.data.choices[0].message.content;
}

// --- Keyboards ---
const mainBtn = Markup.keyboard([
    ['💻 Dasturlash', '🎨 UI/UX Dizayn'],
    ['🛠 Xato tuzatish', '📊 Real-vaqt Stats'],
    ['📝 Loyiha g'oyasi', '❓ Yordam markazi']
    ]).resize();

// --- Bot Actions ---
bot.start((ctx) => {
    ctx.replyWithMarkdown('💎 *Antigravity Pro AI: Professional Full-Cycle Bot*\n\nAllohning izni bilan, barcha dasturlash va texnik muammolaringizga yechim topamiz. Boshlash uchun menyudan tanlang!', mainBtn);
});

bot.hears('💻 Dasturlash', (ctx) => ctx.reply('🚀 Dasturlash rejimi faollashdi. Kodingizni yoki vazifangizni yuboring.'));
bot.hears('🎨 UI/UX Dizayn', (ctx) => ctx.reply('🎨 Dizayn rejimi. Rasm yuborsangiz, Uni kodga o\'giraman.'));
bot.hears('🛠 Xato tuzatish', (ctx) => ctx.reply('🔍 Xato qidirish rejimi. Xatoli kodingizni yozib yuboring.'));

bot.hears('📊 Real-vaqt Stats', (ctx) => {
    ctx.reply(`📊 *Antigravity AI Statistikasi:*\n\n🔹 Model: Llama-4-Scout (Vision)\n🔹 Server: Vercel Edge\n🔹 Status: Aktiv (24/7)\n🔹 AI Qidiruv: Integratsiya qilingan\n\n_Baza ulanmoqda: 85%..._`, { parse_mode: 'Markdown' });
});

bot.hears('❓ Yordam markazi', (ctx) => {
    ctx.replyWithMarkdown(`💡 *Nimalar qila olaman?*\n\n1. **Python/JS/C++** va boshqa tillarda kod yozish.\n2. **Rasmda ko'rsatilgan** veb-saytni HTML/CSS-ga aylantirish.\n3. **Xatolarni** bir soniyada tahlil qilish.\n4. **SQL/Bash** va boshqa murakkab so'rovlarni yaratish.\n\nFaqat matn yoki rasm yuboring!`);
});

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text, null, 'developer');
        await sendSafeMessage(ctx, answer);
    } catch (e) {
        ctx.reply(`❌ Xatolik: ${e.message}`);
    }
});

bot.on('photo', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const link = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        const answer = await getAIResponse(ctx.message.caption, base64, 'designer');
        await sendSafeMessage(ctx, answer);
    } catch (e) {
        ctx.reply(`❌ Rasmda xatolik: ${e.message}`);
    }
});

// --- Vercel Export ---
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            res.status(200).send('OK');
        }
    } else {
        res.status(200).send('Antigravity Professional Bot is Alive!');
    }
};
