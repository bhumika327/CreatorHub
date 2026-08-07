import { app } from './app';
import { env } from './common/config/env';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  console.log(`[Docs] Swagger UI is live at http://localhost:${PORT}/api-docs`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception] Error:', error);
  process.exit(1);
});
