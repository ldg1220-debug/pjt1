import { createApp } from './app';
import { env } from './config/env';

/**
 * Server entrypoint.
 * Stage 1: boots Express and exposes GET /health.
 */
const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[welder-cert] ready on http://localhost:${env.PORT} (env=${env.NODE_ENV})`,
  );
});

// Graceful shutdown
const shutdown = (signal: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[welder-cert] ${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
