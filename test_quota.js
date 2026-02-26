require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

async function testAllModels() {
    const key = process.env.GEMINI_API_KEY;
    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-1.5-flash-8b'
    ];

    console.log(chalk.blue("Testing models for quota..."));

    for (const model of modelsToTry) {
        process.stdout.write(`Testing ${model}... `);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: "Hi" }] }]
            });
            console.log(chalk.green("✅ SUCCESS"));
            console.log(chalk.gray(`Model ${model} is working!`));
            return model;
        } catch (error) {
            if (error.response) {
                console.log(chalk.red(`❌ FAILED (${error.response.status}: ${error.response.data.error.status})`));
                // console.log(chalk.gray(error.response.data.error.message));
            } else {
                console.log(chalk.red(`❌ ERROR: ${error.message}`));
            }
        }
    }
    return null;
}

testAllModels().then(workingModel => {
    if (workingModel) {
        console.log(chalk.bold.green(`\nUse this model in index.js: ${workingModel}`));
    } else {
        console.log(chalk.bold.red("\nNo working models found with current API key."));
    }
});
