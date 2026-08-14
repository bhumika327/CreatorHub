import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../common/config/env';
import { prisma } from '../../prisma/client';
import { RbacService } from '../rbac/rbac.service';
import { filterContactLeaking } from '../../common/utils/leakFilter';
import { RealtimeNotificationDispatcher } from '../notification/realtime-dispatcher';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

export class SocketManager {
  private static io: Server | null = null;
  // Map of userId -> Set of socketId
  private static userSockets = new Map<string, Set<string>>();

  public static init(ioServer: Server) {
    this.io = ioServer;

    // 1. Connection Authentication Middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: UserRole };
        
        // Fetch user from DB to validate existence and status
        const user = await prisma.authUser.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        if (user.status !== 'ACTIVE') {
          return next(new Error(`Account status is ${user.status.toLowerCase()}`));
        }

        // Attach verified user payload strictly
        socket.data.user = {
          userId: user.id,
          role: user.role
        };

        next();
      } catch (error) {
        return next(new Error('Invalid or expired authentication token'));
      }
    });

    // 2. Connection Event Handler
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      if (!user) return;

      const userId = user.userId;

      // Register socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Presence: if it's their first active connection, broadcast online status
      if (this.userSockets.get(userId)!.size === 1) {
        socket.broadcast.emit('user_presence', { userId, status: 'online' });
      }

      console.log(`[Socket.io] User connected: ${userId} (Socket: ${socket.id}). Online count for user: ${this.userSockets.get(userId)!.size}`);

      // Emit initial presence map of currently online users to the connected client
      const onlineUserIds = Array.from(this.userSockets.keys()).filter(id => this.isUserOnline(id));
      socket.emit('online_users_list', onlineUserIds);

      // Subscribe to real-time notifications for this user
      const unsubscribeNotifications = RealtimeNotificationDispatcher.subscribe((targetUserId, notification) => {
        if (targetUserId === userId) {
          socket.emit('notification', notification);
        }
      });

      // Event listener: join_room
      socket.on('join_room', async ({ roomId }, callback) => {
        try {
          // Verify required permission
          const hasViewPerm = await RbacService.hasPermission(user.userId, user.role, 'chat:view');
          if (!hasViewPerm) {
            throw new Error('Access denied: missing chat:view permission');
          }

          // Verify room exists
          const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { engagement: true }
          });

          if (!room) {
            throw new Error('Room not found');
          }

          // Verify participation (resource ownership check)
          const isParticipant = room.engagement.creatorId === userId || room.engagement.customerId === userId;
          const isManager = user.role === 'MANAGER';

          if (!isParticipant && !isManager) {
            throw new Error('Access denied: not a participant in this conversation');
          }

          socket.join(roomId);
          console.log(`[Socket.io] User ${userId} joined room ${roomId}`);

          if (callback) callback({ success: true });
        } catch (err: any) {
          if (callback) callback({ success: false, message: err.message });
        }
      });

      // Event listener: send_message
      socket.on('send_message', async ({ roomId, content }, callback) => {
        try {
          // Verify required permission
          const hasSendPerm = await RbacService.hasPermission(user.userId, user.role, 'chat:send');
          if (!hasSendPerm) {
            throw new Error('Access denied: missing chat:send permission');
          }

          // Verify room existence and participation
          const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { engagement: true }
          });

          if (!room) {
            throw new Error('Room not found');
          }

          const isParticipant = room.engagement.creatorId === userId || room.engagement.customerId === userId;
          const isManager = user.role === 'MANAGER';

          if (!isParticipant && !isManager) {
            throw new Error('Access denied: not a participant in this conversation');
          }

          // Apply enhanced contact information leak check
          const { content: sanitizedContent, filtered } = filterContactLeaking(content);

          // Save message to PostgreSQL (db persists it)
          const message = await prisma.chatMessage.create({
            data: {
              roomId,
              senderId: userId,
              content: sanitizedContent,
              isRead: false
            },
            include: {
              sender: {
                select: {
                  id: true,
                  role: true,
                  customerProfile: { select: { fullName: true } },
                  creatorProfile: { select: { displayName: true } }
                }
              }
            }
          });

          // Deliver message in real-time to other participants in the room
          socket.to(roomId).emit('message_received', { message, filtered });

          // Send real-time notification to the counterparty
          const recipientId = room.engagement.creatorId === userId ? room.engagement.customerId : room.engagement.creatorId;
          const senderName = message.sender.creatorProfile?.displayName || message.sender.customerProfile?.fullName || 'A user';
          
          await NotificationService.createNotification(
            recipientId,
            `New message from ${senderName}`,
            sanitizedContent.length > 60 ? sanitizedContent.substring(0, 60) + '...' : sanitizedContent
          );

          if (callback) callback({ success: true, data: message, filtered });
        } catch (err: any) {
          if (callback) callback({ success: false, message: err.message });
        }
      });

      // Event listener: typing
      socket.on('typing', async ({ roomId, isTyping }) => {
        try {
          // Room validation helper
          const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { engagement: true }
          });

          if (!room) return;

          const isParticipant = room.engagement.creatorId === userId || room.engagement.customerId === userId;
          const isManager = user.role === 'MANAGER';

          if (isParticipant || isManager) {
            socket.to(roomId).emit('user_typing', { roomId, userId, isTyping });
          }
        } catch (err) {
          console.error('[Socket.io] Typing event error:', err);
        }
      });

      // Event listener: mark_messages_read
      socket.on('mark_messages_read', async ({ roomId }, callback) => {
        try {
          const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { engagement: true }
          });

          if (!room) throw new Error('Room not found');

          const isParticipant = room.engagement.creatorId === userId || room.engagement.customerId === userId;
          const isManager = user.role === 'MANAGER';

          if (!isParticipant && !isManager) {
            throw new Error('Access denied');
          }

          // Mark unread messages sent by counterparty as read
          await prisma.chatMessage.updateMany({
            where: {
              roomId,
              senderId: { not: userId },
              isRead: false
            },
            data: {
              isRead: true
            }
          });

          // Broadcast read event to the room
          socket.to(roomId).emit('messages_read', { roomId, userId });

          if (callback) callback({ success: true });
        } catch (err: any) {
          if (callback) callback({ success: false, message: err.message });
        }
      });

      // Event listener: disconnect
      socket.on('disconnect', () => {
        const userSocketsSet = this.userSockets.get(userId);
        if (userSocketsSet) {
          userSocketsSet.delete(socket.id);
          if (userSocketsSet.size === 0) {
            this.userSockets.delete(userId);
            // Broadcast offline status to others
            socket.broadcast.emit('user_presence', { userId, status: 'offline' });
            console.log(`[Socket.io] User ${userId} went offline.`);
          } else {
            console.log(`[Socket.io] User ${userId} disconnected one socket. Remaining: ${userSocketsSet.size}`);
          }
        }
        unsubscribeNotifications();
      });
    });
  }

  public static emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && this.io) {
      for (const socketId of socketIds) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  public static isUserOnline(userId: string): boolean {
    const socketIds = this.userSockets.get(userId);
    return !!(socketIds && socketIds.size > 0);
  }
}
