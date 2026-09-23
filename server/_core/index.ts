import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerGoogleCalendarRoutes } from "../googleCalendar";
import { registerWebhookRoutes } from "../webhooks";
import { registerDeliveryRoutes } from "../delivery";
import { registerStripeWebhook } from "../billing";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { validateRequiredEnv } from "./env";
import { rateLimit } from "../rateLimit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function addSecurityHeaders(app: express.Express) {
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
}

async function startServer() {
  validateRequiredEnv();

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "2mb", verify: (req, _res, buf) => { (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf); } }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  addSecurityHeaders(app);

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGoogleCalendarRoutes(app);
  registerStripeWebhook(app);
  registerWebhookRoutes(app);
  registerDeliveryRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(
    "/api/trpc",
    rateLimit({ windowMs: 60_000, max: 120, keyPrefix: "trpc" }),
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = process.env.NODE_ENV === "development" ? await findAvailablePort(preferredPort) : preferredPort;

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.close(() => {
      console.log("[Server] Closed.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (error) => {
    console.error("[FATAL] Uncaught exception:", error);
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] Unhandled rejection:", reason);
  });
}

startServer().catch((error) => {
  console.error("[FATAL] Server failed to start:", error);
  process.exit(1);
});
