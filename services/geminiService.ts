import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini Client
// Note: process.env.API_KEY must be configured in the build environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = 'gemini-2.5-flash';

export const generateSheetData = async (prompt: string, rows: number = 5, cols: number = 3) => {
  try {
    const fullPrompt = `
      You are a spreadsheet assistant.
      Generate data for a spreadsheet based on this request: "${prompt}".
      Generate exactly ${rows} rows and ${cols} columns of data.
      Return ONLY a JSON object with a 'values' property containing a 2D array of strings.
      Also include a brief 'explanation' of what you generated.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            values: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            explanation: { type: Type.STRING }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from AI");
    
    return JSON.parse(jsonText) as { values: string[][], explanation: string };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeSelection = async (data: string[][], query: string) => {
   try {
    const context = JSON.stringify(data);
    const fullPrompt = `
      Analyze the following spreadsheet data (in JSON format):
      ${context}

      User Query: "${query}"

      Provide a concise answer.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
