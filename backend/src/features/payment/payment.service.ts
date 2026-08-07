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
    return prisma.paymentTransactionLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
