import { GoogleGenAI, Modality, ThinkingLevel, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getCachedAudioUrl, saveAudioToServer } from "./audioCache";

// Initialize Gemini SDK
export const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Generate Speech (TTS)
export const generateSpeech = async (text: string, voiceName: string = "Puck", category: string = "general", isSlow: boolean = false): Promise<ArrayBuffer> => {
  const cachedUrl = await getCachedAudioUrl(text, voiceName, category, isSlow);
  
  if (cachedUrl) {
    try {
      const res = await fetch(cachedUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) {
          return buffer;
        }
        console.warn(`Cached audio for ${text} is empty, falling back to API`);
      }
    } catch (e) {
      console.warn(`Failed to fetch cached audio for ${text}, falling back to API`, e);
    }
  }

  const ai = getAI();
  const promptText = isSlow 
    ? `Please speak the following Chinese text very slowly, clearly and naturally, emphasizing the tones: ${text}`
    : `Please speak the following Chinese text clearly and naturally: ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No audio generated. Response: " + JSON.stringify(response));
  
  for (const part of parts) {
    if (part.inlineData?.data) {
      const base64Audio = part.inlineData.data;
      
      // Save to server in background
      saveAudioToServer(text, voiceName, base64Audio, category, isSlow).catch(console.error);
      
      // Decode base64 to ArrayBuffer
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
  }
  
  throw new Error("No audio generated. Parts: " + JSON.stringify(parts));
};

// 2. Transcribe Audio
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType,
            },
          },
          { text: "Please transcribe this Chinese audio accurately. Only output the Chinese characters and Pinyin." },
        ],
      },
    ],
  });

  return response.text;
};

// Evaluate Pronunciation
export const evaluatePronunciation = async (base64Audio: string, mimeType: string, targetWord: string, pinyin: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType,
            },
          },
          { text: `The user is trying to say the Chinese word "${targetWord}" (${pinyin}). 
          Listen to the audio and evaluate their pronunciation.
          Return a JSON object with the following structure:
          {
            "score": number (0-100),
            "feedback": string (in Turkish, explaining what was good and what needs improvement, especially regarding tones),
            "transcription": string (what you actually heard them say, in Hanzi and Pinyin)
          }` },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
};

// 3. Explain Grammar (Thinking Mode)
export const explainGrammar = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: query,
    config: {
      systemInstruction: "You are an expert Chinese language teacher for Turkish speakers. Explain complex Chinese grammar concepts clearly in Turkish. Provide examples in Chinese characters, Pinyin, and Turkish translation.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  return response.text;
};
