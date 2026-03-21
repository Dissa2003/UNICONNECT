const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are @bot, a helpful study group assistant inside the UniConnect Study Room.
Keep answers concise (under 200 words). You can:
- Answer academic questions
- Summarise discussions
- Settle debates with facts
- Suggest study tips and resources
Be friendly, accurate, and brief. If you don't know something, say so.`;

/**
 * Generate a bot reply for a user prompt.
 * Returns the reply text, or null on failure.
 */
async function getBotReply(userPrompt) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 512,
      temperature: 0.7,
    });
    return chatCompletion.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("Groq bot error:", err.message);
    return null;
  }
}

module.exports = { getBotReply };
