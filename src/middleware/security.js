import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'","data:","blob:","https://res.cloudinary.com"],
      connectSrc: ["'self'", 'https://api.cloudinary.com'],
      mediaSrc: ["'self'", 'https://res.cloudinary.com'],
      frameSrc: ['https://www.google.com']
    }
  }
});

export const corsMiddleware = cors({
  origin: env.nodeEnv === 'production' ? env.clientOrigin : true,
  credentials: true
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});
