import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { Sparkles, Loader2, Clipboard, Check, Save } from 'lucide-react';

export const CreatorAiSuggestions: React.FC = () => {
  const [profile, setProfile] = useState<{ displayName: string; bio: string; skills: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/user-profile');
      if (res.data?.success) {
        setProfile(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const getAiSuggestions = async () => {
    setAiLoading(true);
    setSuggestion(null);
    try {
      const res = await apiClient.get('/api/user-profile/ai-suggestions');
      if (res.data?.success) {
        // Suggestions returned in data.suggestions (based on UserProfileController.getAiSuggestions)
        setSuggestion(res.data.data.suggestions);
        showToast('AI profile optimization suggestions generated!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gemini AI suggestion query failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!suggestion) return;
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplySuggestion = async () => {
    if (!suggestion || !profile) return;
    setSaving(true);
    try {
      const res = await apiClient.put('/api/user-profile', {
        displayName: profile.displayName,
        bio: suggestion,
        skills: profile.skills
      });
      if (res.data?.success) {
        showToast('AI optimized bio successfully written to profile!', 'success');
        setProfile((prev) => prev ? { ...prev, bio: suggestion } : prev);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update profile bio', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-green-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-purple-600 dark:from-white dark:via-gray-200 dark:to-purple-400 bg-clip-text text-transparent">
          AI Profile Optimization Suggestions
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Optimize your portfolio bio and highlight tags for maximum customer attraction using Gemini AI models.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: Current Profile Bio */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150 dark:border-gray-850 space-y-4">
          <h3 className="text-lg font-bold">Your Current Profile Details</h3>
          
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-gray-400">Display Name</span>
            <div className="text-sm font-semibold p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
              {profile?.displayName || 'No display name configured'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-gray-400">Current Bio Description</span>
            <div className="text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-xl min-h-[140px] whitespace-pre-wrap leading-relaxed text-gray-600 dark:text-gray-300">
              {profile?.bio || 'No bio configured yet. Generate recommendations below to populate!'}
            </div>
          </div>

          <button
            onClick={getAiSuggestions}
            disabled={aiLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            {aiLoading ? 'Analyzing Profile...' : 'Generate Bio Recommendations'}
          </button>
        </div>

        {/* Right Card: Optimized Suggestion Output */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150 dark:border-gray-850 space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" /> Gemini Recommendations
              </h3>
              {suggestion && (
                <button
                  onClick={handleCopyToClipboard}
                  className="p-2 bg-gray-50 hover:bg-gray-150 dark:bg-gray-900 dark:hover:bg-gray-850 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="text-sm p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl min-h-[220px] whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-200">
              {suggestion || 'Generate recommendations first to view optimized suggestions here.'}
            </div>
          </div>

          {suggestion && (
            <button
              onClick={handleApplySuggestion}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 mt-4"
            >
              {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
              {saving ? 'Writing Bio...' : 'Apply Optimization to Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
