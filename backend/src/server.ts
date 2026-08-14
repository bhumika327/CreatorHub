import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { env } from './common/config/env';
import { SocketManager } from './features/chat/chat.socket';
import { RbacService } from './features/rbac/rbac.service';

const PORT = env.PORT;

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }
});

// Initialize SocketManager
SocketManager.init(io);

// Initialize role permissions on startup
RbacService.ensurePermissions()
  .then(() => {
    console.log('[RBAC] Role permissions verification complete.');
  })
  .catch((err) => {
    console.error('[RBAC] Role permissions setup failed:', err);
  });

server.listen(PORT, () => {
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
