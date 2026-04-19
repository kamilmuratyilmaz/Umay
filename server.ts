import express from "express";
import { createServer as createHttpServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(cors());

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api", apiLimiter);

  // Serve pre-downloaded vocabulary audio from data/audio/ (populated by
  // `npm run download-audio`, gitignored, baked into the Docker image).
  // vocabulary.ts references these via /audio/{field}/{speed}/row_N.wav paths.
  app.use(
    "/audio",
    express.static(path.join(process.cwd(), "data", "audio"), {
      maxAge: "30d",
      immutable: true,
      // Without this, a missing file calls next() and Vite's SPA middleware
      // cheerfully serves index.html with content-type text/html — which the
      // browser then fails to decode as audio. `fallthrough: false` ensures
      // missing audio yields a real 404 so the client can trigger its fallback.
      fallthrough: false,
    }),
  );

  // Proxy AI endpoints to the Python backend.
  // Mounted at root (not at a sub-path) so Express does not strip the path
  // prefix before http-proxy-middleware sees req.url.
  const aiProxy = createProxyMiddleware({
    target: AI_BACKEND_URL,
    changeOrigin: true,
    pathFilter: ["/api/tts", "/api/grammar", "/api/transcribe", "/api/evaluate-pronunciation"],
    on: {
      error: (_err, _req, res: any) => {
        if (typeof res.status === "function") {
          res.status(502).json({ error: "AI backend unavailable. Is it running?" });
        }
      },
    },
  });
  app.use(aiProxy);

  // Create HTTP server before WebSocket proxy setup
  const httpServer = createHttpServer(app);

  // WebSocket proxy: /api/live → Python backend
  const liveProxy = createProxyMiddleware({
    target: AI_BACKEND_URL,
    changeOrigin: true,
    pathFilter: "/api/live",
    ws: true,
  });
  app.use(liveProxy);
  httpServer.on("upgrade", liveProxy.upgrade as any);

  // Vite middleware (dev) or static (prod)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Frontend  → http://localhost:${PORT}`);
    console.log(`AI backend → ${AI_BACKEND_URL}`);
  });
}

startServer();
