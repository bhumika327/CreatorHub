import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { UserCheck, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Proposal {
  id: string;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  creator: {
    email: string;
    creatorProfile?: {
      displayName: string;
    };
  };
}

interface Requirement {
  id: string;
  title: string;
  budget: number;
  proposals: Proposal[];
}

export const MyRequirements: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/catalog/requirements');
      if (res.data?.success) {
        // filter owned requirements
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const owned = res.data.data.filter((r: any) => r.customerId === user.id);
          
          // For each owned requirement, fetch proposals
          const listWithProposals = await Promise.all(
            owned.map(async (req: any) => {
              const propRes = await apiClient.get('/api/engagement/proposals');
              const filteredProps = propRes.data?.data?.filter((p: any) => p.requirementId === req.id) || [];
              return { ...req, proposals: filteredProps };
            })
          );
          setRequirements(listWithProposals);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleAcceptProposal = async (proposalId: string) => {
    setSuccess(null);
    if (!window.confirm('Accept this proposal? This will put the bid amount on escrow hold.')) return;

    try {
      const res = await apiClient.post(`/api/engagement/accept/${proposalId}`);
      if (res.data?.success) {
        setSuccess('Proposal accepted and Escrow funded! Redirecting to contracts...');
        setTimeout(() => {
          navigate('/engagement/contracts');
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to accept proposal.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Posted Requirements</h2>
        <p className="text-gray-500 dark:text-gray-400">Review bid pitches from content creators, select a candidate, and fund escrow.</p>
      </div>

      {success && (
        <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-300 rounded-lg">
          {success}
        </div>
      )}

      {loading ? (
        <div>Loading your posts...</div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-150 dark:border-gray-850">
          You haven't posted any requirements yet. Go to "Post Requirement" to get started!
        </div>
      ) : (
        <div className="space-y-6">
          {requirements.map((req) => (
            <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-150 dark:border-gray-850 overflow-hidden">
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-850 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{req.title}</h3>
                  <span className="text-xs text-gray-400">Budget: ${req.budget}</span>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  {req.proposals.length} Pitch Bids
                </span>
              </div>

              <div className="p-6 divide-y divide-gray-150 dark:divide-gray-850">
                {req.proposals.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center">No proposals bids submitted yet.</div>
                ) : (
                  req.proposals.map((proposal) => (
                    <div key={proposal.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">
                            {proposal.creator.creatorProfile?.displayName || proposal.creator.email}
                          </h4>
                          <span className="text-xs text-gray-400">Creator Account email: {proposal.creator.email}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-green-600 dark:text-green-400">${proposal.bidAmount}</div>
                          <span className="text-xs text-gray-400">{proposal.deliveryDays} Days delivery</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                        {proposal.coverLetter}
                      </p>

                      <div className="flex justify-between items-center pt-2">
                        <span className="flex items-center text-xs text-yellow-600 dark:text-yellow-400">
                          <Clock className="w-4 h-4 mr-1" />
                          Status: {proposal.status}
                        </span>
                        
                        {proposal.status === 'PENDING' && (
                          <button
                            onClick={() => handleAcceptProposal(proposal.id)}
                            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs transition-colors shadow"
                          >
                            <UserCheck className="w-4 h-4 mr-1.5" />
                            Accept & Hire (Fund Escrow)
                          </button>
                        )}

                        {proposal.status === 'ACCEPTED' && (
                          <span className="flex items-center text-xs text-green-600 dark:text-green-400 font-bold">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Hired (Escrow Funded)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
