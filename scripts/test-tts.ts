import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: `Please speak the following Chinese text clearly and naturally: 你好` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0].inlineData) {
      console.log("SUCCESS: Audio generated, length:", parts[0].inlineData.data.length);
    } else {
      console.log("FAILED: No audio data", JSON.stringify(response));
    }
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();