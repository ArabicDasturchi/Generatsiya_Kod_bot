const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Professional System Prompt ---
const getSystemPrompt = (mode = 'general') => {
    const prompts = {
        developer: "Siz 'Senior Full-Stack Developer'siz. Clean Code, SOLID printsiplari va eng yuqori performansli kod yozasiz. Har bir qatorga izoh bera olasiz.",
        designer: "Siz 'Expert UI/UX Designer'siz. Rasmlarni Tailwind CSS yoki Modern CSS-ga o'girishda eng chiroyli dizaynlarni tanlaysiz.",
        debugger: "Siz 'Senior QA / Debugger'siz. Sizga berilgan koddagi xatolarni topasiz va ularni tuzatib, nima uchun bunday bo'lganini tushuntirasiz.",
        general: "Siz 'Antigravity Super AI' - hamma narsani biladigan yordamchisiz. Bilimingiz cheksiz, javoblaringiz aniq va professional."
    };
    return `${prompts[mode]} O'zbek tilida, do'stona va professional tilda javob bering.`;
};

// --- AI Engine ---
async function getAIResponse(prompt, imageBase64 = null, mode = 'developer') {
    const modelId = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    const messages = [{ role: "system", content: getSystemPrompt(mode) }];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "Ushbu rasmga qarab professional kod yozing." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: modelId,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.2
    }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 50000
    });

    return response.data.choices[0].message.content;
}

// --- Menus ---
const mainKeyboard = Markup.keyboard([
    ['💻 Dasturlash', '🎨 Dizayn'],
    ['📊 Statistika', '❓ Yordam']
]).resize();

const settingsMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🛠 Rejimni o\'zgartirish', 'change_mode')],
    [Markup.button.callback('🗑 Tarixni tozalash', 'clear_history')]
]);

// --- Bot Logic ---
bot.start((ctx) => {
    ctx.reply('💎 *Antigravity Pro AI Bot* ga xush kelibsiz!\n\nMen nafaqat kod yozaman, balki dizaynlarni hayotga tatbiq etaman va muammolaringizga professional yechim beraman.', {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

bot.hears('📊 Statistika', (ctx) => {
    ctx.reply('📈 *Bot Statistikasi (Global):*\n\n✅ Xolat: Onlayn\n🤖 AI Modellari: Llama 4 Scout & 3.3 Versatile\n🚀 Tezlik: 0.8s - 3.5s\n\n_Eslatma: Shaxsiy statistika saqlanishi uchun ma\'lumotlar bazasi ulanmoqda..._', { parse_mode: 'Markdown' });
});

bot.hears('❓ Yordam', (ctx) => {
    ctx.reply(`💡 *Antigravity Pro AI imkoniyatlari:*
    
1. **Rasm-to-Kod**: Har qanday dizaynni bir zumda HTML/CSS-ga o'tkazish.
2. **Xato tuzatish**: Kodingizni yuboring, xatosini topib beraman.
3. **Logo Creator Guidance**: Logolar va UI/UX bo'yicha maslahatlar.
4. **Clean Code**: Sifatli kod yozish va arxitektura qurish.

Shunchaki rasm yoki matn yuboring!`, { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text, null, 'developer');
        const chunks = answer.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
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
        const chunks = answer.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
    } catch (e) {
        ctx.reply(`❌ Rasm tahlilida xato: ${e.message}`);
    }
});

// --- Vercel Handler ---
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            res.status(200).send('OK');
        }
    } else {
        res.status(200).send('Super Bot is ready!');
    }
};
