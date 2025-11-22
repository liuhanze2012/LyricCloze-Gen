import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize Gemini
// Ensure we look for API_KEY first, then fall back to GEMINI_API_KEY for backward compatibility
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Warning: API_KEY or GEMINI_API_KEY not found in environment variables.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

// API Route
app.post('/api/generate', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'API Key not configured on server.' });
  }

  try {
    const { lyrics } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: 'Lyrics are required' });
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        lines: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lyrics lines with 10-15 selected words replaced by 10 underscores (__________), no empty lines.",
        },
        answerKey: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Removed words in order.",
        },
        wordBank: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Removed words shuffled.",
        },
      },
      required: ["lines", "answerKey", "wordBank"],
    };

    const prompt = `
      Task: Create an ESL cloze (fill-in-the-blank) song worksheet (CEFR A2/B1).
      
      1. Analyze lyrics. Select 10-15 distinct, audible words (verbs/adjectives/nouns) to remove.
      2. Return 'lines' where selected words are replaced by EXACTLY 10 underscores: "__________".
      3. Remove empty lines/stanzas. NO newlines within strings.
      4. 'answerKey': removed words in order. 'wordBank': shuffled.
      
      Lyrics:
      "${lyrics}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, // Keep low temperature for speed
        // Removed thinkingConfig to prevent API errors
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text);

    if (result.lines) {
      result.lines = result.lines
        .map(line => line.replace(/[\r\n]+/g, ' ').trim())
        .filter(line => line.length > 0);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Serve Static Frontend (Production)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve files from the 'dist' directory (created by vite build)
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing by returning index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
