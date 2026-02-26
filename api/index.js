const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- Professional System Prompts ---
const getSystemPrompt = (mode = 'general') => {
    const modes = {
        developer: "Siz 'Senior Full-Stack Developer'siz. Clean Code, SOLID va mantiqiy mukammallik bo'yicha mutaxassissiz.",
        designer: "Siz 'Expert UI/UX Designer'siz. Har qanday rasmni Tailwind CSS yoki CSS-ga o'tkazishda dizayn va ranglar uyg'unligini eng ustuvor deb bilasiz.",
        debugger: "Siz 'Senior QA Engineer'siz. Sizga berilgan koddagi xatolarni topib, uni xavfsiz va tezkor qiluvchi yechimlarni berasiz.",
        general: "Siz 'Antigravity Super AI' - hamma narsani biladigan va aniq yordam beradigan intellektual assistansiz."
    };
    return `${modes[mode]} Javobingizni har doim o'zbek tilida, chiroyli va professional tarzda bering. Kodlarni \`\`\` (kod bloki) ichiga oling.`;
};

// --- Smart Message Delivery (Prevents Errors) ---
async function sendSmartMessage(ctx, text) {
    const limit = 4000;
    if (text.length <= limit) {
        return ctx.reply(text, { parse_mode: 'Markdown' }).catch(() => ctx.reply(text));
    }
    const chunks = text.match(/[\s\S]{1,4000}/g) || [];
    for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' }).catch(() => ctx.reply(chunk));
    }
}

// --- AI Core Engine ---
async function getAIResponse(prompt, imageBase64 = null, mode = 'general') {
    const model = imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    const messages = [{ role: "system", content: getSystemPrompt(mode) }];

    if (imageBase64) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "Ushbu rasmni tahlil qil va professional kod yoz." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: model,
        messages: messages,
        max_tokens: 4500,
        temperature: 0.2
    }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 55000
    });

    return response.data.choices[0].message.content;
}

// --- Professional Keyboards ---
const mainKeyboard = Markup.keyboard([
    ['💻 Kod Yozish', '🎨 Dizayn-to-Kod'],
    ['🛠 Xato Qidirish', '📚 IT Bilimlar'],
    ['📊 Statistika', '⚙️ Sozlamalar'],
    ['❓ Yordam Markazi']
]).resize();

const settingsKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz'), Markup.button.callback('🇺🇸 English', 'lang_en')],
    [Markup.button.callback('🗑 Tarixni Tozalash', 'clear_history')]
]);

// --- Bot Logic & Handlers ---
bot.start((ctx) => {
    ctx.replyWithMarkdown('💎 *Antigravity Super AI Bot: Professional Markaziga xush kelibsiz!*\n\nAllohning izni bilan, barcha dasturlash va dizayn muammolaringizga to\'liq yechim topamiz.\n\n👇 Boshlash uchun menyudan tanlang yoki shunchaki yozing:', mainKeyboard);
});

bot.hears('💻 Kod Yozish', (ctx) => ctx.reply('🚀 Dasturlash rejimi aktiv. Menga vazifani yozib yuboring (masalan: "HTML/CSS-da chiroyli login sahifa").'));
bot.hears('🎨 Dizayndan Kodga', (ctx) => ctx.reply('🎨 Chiroyli dizayn rasmini yuboring, men Uni bir zumda kodga o\'girib beraman.'));
bot.hears('🛠 Xato Qidirish', (ctx) => ctx.reply('🔍 Xato qidirish rejimi. Kodingizni yuborsangiz, xatolarni ko\'rsatib tuzatib beraman.'));
bot.hears('📚 IT Bilimlar', (ctx) => ctx.reply('📚 IT sohasidagi istalgan tushuncha haqida so\'rang, masalan: "Docker nima?"'));

bot.hears('📊 Statistika', (ctx) => {
    ctx.replyWithMarkdown('📈 *Antigravity AI Statistikasi:*\n\n✅ Holat: *Active (24/7)*\n⚙️ Model: *Llama-4 (Vision Ready)*\n🌍 Joylashuv: *Vercel Edge*\n💡 Xizmat turi: *Unlimited Free Pro*');
});

bot.hears('⚙️ Sozlamalar', (ctx) => ctx.reply('⚙️ Bot sozlamalari:', settingsKeyboard));

bot.hears('❓ Yordam Markazi', (ctx) => {
    ctx.replyWithMarkdown(`💡 *Qanday foydalanish kerak?*
    
1. **Matn yuboring**: Savol bering yoki kod yozdiring.
2. **Rasm yuboring**: Dizaynni kodga yoki logoni tushuntirishga yuboring.
3. **Menu tugmalari**: Maxsus rejimlar orasida erkin almashing!

Xizmatlarimiz siz uchun mutlaqo bepul.`);
});

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
        await ctx.sendChatAction('typing');
        const answer = await getAIResponse(ctx.message.text, null, 'developer');
        await sendSmartMessage(ctx, answer);
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
        await sendSmartMessage(ctx, answer);
    } catch (e) {
        ctx.reply(`❌ Rasm tahlilida xatolik: ${e.message}`);
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
        res.status(200).send('Bot is ready to serve world-class AI solutions!');
    }
};
