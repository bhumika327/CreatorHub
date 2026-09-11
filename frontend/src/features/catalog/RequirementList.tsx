import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { Search, MapPin, Send, ArrowRight } from 'lucide-react';

interface Requirement {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  tags: string[];
  city: string;
  country: string;
  customerId: string;
}

export const RequirementList: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);

  // Proposal Form details
  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState<string>('');
  const [deliveryDays, setDeliveryDays] = useState<string>('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (category) params.category = category;

      const res = await apiClient.get('/api/catalog/requirements', { params });
      if (res.data?.success) {
        setRequirements(res.data.data);
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

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    setSubmitLoading(true);

    try {
      const res = await apiClient.post(`/api/engagement/bid/${selectedReq.id}`, {
        coverLetter,
        bidAmount: Number(bidAmount),
        deliveryDays: Number(deliveryDays)
      });

      if (res.data?.success) {
        setSuccessMsg('Proposal submitted successfully! The customer will review your bid.');
        setCoverLetter('');
        setBidAmount('');
        setDeliveryDays('');
        setTimeout(() => {
          setSelectedReq(null);
          setSuccessMsg(null);
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit bid proposal.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Open Work Opportunities</h2>
        <p className="text-gray-500 dark:text-gray-400">Review project requirements posted by customers and pitch your services.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="Filter category..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-64 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <button
          onClick={fetchRequirements}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-bold"
        >
          Search
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">Loading requirements queue...</div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No active client requirements listed.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requirements.map((req) => (
            <div key={req.id} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-150 dark:border-gray-850 hover:shadow-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                    {req.category}
                  </span>
                  <div className="flex items-center text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    {req.city || 'Unknown'}, {req.country || 'Unknown'}
                  </div>
                </div>
                <h3 className="text-xl font-bold">{req.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-3xl">{req.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {req.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-900 text-gray-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 space-y-3 w-full md:w-auto border-t md:border-t-0 border-gray-100 dark:border-gray-700 pt-3 md:pt-0">
                <div>
                  <span className="text-xs text-gray-400 uppercase">Budget</span>
                  <div className="text-2xl font-black text-green-600 dark:text-green-400">${req.budget}</div>
                </div>
                <button
                  onClick={() => setSelectedReq(req)}
                  className="flex items-center w-full md:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors"
                >
                  Apply & Pitch <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pitch Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-green-600 uppercase">{selectedReq.category}</span>
                <h3 className="text-xl font-bold">{selectedReq.title}</h3>
              </div>
              <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <form onSubmit={handleBidSubmit} className="p-6 space-y-4">
              {successMsg && (
                <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-300 rounded-lg">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Proposal Pitch / Cover Letter</label>
                <textarea
                  required
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Explain why you are the best fit for this project..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Your Bid Price ($)</label>
                  <input
                    type="number"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="250"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Delivery Time (Days)</label>
                  <input
                    type="number"
                    required
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="4"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitLoading ? 'Sending Pitch...' : 'Submit Pitch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
