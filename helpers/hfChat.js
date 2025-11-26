const axios = require("axios");

const BASE_URL = "http://host.docker.internal:5005/generate";

async function chatCompletion(messages) {
    // Convert roles to lowercase
    const chatMessages = messages.map(m => ({
        role: m.role.toLowerCase(),
        content: m.content
    }));

    try {
        const response = await axios.post(
            BASE_URL,
            { messages: chatMessages, max_new_tokens: 256 },
            { headers: { "Content-Type": "application/json" } }
        );

        return response.data?.generated_text || "";
    } catch (err) {
        console.error("Local HF model error:", err.response?.data || err.message);
        throw err;
    }
}

module.exports = { chatCompletion };
