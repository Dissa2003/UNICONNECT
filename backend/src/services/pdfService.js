const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const Groq = require("groq-sdk");

let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

// In-memory store: userId → { fileName, chunks[] }
const userPdfStore = new Map();

/**
 * Extract text from a PDF file, chunk it, and store per user.
 */
async function ingestPdf(userId, filePath, fileName) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  const text = result.text || "";

  if (!text.trim()) {
    throw new Error("Could not extract any text from the PDF.");
  }

  const chunks = chunkText(text, 1000, 200);

  userPdfStore.set(userId, { fileName, chunks });

  return { fileName, totalChunks: chunks.length, pages: result.total };
}

/**
 * Split text into overlapping chunks.
 */
function chunkText(text, size = 1000, overlap = 200) {
  const chunks = [];
  // Normalise whitespace
  const clean = text.replace(/\s+/g, " ").trim();
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start += size - overlap;
  }
  return chunks;
}

/**
 * Simple keyword-based retrieval: score each chunk by how many query terms it contains.
 */
function retrieveChunks(userId, query, topK = 4) {
  const store = userPdfStore.get(userId);
  if (!store || !store.chunks.length) return [];

  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

  const scored = store.chunks.map((chunk, idx) => {
    const lower = chunk.toLowerCase();
    let score = 0;
    for (const term of terms) {
      // count occurrences
      const regex = new RegExp(term, "gi");
      const matches = lower.match(regex);
      if (matches) score += matches.length;
    }
    return { chunk, idx, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((s) => s.score > 0);
}

/**
 * Answer a user's question using retrieved PDF chunks + Groq LLM,
 * or as a general chat if no PDF is loaded.
 */
async function queryPdf(userId, question) {
  const store = userPdfStore.get(userId);

  // No PDF loaded — general chat mode
  if (!store) {
    const systemPrompt = `You are Reference Flow, a private study assistant inside UniConnect Study Room.
You can answer academic questions, explain concepts, and help with study topics.
Be concise, friendly, and accurate.`;

    try {
      const completion = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 768,
        temperature: 0.7,
      });
      return completion.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (err) {
      console.error("Reference Flow Groq error:", err.message);
      return "Something went wrong. Please try again.";
    }
  }

  const relevant = retrieveChunks(userId, question);

  let context;
  if (relevant.length === 0) {
    // Fall back to first few chunks as general context
    context = store.chunks.slice(0, 3).join("\n\n");
  } else {
    context = relevant.map((r) => r.chunk).join("\n\n");
  }

  const systemPrompt = `You are Reference Flow, a private PDF study assistant.
The user uploaded "${store.fileName}". Answer their question using ONLY the context below.
If the context doesn't contain enough info, say so.
Be concise and helpful.

--- PDF CONTEXT ---
${context}
--- END CONTEXT ---`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      max_tokens: 768,
      temperature: 0.4,
    });
    return completion.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("Reference Flow Groq error:", err.message);
    return "Something went wrong while processing your question. Please try again.";
  }
}

/**
 * Check if user has a PDF loaded.
 */
function getUserPdfInfo(userId) {
  return userPdfStore.get(userId) || null;
}

/**
 * Clear user's PDF data.
 */
function clearUserPdf(userId) {
  userPdfStore.delete(userId);
}

module.exports = { ingestPdf, queryPdf, getUserPdfInfo, clearUserPdf };
