import { prisma } from '../../prisma/client';
import { filterContactLeaking } from '../../common/utils/leakFilter';

export class ChatService {
  public static async verifyRoomAccess(userId: string, roomId: string) {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { engagement: true }
    });

    if (!room) {
      throw { status: 404, message: 'Chat room not found' };
    }

    const isAuthorized =
      room.engagement.creatorId === userId ||
      room.engagement.customerId === userId ||
      // Or is a Manager
      await prisma.authUser.findFirst({
        where: { id: userId, role: 'MANAGER' }
      });

    if (!isAuthorized) {
      throw { status: 403, message: 'Unauthorized access to this chat room' };
    }

    return room;
  }

  public static async sendMessage(senderId: string, roomId: string, content: string) {
    await this.verifyRoomAccess(senderId, roomId);

    // Apply Leak sanitizer check
    const { content: sanitizedContent, filtered } = filterContactLeaking(content);

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content: sanitizedContent
      },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            customerProfile: {
              select: {
                fullName: true
              }
            },
            creatorProfile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });

    return {
      ...message,
      filtered
    };
  }

  public static async getMessages(userId: string, roomId: string, lastMessageId?: string) {
    await this.verifyRoomAccess(userId, roomId);

    const whereClause: any = { roomId };

    if (lastMessageId) {
      const lastMsg = await prisma.chatMessage.findUnique({
        where: { id: lastMessageId }
      });
      if (lastMsg) {
        whereClause.createdAt = { gt: lastMsg.createdAt };
      }
    }

    return prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            customerProfile: {
              select: {
                fullName: true
              }
            },
            creatorProfile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });
  }

  public static async getUserRooms(userId: string) {
    return prisma.chatRoom.findMany({
      where: {
        engagement: {
          OR: [
            { creatorId: userId },
            { customerId: userId }
          ]
        }
      },
      include: {
        engagement: {
          include: {
            requirement: true
          }
        }
      }
    });
  }
}
