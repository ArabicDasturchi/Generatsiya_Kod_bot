require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

async function listGroqModels() {
    const key = process.env.GROQ_API_KEY;
    try {
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });
        console.log(chalk.green("✅ Ochiq Groq modellari:"));
        response.data.data.forEach(m => {
            console.log(`- ${m.id}`);
        });
    } catch (error) {
        console.error(chalk.red("❌ Xato:"), error.message);
    }
}

listGroqModels();
