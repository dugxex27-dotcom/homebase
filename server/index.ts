import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { storage } from "./storage";
import { trialReminderScheduler } from "./trial-reminder-scheduler";

const app = express();

// Trust proxy - required for rate limiting to work correctly behind proxies
app.set('trust proxy', 1);

// Security Headers - Enhanced Helmet configuration for SOC 2 compliance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://replit.com"], // unsafe-eval needed for Vite in dev, replit.com for dev banner
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'", 
        "https://nominatim.openstreetmap.org", 
        "https://maps.googleapis.com",
        "https://api.stripe.com",
        "wss:", // WebSocket connections for real-time features
      ],
      frameSrc: ["'self'", "https://js.stripe.com"], // Stripe payment forms
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  dnsPrefetchControl: {
    allow: false
  },
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },
}));

// Additional security headers for SOC 2 compliance
app.use((req, res, next) => {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=(self "https://js.stripe.com")'
  );
  
  // Cache control for sensitive data
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Cross-Origin security headers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  next();
});

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? process.env.ALLOWED_ORIGINS?.split(',') || []
  : ['http://localhost:5000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// FIX 1: Trust proxy for Replit's infrastructure
app.set('trust proxy', 1);

// Increase body size limit to support base64 image uploads (business logos and project photos)
// Using 100mb to accommodate multiple large photos
// IMPORTANT: Skip JSON parsing for Stripe webhook to preserve raw body for signature verification
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    next();
  } else {
    express.json({ limit: '100mb' })(req, res, next);
  }
});
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    next();
  } else {
    express.urlencoded({ extended: false, limit: '100mb' })(req, res, next);
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error('Server error:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start scheduled tasks
    trialReminderScheduler.start();
  });
})();
