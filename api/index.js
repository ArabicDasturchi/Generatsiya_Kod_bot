const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Professional AI Modes Configuration ---
const servicePrompts = {
    code: "Siz 'Senior Full-Stack Developer'siz. Vazifangiz: Professional darajada kod yozish, uni optimallashtirish va xatolarni tuzatish.",
    design: "Siz 'Expert UI/UX Designer'siz. Rasmlarni tahlil qilasiz va ularni zamonaviy CSS/HTML kodiga o'girasiz.",
    chat: "Siz 'Super Intelligent AI'siz. Har qanday savolga aniq, mantiqiy va professional javob berasiz.",
    logo: "Siz 'Master Logo & Brand Specialist'siz. Logolarni tahlil qilasiz va brending bo'yicha maslahat berasiz."
};

// --- Smart Message Chunking (Anti-Error) ---
async function sendProfessionalMessage(ctx, text) {
    const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
    for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' }).catch(() => ctx.reply(chunk));
    }
}

// --- AI Core Central ---
async function fetchAIResponse(ctx, prompt, imageBase64 = null, mode = 'chat') {
    try {
        await ctx.sendChatAction('typing');
        const model = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

        const messages = [
            { role: "system", content: `${servicePrompts[mode]} O'zbek tilida, professional stilda javob bering.` }
        ];

        if (imageBase64) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: prompt || "Ushbu rasmni professional darajada tahlil qiling." },
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
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
            timeout: 50000
        });

        await sendProfessionalMessage(ctx, res.data.choices[0].message.content);
    } catch (e) {
        ctx.reply(`❌ Xatolik: ${e.response?.data?.error?.message || e.message}`);
    }
}

// --- Professional Menus ---
const mainMenu = () => Markup.inlineKeyboard([
    [Markup.button.callback('🖼 Rasm-to-Kod (Pro)', 'mode_design'), Markup.button.callback('💬 AI Chat (Ultra)', 'mode_chat')],
    [Markup.button.callback('💻 Dasturlash (Senior)', 'mode_code'), Markup.button.callback('🎨 Logo Tahlili', 'mode_logo')],
    [Markup.button.callback('📈 Statistika', 'stats'), Markup.button.callback('⚙️ Sozlamalar', 'settings')]
]);

const backButton = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga Qaytish', 'main_menu')]]);

// --- Bot Logic ---
bot.start((ctx) => {
    ctx.replyWithMarkdown('💎 *Antigravity Super AI Professional Markaziga xush kelibsiz!* \n\nUshbu bot Allohning izni bilan har qanday murakkablikdagi IT vazifalarni bajara oladi. \n\n👇 *Davom etish uchun quyidagi xizmatlardan birini tanlang:*', mainMenu());
});

// --- Callback Actions (Tugmalar uchun javoblar) ---
bot.action('main_menu', (ctx) => ctx.editMessageText('💎 *Xizmatlardan birini tanlang:* \n\nSizga qanday yordam bera olaman?', { parse_mode: 'Markdown', ...mainMenu() }));

bot.action('mode_design', (ctx) => ctx.reply('🎨 *Dizayn-to-Kod rejimi faol!* \n\nMenga veb-sayt yoki mobil ilova dizayni rasmini yuboring, men Uni bir zumda kodga o\'giraman.', backButton));
bot.action('mode_chat', (ctx) => ctx.reply('💬 *AI Ultra Chat rejimi faol!* \n\nIstagan mavzuda savol bering yoki suhbatlashing.', backButton));
bot.action('mode_code', (ctx) => ctx.reply('💻 *Senior Developer rejimi faol!* \n\nKod yozdiring, xato qidiring yoki algoritmlar bo\'yicha savol bering.', backButton));
bot.action('mode_logo', (ctx) => ctx.reply('🎨 *Logo Tahlili rejimi faol!* \n\nLogotip rasmini yuboring, men uning brending tahlilini qilib beraman.', backButton));

bot.action('stats', (ctx) => ctx.replyWithMarkdown(`📈 *Global Bot Statistikasi:* \n\n✅ Holat: *Barqaror (Onlayn)* \n🤖 AI Platforma: *Groq Ultra* \n🚀 Server: *Vercel Cloud* \n🌎 Lokatsiya: *Global* \n🔥 Imkoniyat: *Cheksiz*`, backButton));

bot.action('settings', (ctx) => ctx.reply('⚙️ *Sozlamalar:* \n\nTil sozlamalari va AI tezligi keyingi bosqichda faollashtiriladi.', backButton));

// --- Global Handlers ---
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await fetchAIResponse(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const link = await bot.telegram.getFileLink(photo.file_id);
    const res = await axios.get(link.href, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(res.data).toString('base64');
    // Rasmni tahlil qilish uchun har doim design rejimiga o'tkaziladi
    await fetchAIResponse(ctx, ctx.message.caption, base64, 'design');
});

// --- Vercel Export ---
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) { res.status(200).send('OK'); }
    } else {
        res.status(200).send('Antigravity Pro AI is READY!');
    }
};
