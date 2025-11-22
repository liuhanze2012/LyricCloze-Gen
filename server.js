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
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API Route
app.post('/api/generate', async (req, res) => {
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
        },
        answerKey: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        wordBank: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["lines", "answerKey", "wordBank"],
    };

    const prompt = `
      You are an expert ESL teacher.
      Task: Create a cloze (fill-in-the-blank) song worksheet.
      Target: CEFR Level A2/B1.
      
      Instructions:
      1. Select 10-15 clear, audible words (verbs, adjectives, nouns) to remove.
      2. Avoid removing proper nouns or slang.
      3. Return 'lines' where selected words are replaced by "__________" (10 underscores).
      4. 'lines' must NOT contain newline characters. Split by stanza/line breaks visually.
      5. 'answerKey' contains the removed words in order.
      6. 'wordBank' contains the removed words shuffled.
      
      Lyrics:
      "${lyrics}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
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