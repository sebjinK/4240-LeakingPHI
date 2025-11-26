// helpers/hfChat.js
const axios = require("axios");

const BASE_URL = "http://host.docker.internal:5005/generate";

async function chatCompletion(messages) {
    try {
        // send messages exactly as the Python server expects
        const response = await axios.post(
            BASE_URL,
            messages, // array of { role: "system"/"user", content: "..." }
            { headers: { "Content-Type": "application/json" } }
        );

        return response.data?.generated_text || "";
    } catch (err) {
        console.error("Local HF model error:", err.response?.data || err.message);
        throw err;
    }
}

module.exports = { chatCompletion };
