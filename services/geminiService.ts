import { GoogleGenAI, Type } from "@google/genai";
import { ClozeResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateClozeGame(lyrics: string): Promise<ClozeResult> {
  // Schema for the expected output
  const schema = {
    type: Type.OBJECT,
    properties: {
      lines: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The lyrics split into individual lines. Remove empty lines. Each line should have selected vocabulary words replaced by 10 underscores (__________). NO newline characters allowed in strings.",
      },
      answerKey: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The list of words that were removed, in the correct order they appear in the lyrics.",
      },
      wordBank: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The same list of words as answerKey, but shuffled in random order for the student to choose from.",
      },
    },
    required: ["lines", "answerKey", "wordBank"],
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
       - Avoid removing slang or extremely obscure words.
    5. Formatting: 
       - Return the lyrics as an array of strings ("lines"). 
       - REMOVE any empty lines or stanzas to save space.
       - In each line, replace the selected words with exactly 10 underscores: "__________".
       - CRITICAL: Ensure no element in the 'lines' array contains newline characters ('\\n'). Split strictly by visual line breaks.
    6. Output:
       - lines: The processed lyrics lines.
       - answerKey: The correct answers in order.
       - wordBank: The correct answers shuffled randomly.
    
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
        temperature: 0.3, 
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }

    const result = JSON.parse(text) as ClozeResult;

    // Post-processing to strictly enforce the "no newline" and "no empty lines" rule
    result.lines = result.lines
      .map(line => line.replace(/[\r\n]+/g, ' ').trim()) // Replace newlines with space and trim
      .filter(line => line.length > 0); // Remove empty strings

    return result;
  } catch (error) {
    console.error("Error generating cloze:", error);
    throw error;
  }
}