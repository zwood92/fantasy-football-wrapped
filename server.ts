import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

import espnHandler from "./api/espn.js";
import reportImageHandler from "./api/report-image.js";
import reportPageHandler from "./api/report-page.js";
import podcastHandler from "./api/podcast.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.post("/api/espn", async (req, res) => {
    try {
      await espnHandler(req as any, res as any);
    } catch (err) {
      console.error("Error in /api/espn:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/podcast", async (req, res) => {
    try {
      await podcastHandler(req as any, res as any);
    } catch (err) {
      console.error("Error in /api/podcast:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/report-page", async (req, res) => {
    try {
      await reportPageHandler(req as any, res as any);
    } catch (err) {
      console.error("Error in /api/report-page:", err);
      if (!res.headersSent) {
        res.status(500).send("Error rendering report page");
      }
    }
  });

  app.get("/api/report-image", async (req, res) => {
    try {
      await reportImageHandler(req as any, res as any);
    } catch (err) {
      console.error("Error in /api/report-image:", err);
      if (!res.headersSent) {
        res.status(500).send("Error rendering report image");
      }
    }
  });

  // Rewrite /report/:token requests to report-page handler in production
  app.get("/report/:token", async (req, res, next) => {
    if (
      process.env.NODE_ENV === "production" &&
      req.headers.accept?.includes("text/html")
    ) {
      req.query.token = req.params.token;
      return reportPageHandler(req as any, res as any);
    }
    next();
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "vite.config.ts"),
      root: path.resolve(__dirname),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
