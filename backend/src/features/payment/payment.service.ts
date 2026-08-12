import { prisma } from '../../prisma/client';
import { TransactionType } from '@prisma/client';

export class PaymentService {
  /**
   * Logs a record in the transaction ledger simulating payment hold, release, or refund
   */
  public static async recordTransaction(userId: string, amount: number, type: TransactionType, description: string) {
    return prisma.paymentTransactionLedger.create({
      data: {
        userId,
        amount,
        type,
        description
      }
    });
  }

  public static async getLedger(userId: string) {
    const transactions = await prisma.paymentTransactionLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const activeEngagements = await prisma.engagement.findMany({
      where: {
        OR: [
          { customerId: userId },
          { creatorId: userId }
        ],
        status: {
          in: ['ESCROW_HOLD', 'DELIVERED', 'DISPUTED']
        }
      }
    });

    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const escrowBalance = activeEngagements.reduce((sum, eng) => sum + eng.amount, 0);

    return {
      balance,
      escrowBalance,
      transactions
    };
  }
}
