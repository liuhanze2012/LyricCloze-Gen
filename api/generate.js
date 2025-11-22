
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API client server-side
// Ensure we look for API_KEY first, then fall back to GEMINI_API_KEY for backward compatibility
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

// We instantiate the client inside the handler or check for key existence to avoid crash on load if key is missing
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!ai) {
    console.error("API Key is missing");
    return res.status(500).json({ error: 'Server Configuration Error: API Key missing' });
  }

  try {
    const { lyrics } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: 'Lyrics are required' });
    }

    // Schema for the expected output
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
        temperature: 0.1, // Keep low temperature for speed and stability
        // Removed thinkingConfig as it can cause 400 errors on standard flash models
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(text);

    // Server-side post-processing
    if (result.lines) {
      result.lines = result.lines
        .map(line => line.replace(/[\r\n]+/g, ' ').trim())
        .filter(line => line.length > 0);
    }

    // Return the result to the frontend
    return res.status(200).json(result);

  } catch (error) {
    console.error("Server Error generating cloze:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
