import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { FileText, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Proposal {
  id: string;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  requirement: {
    title: string;
    budget: number;
    customer?: {
      email: string;
      customerProfile?: {
        fullName: string;
      };
    };
  };
}

export const MyProposals: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/engagement/proposals');
      if (res.data?.success) {
        setProposals(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch proposal history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  const statusConfig = {
    PENDING: {
      label: 'Under Review',
      color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    ACCEPTED: {
      label: 'Accepted 🎉',
      color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
      icon: <CheckCircle className="w-3.5 h-3.5" />
    },
    REJECTED: {
      label: 'Not Selected',
      color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
      icon: <XCircle className="w-3.5 h-3.5" />
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-green-700 dark:from-white dark:via-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          My Bid Proposals
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Track all your submitted pitches, pricing bids, and their contract acceptance status.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin w-8 h-8 text-green-500" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-150 dark:border-gray-850">
          You haven't submitted any bids yet. Browse open requirements to find projects to pitch.
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const sc = statusConfig[p.status] || statusConfig.PENDING;
            const clientName = p.requirement.customer?.customerProfile?.fullName || p.requirement.customer?.email || 'Unknown Client';
            
            return (
              <div
                key={p.id}
                className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150 dark:border-gray-850 space-y-4 hover:shadow-xl transition-all duration-300 animate-slide-in"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-xl border border-green-150 dark:border-green-900/60">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-base">{p.requirement.title}</h3>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">
                        Client: {clientName} · Submitted {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full border border-opacity-40 ${sc.color}`}>
                    {sc.icon} {sc.label}
                  </span>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm leading-relaxed text-gray-600 dark:text-gray-350 whitespace-pre-wrap border border-gray-150 dark:border-gray-850">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5">Your Cover Letter</span>
                  {p.coverLetter}
                </div>

                <div className="flex items-center space-x-6 pt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Your Bid</p>
                    <p className="font-black text-green-500 text-lg mt-0.5">${p.bidAmount}</p>
                  </div>
                  <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                    <p className="text-[10px] text-gray-400 uppercase">Client Budget</p>
                    <p className="font-bold text-gray-750 dark:text-gray-300 text-base mt-0.5">${p.requirement.budget}</p>
                  </div>
                  <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                    <p className="text-[10px] text-gray-400 uppercase">Est. Delivery</p>
                    <p className="font-bold text-gray-750 dark:text-gray-300 text-base mt-0.5">{p.deliveryDays} Days</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
