import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors flex flex-col font-sans">
      {/* Header Panel */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-70 dark:bg-gray-950 dark:bg-opacity-70 backdrop-blur-md border-b border-gray-100 dark:border-gray-900 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-green-500/20">
              C
            </div>
            <span className="text-xl font-black tracking-wider text-green-600 dark:text-green-400">
              CreatorHub
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4.5 py-2 text-sm font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/20 hover:scale-102 transform active:scale-98 transition-all"
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-green-50/20 via-transparent to-blue-50/20 dark:from-green-950/10 dark:to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 rounded-full border border-green-150 dark:border-green-900/60">
            <Sparkles className="w-3.5 h-3.5" /> Next-Generation Creator Marketplace
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Hire Content Talents with{' '}
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Bulletproof Escrow
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            The decentralized-feel escrow workflow for marketers and creative professionals. Post requirements, verify candidate profiles, and unlock ledger funds upon work approval.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-xl shadow-green-500/20 hover:scale-102 transform active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              Start Hiring <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Explore Talents
            </button>
          </div>
        </div>
      </section>

      {/* Feature Grids */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900 bg-opacity-40 border-y border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">How CreatorHub Works</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A secure, dual-sided workflow ensuring clients only pay for approved deliverables, and creators are guaranteed funds before start.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-md space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">1. Find Hired Matches</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Post requirement posts detailing budgets and category specs. Approved creators bid on your posts with delivery times and details.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-md space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">2. Secure Escrow Hold</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Accepting a creator's proposal locks the bid amount from your wallet balance into the project escrow. Funds are safe and guaranteed.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-md space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">3. Review & Release</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Chat securely on the platform. Once the creator delivers, click release to pay them, or raise a dispute for manager arbitration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Block */}
      <footer className="mt-auto border-t border-gray-100 dark:border-gray-900 py-8 px-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} CreatorHub Inc. Built with premium escrow ledgers and security overrides.</p>
      </footer>
    </div>
  );
};
