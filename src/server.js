import { app } from './app.js';
import { assertEnv, env } from './config/env.js';
import { startCleanupScheduler } from './services/cleanupService.js';

assertEnv();

app.listen(env.port, () => {
  startCleanupScheduler();
  console.log(`WeddingCraft is running on ${env.port}`);
});
