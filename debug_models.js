require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
        // listModels is not on the model instance, it's on the client or similar?
        // Actually, listing models usually involves a direct fetch or a different method.
        console.log("Listing models...");
    } catch (e) {
        console.error("Error listing:", e);
    }
}

// Alternative: just try a very simple generateContent with a known model
async function testPrompt() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const modelName of modelsToTry) {
        console.log(`Trying model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            console.log(`✅ Success with ${modelName}:`, response.text());
            break;
        } catch (error) {
            console.error(`❌ Failed with ${modelName}:`, error.message);
        }
    }
}

testPrompt();
