import { GoogleGenAI, Type } from "@google/genai";
import { ClozeResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateClozeGame(lyrics: string): Promise<ClozeResult> {
  // Schema for the expected output
  const schema = {
    type: Type.OBJECT,
    properties: {
      processedLyrics: {
        type: Type.STRING,
        description: "The full song lyrics with selected vocabulary words replaced by 10 underscores (__________). Preserve all original line breaks and stanza formatting.",
      },
      answerKey: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "The list of words that were removed, in the order they appear in the lyrics.",
      },
    },
    required: ["processedLyrics", "answerKey"],
  };

  const prompt = `
    You are an expert ESL (English as a Second Language) teacher creating a listening exercise.
    
    Task:
    1. Analyze the following song lyrics.
    2. Select exactly 10 to 15 words to remove to create a 'fill-in-the-blank' (cloze) game.
    3. Target Audience: Students with a vocabulary size of approximately 3000 words (CEFR Level A2/B1). 
    4. Selection Criteria: 
       - Choose words that are clearly audible in a song context (verbs, adjectives, common nouns).
       - Avoid removing proper nouns (names, places) unless they are extremely common.
       - Avoid removing slang or extremely obscure words unless they are key to the song's meaning and guessable.
    5. Formatting: Replace the selected words with exactly 10 underscores: "__________".
    
    Lyrics to process:
    "${lyrics}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3, // Lower temperature for more deterministic/rule-following output
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }

    return JSON.parse(text) as ClozeResult;
  } catch (error) {
    console.error("Error generating cloze:", error);
    throw error;
  }
}
