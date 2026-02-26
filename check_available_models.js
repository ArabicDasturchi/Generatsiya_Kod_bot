require('dotenv').config();
const axios = require('axios');

async function checkModels() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Checking available models for your API key...");

    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        console.log("✅ Models found:");
        response.data.models.forEach(m => {
            console.log(`- ${m.name}`);
        });
    } catch (error) {
        console.error("❌ Failed to list models.");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
    }
}

checkModels();
