require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const LocalSession = require('telegraf-session-local');
const axios = require('axios');
const chalk = require('chalk');
const http = require('http');

// Render health check server (legacy, kept for compatibility if needed)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Antigravity Bot is running...\n');
    }).listen(PORT, () => {
        console.log(chalk.yellow(`📡 Health check server listening on port ${PORT}`));
    });
}

// --- Configuration ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!GROQ_API_KEY || !TELEGRAM_BOT_TOKEN) {
    console.error(chalk.red.bold('❌ XATO: .env faylida API kalitlari topilmadi!'));
    if (process.env.NODE_ENV !== 'production') process.exit(1);
}

// Initialize Telegram Bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Session storage
const localSession = new LocalSession({ database: '/tmp/sessions.json' }); // Vercel uses /tmp for writing
bot.use(localSession.middleware());

// --- Helpers ---
const LOG_LEVELS = {
    INFO: chalk.blue('ℹ️ INFO:'),
    SUCCESS: chalk.green('✅ SUCCESS:'),
    WARN: chalk.yellow('⚠️ WARN:'),
    ERROR: chalk.red.bold('❌ ERROR:'),
    BOT: chalk.cyan.bold('🤖 BOT:'),
};

const logger = (level, msg) => console.log(`${level} ${msg}`);

function splitMessage(text, limit = 3800) {
    const chunks = [];
    let current = text;
    while (current.length > 0) {
        if (current.length <= limit) {
            chunks.push(current);
            break;
        }
        let pos = current.lastIndexOf('\n', limit);
        if (pos === -1) pos = limit;
        chunks.push(current.substring(0, pos));
        current = current.substring(pos).trim();
    }
    return chunks;
}

async function getBase64(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data).toString('base64');
}

/**
 * Main AI handler using Groq (Llama 3.2 Vision)
 */
async function handleGroqChat(ctx, prompt, imageBase64 = null) {
    try {
        await ctx.sendChatAction('typing');

        if (!ctx.session.history) ctx.session.history = [];

        const messages = [
            {
                role: "system",
                content: "Siz 'Antigravity Pro Code Bot' assistantisiz. Foydalanuvchi yuborgan rasm yoki matnni kodga aylantirasiz. Clean Code va professional dizaynga e'tibor bering. O'zbek tilida javob bering."
            },
            ...ctx.session.history
        ];

        const currentUserMessage = {
            role: "user",
            content: []
        };

        if (prompt) currentUserMessage.content.push({ type: "text", text: prompt });
        if (imageBase64) {
            currentUserMessage.content.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            });
        }

        messages.push(currentUserMessage);

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const text = response.data.choices[0].message.content;

        // Save to history (only text parts for history to save tokens)
        ctx.session.history.push({ role: "user", content: prompt || "Rasm yuborildi" });
        ctx.session.history.push({ role: "assistant", content: text });

        if (ctx.session.history.length > 10) ctx.session.history = ctx.session.history.slice(-6);

        const chunks = splitMessage(text);
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }

        logger(LOG_LEVELS.SUCCESS, `Javob yuborildi: [User: ${ctx.from.username || ctx.from.id}]`);
    } catch (error) {
        if (error.response) {
            console.error(chalk.red('Groq API Error Detail:'), JSON.stringify(error.response.data, null, 2));
            logger(LOG_LEVELS.ERROR, `Groq API Error: ${error.response.data.error?.message || error.message}`);
        } else {
            console.error(error);
            logger(LOG_LEVELS.ERROR, `Network Error: ${error.message}`);
        }
        ctx.reply('❌ Xatolik yuz berdi. Iltimos, /clear buyrug\'ini bering yoki keyinroq urinib ko\'ring.');
    }
}

// --- Menus & Localized Strings ---
const strings = {
    uz: {
        welcome: "🚀 *Antigravity Pro AI Botga xush kelibsiz!*\n\nMen sun'iy intellekt yordamida har qanday rasm yoki matnni professional kodga aylantira olaman.",
        features: "✨ *Imkoniyatlarim:*\n- 💻 Dizayndan kodga o'girish\n- 🧠 Algoritmlarni tahlil qilish\n- 📝 Texnik hujjatlar yozish\n- 🛠 Har qanday dildagi xatolarni tuzatish",
        main_keyboard: [['📝 Yangi suhbat', '🧠 AI Rejimi'], ['📊 Statistika', '⚙️ Sozlamalar']],
        mode_menu: "🤖 *AI Ishlash rejimini tanlang:*",
        modes: [
            ['💻 Dasturchi', '🎨 UI/UX Dizayner'],
            ['✍️ Ssenarist', '🏠 Asosiy menyu']
        ],
        cleared: "✅ Suhbat tarixingiz tozalandi.",
        select_lang: "🇺🇿 Tilni tanlang / Select Language / Выберите язык:",
    },
    en: {
        welcome: "🚀 *Welcome to Antigravity Pro AI Bot!*\n\nI can convert any image or text into professional code using AI.",
        features: "✨ *My Capabilities:*\n- 💻 Design to Code\n- 🧠 Algorithm Analysis\n- 📝 Technical Writing\n- 🛠 Debugging in any language",
        main_keyboard: [['📝 New Chat', '🧠 AI Mode'], ['📊 Statistics', '⚙️ Settings']],
        mode_menu: "🤖 *Select AI Operation Mode:*",
        modes: [
            ['💻 Developer', '🎨 UI/UX Designer'],
            ['✍️ Copywriter', '🏠 Main Menu']
        ],
        cleared: "✅ Chat history cleared.",
        select_lang: "Choose your language:",
    }
};

