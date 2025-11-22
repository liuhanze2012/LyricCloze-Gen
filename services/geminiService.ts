
import { ClozeResult } from "../types";

// We no longer import GoogleGenAI here because this runs in the browser.
// The logic has moved to /api/generate.js

export async function generateClozeGame(lyrics: string): Promise<ClozeResult> {
  try {
    // Call our own backend API
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lyrics }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json() as ClozeResult;
    return result;
    
  } catch (error) {
    console.error("Error generating cloze:", error);
    throw error;
  }
}
