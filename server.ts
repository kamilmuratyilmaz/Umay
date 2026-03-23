import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, ThinkingLevel, HarmCategory, HarmBlockThreshold } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "50mb" }));
  app.use(cors());

  // Rate limiting on all /api routes
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api", apiLimiter);

  // Ensure public/audio directory exists
  const audioDir = path.join(process.cwd(), "public", "audio");
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  // Serve audio files directly
  app.use("/audio", express.static(audioDir));
  app.use("/audio", (_req, res) => {
    res.status(404).json({ error: "Audio file not found" });
  });

  // Save audio files (for TTS cache)
  app.post("/api/save-audio", (req, res) => {
    const { filename, base64Data, category } = req.body;
    if (!filename || !base64Data || !category) {
      return res.status(400).json({ error: "Missing filename, base64Data, or category" });
    }

    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9_\-.]/g, "");

    if (!safeFilename || !safeCategory) {
      return res.status(400).json({ error: "Invalid filename or category" });
    }

    const categoryDir = path.join(audioDir, safeCategory);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    const filePath = path.join(categoryDir, safeFilename);
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      } catch (err) {
        console.error("Failed to write audio file:", err);
        return res.status(500).json({ error: "Failed to write file" });
      }
    }

    res.json({ success: true });
  });

  // TTS endpoint
  app.post("/api/tts", async (req, res) => {
    const { text, voiceName = "Puck", isSlow = false } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid text" });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "Text too long (max 500 characters)" });
    }

    try {
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) return res.status(500).json({ error: "No audio generated" });

      for (const part of parts) {
        if (part.inlineData?.data) {
          return res.json({ audio: part.inlineData.data });
        }
      }
      res.status(500).json({ error: "No audio in response" });
    } catch (err) {
      console.error("TTS error:", err);
      res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // Pronunciation evaluation endpoint
  app.post("/api/evaluate-pronunciation", async (req, res) => {
    const { base64Audio, mimeType, targetWord, pinyin } = req.body;
    if (!base64Audio || !mimeType || !targetWord || !pinyin) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (targetWord.length > 50) {
      return res.status(400).json({ error: "Target word too long" });
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { inlineData: { data: base64Audio, mimeType } },
            {
              text: `The user is trying to say the Chinese word "${targetWord}" (${pinyin}). Listen to the audio and evaluate their pronunciation. Return a JSON object with: {"score": number (0-100), "feedback": string (in Turkish, explain what was good and what needs improvement, especially regarding tones), "transcription": string (what you heard in Hanzi and Pinyin)}`,
            },
          ],
        }],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (err) {
      console.error("Pronunciation eval error:", err);
      res.status(500).json({ error: "Evaluation failed" });
    }
  });

  // Grammar explanation endpoint
  app.post("/api/grammar", async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }
    if (query.length > 1000) {
      return res.status(400).json({ error: "Query too long (max 1000 characters)" });
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: query,
        config: {
          systemInstruction:
            "You are an expert Chinese language teacher for Turkish speakers. Explain complex Chinese grammar concepts clearly in Turkish. Provide examples in Chinese characters, Pinyin, and Turkish translation.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });

      res.json({ text: response.text });
    } catch (err) {
      console.error("Grammar error:", err);
      res.status(500).json({ error: "Grammar explanation failed" });
    }
  });

  // Audio transcription endpoint
  app.post("/api/transcribe", async (req, res) => {
    const { base64Audio, mimeType } = req.body;
    if (!base64Audio || !mimeType) {
      return res.status(400).json({ error: "Missing base64Audio or mimeType" });
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { inlineData: { data: base64Audio, mimeType } },
            { text: "Please transcribe this Chinese audio accurately. Only output the Chinese characters and Pinyin." },
          ],
        }],
      });

      res.json({ text: response.text });
    } catch (err) {
      console.error("Transcription error:", err);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  // Create HTTP server (required for WebSocket support alongside Express)
  const httpServer = createHttpServer(app);

  // WebSocket relay for Gemini Live API
  const wss = new WebSocketServer({ server: httpServer, path: "/api/live" });

  wss.on("connection", (clientWs) => {
    let geminiSession: any = null;

    clientWs.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "config") {
          const ai = getAI();
          const sessionPromise = ai.live.connect({
            model: msg.model || "gemini-2.5-flash-native-audio-preview-12-2025",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: msg.voiceName || "Puck" } },
              },
              systemInstruction: msg.systemInstruction,
            },
            callbacks: {
              onopen: () => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: "connected" }));
                }
              },
              onmessage: (geminiMsg: any) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: "message", data: geminiMsg }));
                }
              },
              onerror: (err: any) => {
                console.error("Gemini Live error:", err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: "error", message: "Connection error" }));
                }
              },
              onclose: () => {
                if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
              },
            },
          });
          geminiSession = await sessionPromise;
        } else if (msg.type === "audio" && geminiSession) {
          geminiSession.sendRealtimeInput({
            audio: { data: msg.data, mimeType: msg.mimeType },
          });
        }
      } catch (err) {
        console.error("Live relay error:", err);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: "error", message: "Server error" }));
        }
      }
    });

    clientWs.on("close", () => {
      geminiSession?.close();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