const getKeyboard = (ctx) => {
    const lang = ctx.session.lang || 'uz';
    return Markup.keyboard(strings[lang].main_keyboard).resize();
};

const getModesMenu = (ctx) => {
    const lang = ctx.session.lang || 'uz';
    return Markup.keyboard(strings[lang].modes).resize();
};

const settingsMenu = (lang) => Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz'), Markup.button.callback('🇺🇸 English', 'lang_en')],
    [Markup.button.callback('🗑 Tarixni tozalash', 'clear_history')]
]);

// --- Bot Commands ---
bot.start(async (ctx) => {
    ctx.session.history = [];
    ctx.session.lang = 'uz';
    ctx.session.mode = 'developer';
    const lang = ctx.session.lang;
    await ctx.replyWithMarkdown(strings[lang].welcome + "\n\n" + strings[lang].features, getKeyboard(ctx));
});

bot.hears(['📝 Yangi suhbat', '📝 New Chat'], (ctx) => {
    ctx.session.history = [];
    ctx.reply(strings[ctx.session.lang || 'uz'].cleared);
});

bot.hears(['🧠 AI Rejimi', '🧠 AI Mode'], (ctx) => {
    ctx.replyWithMarkdown(strings[ctx.session.lang || 'uz'].mode_menu, getModesMenu(ctx));
});

bot.hears(['🏠 Asosiy menyu', '🏠 Main Menu'], (ctx) => {
    ctx.reply('Menyu:', getKeyboard(ctx));
});

bot.hears(['💻 Dasturchi', '💻 Developer'], (ctx) => {
    ctx.session.mode = 'developer';
    ctx.reply('🚀 Rejim o\'zgartirildi: Professional Dasturchi');
});

bot.hears(['🎨 UI/UX Dizayner', '🎨 UI/UX Designer'], (ctx) => {
    ctx.session.mode = 'designer';
    ctx.reply('🎨 Rejim o\'zgartirildi: UI/UX Dizayner');
});

bot.hears(['📊 Statistika', '📊 Statistics'], (ctx) => {
    const count = ctx.session.history ? Math.floor(ctx.session.history.length / 2) : 0;
    ctx.reply(`📊 *Statistikangiz:*\n\nUshbu suhbatdagi xabarlar: ${count}`, { parse_mode: 'Markdown' });
});

bot.hears(['⚙️ Sozlamalar', '⚙️ Settings'], (ctx) => {
    ctx.reply(strings[ctx.session.lang || 'uz'].select_lang, settingsMenu(ctx.session.lang));
});

// --- Media Handlers ---
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    await handleGroqChat(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const base64 = await getBase64(fileLink.href);
        const prompt = ctx.message.caption || "Ushbu rasmni tahlil qiling va takliflar bering.";
        await handleGroqChat(ctx, prompt, base64);
    } catch (e) {
        logger(LOG_LEVELS.ERROR, `Photo error: ${e.message}`);
        ctx.reply('❌ Rasmni qayta ishlashda xatolik yuz berdi.');
    }
});

bot.on('video', async (ctx) => {
    ctx.reply('⚠️ Hozircha Groq AI video tahlilini qo\'llab-quvvatlamaydi.');
});

bot.on('document', async (ctx) => {
    const mime = ctx.message.document.mime_type;
    if (mime.startsWith('image/')) {
        try {
            const fileLink = await ctx.telegram.getFileLink(ctx.message.document.file_id);
            const base64 = await getBase64(fileLink.href);
            await handleGroqChat(ctx, ctx.message.caption || "Faylni tahlil qiling.", base64);
        } catch (e) {
            ctx.reply('Faylni qayta ishlashda xatolik.');
        }
    } else {
        ctx.reply('Hozircha faqat rasm fayllarini qo\'llab-quvvatlaymiz.');
    }
});

// --- Startup for Vercel (Webhook Mode) ---
if (process.env.NODE_ENV === 'production') {
    module.exports = async (req, res) => {
        try {
            if (req.method === 'POST') {
                await bot.handleUpdate(req.body, res);
            } else {
                res.status(200).send('Antigravity Bot is active!');
            }
        } catch (e) {
            console.error('Webhook Error:', e);
            res.status(500).send('Error');
        }
    };
} else {
    bot.launch().then(() => {
        console.clear();
        console.log(chalk.cyan.bold('========================================'));
        console.log(chalk.white.bold('   🚀 ANTIGRAVITY PRO BOT ONLAYN!   '));
        console.log(chalk.cyan.bold('========================================'));
        logger(LOG_LEVELS.SUCCESS, 'Bazalar yuklandi va ulanish o\'rnatildi.');
    });
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
