require('dotenv').config();
const axios = require('axios');

async function testRest() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;

    console.log("Testing REST API v1...");
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hi" }] }]
        });
        console.log("✅ Success with REST v1!");
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ Failed with REST v1.");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }

        console.log("\nTesting REST API v1beta...");
        const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        try {
            const responseBeta = await axios.post(urlBeta, {
                contents: [{ parts: [{ text: "Hi" }] }]
            });
            console.log("✅ Success with REST v1beta!");
            console.log("Response:", JSON.stringify(responseBeta.data, null, 2));
        } catch (errorBeta) {
            console.error("❌ Failed with REST v1beta.");
            if (errorBeta.response) {
                console.error("Status:", errorBeta.response.status);
                console.error("Data:", JSON.stringify(errorBeta.response.data, null, 2));
            } else {
                console.error("Error:", errorBeta.message);
            }
        }
    }
}

testRest();
