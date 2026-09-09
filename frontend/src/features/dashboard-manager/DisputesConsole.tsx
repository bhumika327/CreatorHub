import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { CheckCircle, Loader2, Scale, AlertTriangle, RefreshCw } from 'lucide-react';

interface Dispute {
  id: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'RESOLVED_REFUNDED' | 'RESOLVED_RELEASED' | string;
  resolution?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  initiator?: {
    id?: string;
    email?: string;
    role?: string;
  } | null;
  engagement?: {
    id: string;
    amount?: number;
    status?: string;
    requirement?: {
      id?: string;
      title?: string;
    } | null;
  } | null;
}

export const DisputesConsole: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState<'REFUND' | 'RELEASE'>('REFUND');
  const [resolving, setResolving] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/admin/disputes');
      if (res.data?.success) {
        setDisputes(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch disputes:', err);
      setError(err.response?.data?.message || 'Failed to retrieve dispute cases. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute) return;
    setResolving(true);

    try {
      const res = await apiClient.post(`/api/admin/dispute/resolve/${activeDispute.id}`, {
        resolutionNotes: resolution,
        resolution,
        action // 'REFUND' or 'RELEASE'
      });
      if (res.data?.success) {
        const resolvedStatus = action === 'REFUND' ? 'RESOLVED_REFUNDED' : 'RESOLVED_RELEASED';
        setDisputes((prev) =>
          prev.map((d) =>
            d.id === activeDispute.id
              ? {
                  ...d,
                  status: resolvedStatus,
                  resolutionNotes: resolution,
                  resolution
                }
              : d
          )
        );
        setActiveDispute(null);
        setResolution('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve dispute.');
    } finally {
      setResolving(false);
    }
  };

  const formatDate = (dt?: string) => {
    if (!dt) return 'N/A';
    try {
      return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dt;
    }
  };

  const getRequirementTitle = (disp?: Dispute | null) => {
    if (!disp) return 'Unknown Project';
    return (
      disp.engagement?.requirement?.title ||
      (disp.engagement?.id ? `Contract #${disp.engagement.id.slice(0, 8)}` : 'Engagement Contract')
    );
  };

  const getAmount = (disp?: Dispute | null) => {
    return disp?.engagement?.amount ?? 0;
  };

  const getInitiatorEmail = (disp?: Dispute | null) => {
    return disp?.initiator?.email || 'Unknown User';
  };

  const formatStatus = (status: string) => {
    if (status === 'OPEN') return 'OPEN';
    return status.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Disputes Console</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Review and arbitrate active contract disputes. Release or refund escrow funds accordingly.
          </p>
        </div>
        <button
          onClick={fetchDisputes}
          disabled={loading}
          className="inline-flex items-center px-3.5 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchDisputes}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin w-8 h-8 text-green-500" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          No dispute cases in queue. The system is operating cleanly.
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const isOpen = dispute.status === 'OPEN';
            return (
              <div
                key={dispute.id}
                className={`p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border ${
                  isOpen
                    ? 'border-red-200 dark:border-red-900'
                    : 'border-gray-200 dark:border-gray-700'
                } space-y-3`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isOpen
                          ? 'bg-red-100 dark:bg-red-950 text-red-600'
                          : 'bg-green-100 dark:bg-green-950 text-green-600'
                      }`}
                    >
                      {isOpen ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">
                        {getRequirementTitle(dispute)}
                      </h3>
                      <p className="text-xs text-gray-400">
                        Filed by: {getInitiatorEmail(dispute)} · {formatDate(dispute.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-gray-800 dark:text-white">
                      ${getAmount(dispute)}
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isOpen
                          ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                          : 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
                      }`}
                    >
                      {formatStatus(dispute.status)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-xs font-bold uppercase text-gray-400 block mb-1">Dispute Reason</span>
                  {dispute.reason}
                </div>

                {!isOpen && (dispute.resolutionNotes || dispute.resolution) && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm text-green-700 dark:text-green-300">
                    <span className="text-xs font-bold uppercase text-green-500 block mb-1">Resolution</span>
                    {dispute.resolutionNotes || dispute.resolution}
                  </div>
                )}

                {isOpen && (
                  <div className="flex pt-2">
                    <button
                      onClick={() => {
                        setActiveDispute(dispute);
                        setResolution('');
                        setAction('REFUND');
                      }}
                      className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <Scale className="w-4 h-4 mr-2" />
                      Arbitrate & Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {activeDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-950 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-300 flex items-center">
                <Scale className="w-5 h-5 mr-2" /> Arbitrate Dispute
              </h3>
              <button
                onClick={() => setActiveDispute(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold leading-none p-1"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-bold uppercase text-gray-400">Project</p>
              <p className="font-semibold text-gray-900 dark:text-white">{getRequirementTitle(activeDispute)}</p>
              <p className="text-xs text-gray-400">Locked amount: ${getAmount(activeDispute)}</p>
              <p className="text-xs font-bold uppercase text-gray-400 mt-3">Reason Filed</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{activeDispute.reason}</p>
            </div>

            <form onSubmit={handleResolve} className="p-6 space-y-4">
              {/* Action Choice */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Ruling Action</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAction('REFUND')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg border transition-colors ${
                      action === 'REFUND'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400'
                    }`}
                  >
                    Refund Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('RELEASE')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg border transition-colors ${
                      action === 'RELEASE'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-400'
                    }`}
                  >
                    Release to Creator
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Resolution Summary</label>
                <textarea
                  required
                  rows={3}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                  placeholder="Write the arbitration rationale and outcome decision..."
                />
              </div>

              <button
                type="submit"
                disabled={resolving}
                className="w-full py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {resolving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {resolving ? 'Submitting Ruling...' : 'Finalize Ruling'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
