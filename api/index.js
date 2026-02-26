const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Vaqtinchalik sessiya (Vercel warm-up vaqtida ishlaydi) ---
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

const backButton = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga Qaytish', 'main_menu')]]);

// --- Smart Message Chunking ---
async function sendProfessionalMessage(ctx, text) {
    const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
    for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' }).catch(() => ctx.reply(chunk));
    }
}

// --- AI Core Central ---
async function fetchAIResponse(ctx, prompt, imageBase64 = null) {
    const userId = ctx.from.id;
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
                    { type: "text", text: prompt || "Ushbu rasmni tahlil qiling." },
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
            temperature: 0.2
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
            timeout: 55000
        });

        await sendProfessionalMessage(ctx, res.data.choices[0].message.content);

        // --- Avtomatik ravishda rejim ma'lumotlarini qayta ko'rsatish ---
        setTimeout(async () => {
            await ctx.replyWithMarkdown(`${currentMode.title}\n\n${currentMode.text}`, backButton);
        }, 500);

    } catch (e) {
        ctx.reply(`❌ Xatolik: ${e.message}`);
    }
}

// --- Menus ---
const mainMenu = () => Markup.inlineKeyboard([
    [Markup.button.callback('🖼 Rasm-to-Kod (Pro)', 'mode_design'), Markup.button.callback('💬 AI Chat (Ultra)', 'mode_chat')],
    [Markup.button.callback('💻 Dasturlash (Senior)', 'mode_code'), Markup.button.callback('🎨 Logo Tahlili', 'mode_logo')],
    [Markup.button.callback('📈 Statistika', 'stats')]
]);

// --- Core Actions ---
bot.start((ctx) => ctx.replyWithMarkdown('💎 *Antigravity Super AI Professional Markazi*\n\nXizmatlardan birini tanlang:', mainMenu()));

bot.action('main_menu', (ctx) => {
    userModes[ctx.from.id] = 'chat'; // Reset mode
    return ctx.editMessageText('💎 *Xizmatlardan birini tanlang:*', { parse_mode: 'Markdown', ...mainMenu() });
});

// Rejimlarni o'rnatish
bot.action('mode_design', (ctx) => { userModes[ctx.from.id] = 'design'; ctx.replyWithMarkdown(modeInfo.design.title + '\n\n' + modeInfo.design.text, backButton); });
bot.action('mode_chat', (ctx) => { userModes[ctx.from.id] = 'chat'; ctx.replyWithMarkdown(modeInfo.chat.title + '\n\n' + modeInfo.chat.text, backButton); });
bot.action('mode_code', (ctx) => { userModes[ctx.from.id] = 'code'; ctx.replyWithMarkdown(modeInfo.code.title + '\n\n' + modeInfo.code.text, backButton); });
bot.action('mode_logo', (ctx) => { userModes[ctx.from.id] = 'logo'; ctx.replyWithMarkdown(modeInfo.logo.title + '\n\n' + modeInfo.logo.text, backButton); });

bot.action('stats', (ctx) => ctx.replyWithMarkdown(`📈 *Global Bot Statistikasi:* \n\n✅ Holat: *Barqaror* \n🤖 AI Platforma: *Groq Ultra* \n🚀 Server: *Vercel Cloud*`, backButton));

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await fetchAIResponse(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const link = await bot.telegram.getFileLink(photo.file_id);
    const res = await axios.get(link.href, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(res.data).toString('base64');
    await fetchAIResponse(ctx, ctx.message.caption, base64);
});

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try { await bot.handleUpdate(req.body); res.status(200).send('OK'); } catch (err) { res.status(200).send('OK'); }
    } else { res.status(200).send('Antigravity Pro is READY!'); }
};
