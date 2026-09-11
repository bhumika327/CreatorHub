import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { MessageSquare, ShieldAlert, AlertTriangle, Coins, CheckCircle, FileText, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DISPUTED';
  deliverableUrl?: string;
  deliverableNotes?: string;
  dueDate?: string;
}

interface Engagement {
  id: string;
  amount: number;
  status: 'PENDING' | 'ACTIVE' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'ESCROW_HOLD' | 'REFUNDED';
  requirement: {
    title: string;
    description: string;
  };
  chatRooms: Array<{ id: string }>;
  creatorId: string;
  customerId: string;
  milestones: Milestone[];
}

export const Contracts: React.FC = () => {
  const [contracts, setContracts] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'CUSTOMER' | 'CREATOR' | null>(null);
  
  // Dispute Modal state
  const [disputeContractId, setDisputeContractId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  const navigate = useNavigate();

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/engagement/contracts');
      if (res.data?.success) {
        setContracts(res.data.data);
      }
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleFundMilestone = async (milestoneId: string) => {
    if (!window.confirm('Fund this milestone escrow payment? This will lock the funds in escrow.')) return;
    try {
      const res = await apiClient.post(`/api/payment/milestones/${milestoneId}/fund`);
      if (res.data?.success) {
        alert('Milestone funded successfully! Escrow hold created.');
        fetchContracts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error funding milestone escrow.');
    }
  };

  const handleSubmitMilestoneWork = async (milestoneId: string) => {
    const deliverableUrl = window.prompt('Enter deliverable URL (e.g. Cloudinary link, Figma file, etc.):', 'https://cloudinary.com/my-share-link');
    if (!deliverableUrl) return;
    const deliverableNotes = window.prompt('Enter notes for the client:') || '';

    try {
      const res = await apiClient.post(`/api/engagement/milestones/${milestoneId}/submit`, {
        deliverableUrl,
        deliverableNotes
      });
      if (res.data?.success) {
        alert('Milestone work deliverable submitted successfully!');
        fetchContracts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error submitting work.');
    }
  };

  const handleApproveMilestoneWork = async (milestoneId: string) => {
    if (!window.confirm('Approve milestone work deliverables and release escrow payout to creator? This action is irreversible.')) return;
    try {
      const res = await apiClient.post(`/api/engagement/milestones/${milestoneId}/approve`);
      if (res.data?.success) {
        alert('Milestone approved and escrow funds released successfully!');
        fetchContracts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error releasing payment.');
    }
  };

  const handleRejectMilestoneWork = async (milestoneId: string) => {
    const notes = window.prompt('Enter feedback/rejection reason:');
    if (!notes) return;

    try {
      const res = await apiClient.post(`/api/engagement/milestones/${milestoneId}/reject`, { notes });
      if (res.data?.success) {
        alert('Milestone work rejected.');
        fetchContracts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error rejecting work.');
    }
  };

  const handleRaiseDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeContractId) return;
    setDisputeLoading(true);

    try {
      const res = await apiClient.post(`/api/admin/dispute/raise/${disputeContractId}`, {
        reason: disputeReason
      });

      if (res.data?.success) {
        alert('Dispute raised successfully. A manager will review this contract and adjust ledgers.');
        setDisputeContractId(null);
        setDisputeReason('');
        fetchContracts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error filing dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  const getMilestoneStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">UNFUNDED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">ESCROW HELD</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">WORK SUBMITTED</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">RELEASED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">REJECTED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">REFUNDED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Active Work Contracts</h2>
        <p className="text-gray-500 dark:text-gray-400">Track active work timelines, fund milestones, chat with your counterparty, and release escrow payouts.</p>
      </div>

      {loading ? (
        <div>Loading contract ledgers...</div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-150 dark:border-gray-850">
          No active work contracts listed.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {contracts.map((contract) => (
            <div key={contract.id} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-150 dark:border-gray-850 space-y-6">
              {/* Card Header */}
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{contract.requirement.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{contract.requirement.description}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    contract.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                    contract.status === 'REFUNDED' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                  }`}>
                    Contract Status: {contract.status}
                  </span>
                  <div className="text-xs text-gray-400 uppercase mt-2">Total Budget</div>
                  <div className="text-lg font-black text-green-600 dark:text-green-400">${contract.amount}</div>
                </div>
              </div>

              {/* Milestones Escrow Integration */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center">
                  <Coins className="w-4 h-4 mr-1.5 text-yellow-500" />
                  Milestones & Escrow Ledger
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contract.milestones?.map((milestone) => (
                    <div key={milestone.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-sm text-gray-800 dark:text-gray-100">{milestone.title}</h5>
                          {getMilestoneStatusBadge(milestone.status)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{milestone.description}</p>
                        <div className="text-sm font-extrabold text-green-600 dark:text-green-400 mt-2">${milestone.amount}</div>
                        {milestone.deliverableUrl && (
                          <div className="mt-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Deliverable Submission</span>
                            <a href={milestone.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline truncate block">{milestone.deliverableUrl}</a>
                            {milestone.deliverableNotes && <p className="text-[11px] text-gray-500 mt-1 italic">"{milestone.deliverableNotes}"</p>}
                          </div>
                        )}
                      </div>

                      {/* Milestone Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        {/* Customer Funds Escrow */}
                        {userRole === 'CUSTOMER' && milestone.status === 'PENDING' && (
                          <button
                            onClick={() => handleFundMilestone(milestone.id)}
                            className="flex items-center px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            <Coins className="w-3.5 h-3.5 mr-1" />
                            Fund Milestone
                          </button>
                        )}

                        {/* Creator Submits Deliverable */}
                        {userRole === 'CREATOR' && (milestone.status === 'IN_PROGRESS' || milestone.status === 'REJECTED') && (
                          <button
                            onClick={() => handleSubmitMilestoneWork(milestone.id)}
                            className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Submit Work
                          </button>
                        )}

                        {/* Customer Approves / Rejects Deliverable */}
                        {userRole === 'CUSTOMER' && milestone.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleApproveMilestoneWork(milestone.id)}
                              className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approve & Release
                            </button>
                            <button
                              onClick={() => handleRejectMilestoneWork(milestone.id)}
                              className="flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject Deliverable
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Contract Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                {/* Chat link */}
                {contract.chatRooms && contract.chatRooms.length > 0 && (
                  <button
                    onClick={() => navigate('/chat', { state: { roomId: contract.chatRooms[0].id } })}
                    className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-250 dark:bg-gray-900 dark:hover:bg-gray-850 text-xs font-bold rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5 text-green-500" />
                    Open Chat
                  </button>
                )}

                {/* Customer can dispute the whole contract */}
                {userRole === 'CUSTOMER' && contract.status !== 'COMPLETED' && contract.status !== 'REFUNDED' && (
                  <button
                    onClick={() => setDisputeContractId(contract.id)}
                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 mr-1.5" />
                    Raise Dispute
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeContractId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-950">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-300 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Open Dispute Case
              </h3>
              <button onClick={() => setDisputeContractId(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <form onSubmit={handleRaiseDisputeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Reason for Dispute</label>
                <textarea
                  required
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Explain exactly why you want to dispute this contract. A manager will audit the project ledger."
                />
              </div>

              <button
                type="submit"
                disabled={disputeLoading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {disputeLoading ? 'Filing Dispute...' : 'File Dispute Case'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
