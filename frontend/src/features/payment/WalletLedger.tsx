import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'ESCROW_HOLD' | 'RELEASE' | 'REFUND' | 'TOP_UP';
  description: string;
  createdAt: string;
  engagement?: {
    requirement?: {
      title: string;
    };
  };
}

interface Wallet {
  balance: number;
  escrowBalance: number;
  transactions: Transaction[];
}

export const WalletLedger: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/payment/ledger');
      if (res.data?.success) {
        setWallet(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallet(); }, []);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const typeColor = (type: string) => {
    switch (type) {
      case 'ESCROW_HOLD': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950';
      case 'RELEASE': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
      case 'REFUND': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950';
      case 'TOP_UP':
      case 'DEPOSIT': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950';
    }
  };

  const typeSign = (type: string) => ['RELEASE', 'REFUND', 'TOP_UP', 'DEPOSIT'].includes(type) ? '+' : '-';
  const typeIcon = (type: string) => {
    return ['RELEASE', 'REFUND', 'TOP_UP', 'DEPOSIT'].includes(type)
      ? <ArrowUpRight className="w-4 h-4" />
      : <ArrowDownRight className="w-4 h-4" />;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-green-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Wallet & Payment Ledger</h2>
        <p className="text-gray-500 dark:text-gray-400">Track your escrow holds, releases, and transaction history.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-2xl shadow-lg">
          <p className="text-green-100 text-sm font-medium mb-1">Available Balance</p>
          <div className="text-4xl font-black">{formatCurrency(wallet?.balance || 0)}</div>
          <TrendingUp className="w-6 h-6 mt-3 text-green-200 opacity-70" />
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg">
          <p className="text-blue-100 text-sm font-medium mb-1">Escrow Locked</p>
          <div className="text-4xl font-black">{formatCurrency(wallet?.escrowBalance || 0)}</div>
          <DollarSign className="w-6 h-6 mt-3 text-blue-200 opacity-70" />
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-150 dark:border-gray-850">
          <p className="text-gray-400 text-sm font-medium mb-1">Total Transactions</p>
          <div className="text-4xl font-black text-gray-800 dark:text-gray-100">{wallet?.transactions?.length || 0}</div>
          <TrendingDown className="w-6 h-6 mt-3 text-gray-400 opacity-70" />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-150 dark:border-gray-850 overflow-hidden">
        <div className="p-5 border-b border-gray-150 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 bg-opacity-50">
          <h3 className="font-bold text-sm uppercase text-gray-400">Transaction History</h3>
        </div>

        {!wallet?.transactions?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No transaction history yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${typeColor(tx.type)}`}>
                    {typeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                      {tx.engagement?.requirement?.title || tx.description || tx.type}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black ${['RELEASE', 'REFUND', 'TOP_UP'].includes(tx.type) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {typeSign(tx.type)}{formatCurrency(tx.amount)}
                  </span>
                  <p className={`text-[10px] px-2 py-0.5 rounded mt-1 font-semibold inline-block ${typeColor(tx.type)}`}>{tx.type.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
