import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { UserCheck, Loader2, MapPin, ExternalLink } from 'lucide-react';

interface CreatorVerification {
  id: string;
  displayName: string;
  bio: string;
  skills: string[];
  city: string;
  country: string;
  portfolioUrl: string | null;
  isApproved: boolean;
  user: {
    id: string;
    email: string;
  };
}

export const VerificationQueue: React.FC = () => {
  const [creators, setCreators] = useState<CreatorVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/verification-queue');
      if (res.data?.success) {
        setCreators(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to load verification queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleApprove = async (creatorId: string) => {
    setActionLoading(creatorId);
    try {
      const res = await apiClient.post(`/api/admin/creator/approve/${creatorId}`);
      if (res.data?.success) {
        showToast('Creator profile approved and listed successfully', 'success');
        setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to approve creator', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-green-700 dark:from-white dark:via-gray-250 dark:to-green-400 bg-clip-text text-transparent">
          Creator Verification Queue
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Review newly registered content creators and authorize them to show up in the public catalog.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin w-8 h-8 text-green-500" />
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-150 dark:border-gray-850">
          No pending creator profiles require verification at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150 dark:border-gray-850 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-black text-lg">
                      {creator.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-base">{creator.displayName}</h3>
                      <p className="text-xs text-gray-400">{creator.user.email}</p>
                    </div>
                  </div>
                  <span className="flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
                    Pending Approval
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                  {creator.bio || 'No professional bio provided.'}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-gray-400 items-center">
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-green-500" />
                    {creator.city || 'Unknown'}, {creator.country || 'Unknown'}
                  </span>
                  {creator.portfolioUrl && (
                    <a
                      href={creator.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-500 hover:text-green-600 font-semibold flex items-center gap-0.5 ml-2 hover:underline"
                    >
                      Portfolio link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {creator.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {creator.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-xs rounded bg-gray-150 dark:bg-gray-900 text-gray-500 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleApprove(creator.id)}
                  disabled={actionLoading === creator.id}
                  className="w-full flex items-center justify-center py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md"
                >
                  {actionLoading === creator.id ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" /> Verify & Authorize Creator
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
