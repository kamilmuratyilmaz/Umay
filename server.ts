import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure public/audio directory exists
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  // Serve audio files directly to avoid Vite SPA fallback returning index.html
  app.use('/audio', express.static(audioDir));
  app.use('/audio', (req, res) => {
    res.status(404).json({ error: 'Audio file not found' });
  });

  // API endpoint to save audio files
  app.post("/api/save-audio", (req, res) => {
    const { filename, base64Data, category } = req.body;
    if (!filename || !base64Data || !category) {
      return res.status(400).json({ error: "Missing filename, base64Data, or category" });
    }
    
    // Sanitize category to prevent directory traversal
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');
    const categoryDir = path.join(audioDir, safeCategory);
    
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    const filePath = path.join(categoryDir, filename);
    
    // Only write if it doesn't exist to avoid unnecessary disk I/O
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      } catch (err) {
        console.error("Failed to write audio file:", err);
        return res.status(500).json({ error: "Failed to write file" });
      }
    }
    
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
