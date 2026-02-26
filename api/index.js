const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Foydalanuvchi rejimi (Vercel-da qisqa muddat saqlanadi) ---
let userModes = {};

const modeInfo = {
    chat: {
        title: '💬 *AI Ultra Chat rejimi faol!*',
        text: 'Istagan mavzuda savol bering yoki suhbatlashing.',
        prompt: "Siz 'Super Intelligent AI'siz. Har qanday savolga aniq, mantiqiy va professional javob berasiz."
    },
    design: {
        title: '🎨 *Dizayn-to-Kod rejimi faol!*',
        text: 'Menga veb-sayt yoki mobil ilova dizayni rasmini yuboring, men Uni bir zumda kodga o\'giraman.',
        prompt: "Siz 'Expert UI/UX Designer'siz. Rasmlarni tahlil qilasiz va ularni zamonaviy CSS/HTML kodiga o'girasiz."
    },
    code: {
        title: '💻 *Senior Developer rejimi faol!*',
        text: 'Kod yozdiring, xato qidiring yoki algoritmlar bo\'yicha savol bering.',
        prompt: "Siz 'Senior Full-Stack Developer'siz. Vazifangiz: Professional darajada kod yozish va xatolarni tuzatish."
    },
    logo: {
        title: '🎨 *Logo Tahlili rejimi faol!*',
        text: 'Logotip rasmini yuboring, men uning brending tahlilini qilib beraman.',
        prompt: "Siz 'Master Logo & Brand Specialist'siz. Logolarni tahlil qilasiz va brending bo'yicha maslahat berasiz."
    }
};

const backBtn = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga Qaytish', 'main_menu')]]);

// --- Smart Message Chunking ---
async function sendProfessionalMessage(ctx, text) {
    const chunks = text.match(/[\s\S]{1,3900}/g) || [text];
    for (const chunk of chunks) {
        // Har bir bo'lakni kutib yuboramiz
        await ctx.reply(chunk, { parse_mode: 'Markdown' }).catch(() => ctx.reply(chunk));
    }
}

// --- AI Core Central ---
async function fetchAIResponse(ctx, prompt, imageBase64 = null) {
    const userId = ctx.from.id;
    // Agar foydalanuvchi rejimi aniq bo'lmasa, rasm bo'lsa 'design', aks holda 'chat'
    const mode = userModes[userId] || (imageBase64 ? 'design' : 'chat');
    const currentMode = modeInfo[mode];

    try {
        await ctx.sendChatAction('typing');
        const model = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

        const messages = [
            { role: "system", content: `${currentMode.prompt} O'zbek tilida professional javob bering.` }
        ];

        if (imageBase64) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: prompt || "Ushbu rasmni professional darajada tahlil qiling va kod yozing." },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                ]
            });
        } else {
            messages.push({ role: "user", content: prompt });
        }

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: model,
            messages: messages,
            max_tokens: 4000,
            temperature: 0.1
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 55000
        });

        // 1. AI Javobini yuborish
        await sendProfessionalMessage(ctx, res.data.choices[0].message.content);

        // 2. REJIM ESLATMASINI DARHOL YUBORISH (setTimeout-siz)
        await ctx.replyWithMarkdown(`${currentMode.title}\n\n${currentMode.text}`, backBtn);

    } catch (e) {
        console.error('Fetch Error:', e.message);
        await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.`);
        await ctx.replyWithMarkdown(currentMode.title, backBtn);
    }
}

// --- Menus ---
const mainMenuMarkup = () => Markup.inlineKeyboard([
    [Markup.button.callback('🖼 Rasm-to-Kod (Pro)', 'mode_design'), Markup.button.callback('💬 AI Chat (Ultra)', 'mode_chat')],
    [Markup.button.callback('💻 Dasturlash (Senior)', 'mode_code'), Markup.button.callback('🎨 Logo Tahlili', 'mode_logo')],
    [Markup.button.callback('📈 Statistika', 'stats')]
]);

// --- Actions ---
bot.start((ctx) => ctx.replyWithMarkdown('💎 *Antigravity Super AI Professional Markazi*\n\nXizmatlardan birini tanlang:', mainMenuMarkup()));

bot.action('main_menu', async (ctx) => {
    userModes[ctx.from.id] = 'chat';
    await ctx.answerCbQuery();
    return ctx.editMessageText('💎 *Xizmatlardan birini tanlang:*', { parse_mode: 'Markdown', ...mainMenuMarkup() });
});

bot.action('mode_design', async (ctx) => { userModes[ctx.from.id] = 'design'; await ctx.answerCbQuery(); ctx.replyWithMarkdown(modeInfo.design.title + '\n\n' + modeInfo.design.text, backBtn); });
bot.action('mode_chat', async (ctx) => { userModes[ctx.from.id] = 'chat'; await ctx.answerCbQuery(); ctx.replyWithMarkdown(modeInfo.chat.title + '\n\n' + modeInfo.chat.text, backBtn); });
bot.action('mode_code', async (ctx) => { userModes[ctx.from.id] = 'code'; await ctx.answerCbQuery(); ctx.replyWithMarkdown(modeInfo.code.title + '\n\n' + modeInfo.code.text, backBtn); });
bot.action('mode_logo', async (ctx) => { userModes[ctx.from.id] = 'logo'; await ctx.answerCbQuery(); ctx.replyWithMarkdown(modeInfo.logo.title + '\n\n' + modeInfo.logo.text, backBtn); });

bot.action('stats', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.replyWithMarkdown(`📈 *Bot Statistikasi:* \n\n✅ Holat: *Active* \n🤖 AI: *Groq Ultra* \n🚀 Server: *Vercel Edge*`, backBtn);
});

// --- Handlers ---
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await fetchAIResponse(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const link = await bot.telegram.getFileLink(photo.file_id);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(res.data).toString('base64');
        await fetchAIResponse(ctx, ctx.message.caption, base64);
    } catch (e) {
        ctx.reply('❌ Rasmni yuklashda xatolik.');
    }
});

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try { await bot.handleUpdate(req.body); res.status(200).send('OK'); } catch (err) { res.status(200).send('OK'); }
    } else { res.status(200).send('Active'); }
};
