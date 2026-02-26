require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

async function listModelsDirectly() {
    const key = process.env.GEMINI_API_KEY;
    console.log(chalk.blue("Google bazasidan ochiq modellarni qidiryapman..."));

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await axios.get(url);

        if (response.data && response.data.models) {
            console.log(chalk.green("✅ Quyidagi modellar siz uchun ochiq:"));
            response.data.models.forEach(m => {
                console.log(`- ${m.name.replace('models/', '')}`);
            });
            console.log(chalk.cyan("\nMaslahat: index.js da shu modellardan birini ishlating."));
        } else {
            console.log(chalk.yellow("Modellar topilmadi, lekin xatolik ham chiqmadi."));
        }
    } catch (error) {
        console.error(chalk.red("❌ Xatolik yuz berdi:"));
        if (error.response) {
            console.error(chalk.yellow("Status:"), error.response.status);
            console.error(chalk.yellow("Xabar:"), error.response.data.error.message);
        } else {
            console.error(error.message);
        }
        console.log(chalk.magenta("\nYECHIM: Google AI Studio dan yangi Gmail bilan yangi API KEY oling."));
    }
}

listModelsDirectly();
