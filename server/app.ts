/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes/index.ts';

export {
  setCustomGenAIClient,
  resetCustomGenAIClient,
  getGenAIClient,
} from './gemini.ts';

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Rate Limiting: 30 requests per 15 minutes per IP on /api/* (skip in test mode to avoid flaky test runs)
if (process.env.NODE_ENV !== 'test') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', apiLimiter);
}

// Lower express.json limit to 100kb
app.use(express.json({ limit: '100kb' }));

// Mount API routes
app.use('/api', router);

// Generic JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

export { app };
export default app;
