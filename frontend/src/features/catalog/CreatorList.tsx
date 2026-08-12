import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { Search, MapPin, Star, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  price: number;
  deliveryDays: number;
}

interface Creator {
  id: string;
  displayName: string;
  bio: string;
  skills: string[];
  avatarUrl: string;
  city: string;
  country: string;
  services: Service[];
  user: {
    id: string;
    email: string;
  };
}

export const CreatorList: React.FC = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Pagination details
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;
  
  const [loading, setLoading] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const { showToast } = useToast();

  const fetchCreators = async (currentPage = page) => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit
      };
      if (search.trim()) params.search = search.trim();
      if (skills.trim()) params.skills = skills.trim();
      if (city.trim()) params.city = city.trim();
      if (country.trim()) params.country = country.trim();
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);

      const res = await apiClient.get('/api/catalog/creators', { params });
      if (res.data?.success) {
        // Backend returns: { creators, total, page, limit }
        const { creators: list, total } = res.data.data;
        setCreators(list);
        setTotalRecords(total);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to retrieve creators marketplace data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced input updates effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1); // Reset page to 1 on input typing
      fetchCreators(1);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [search, skills, city, country]);

  // Fetch when page changes or manual filters are sent
  const handleManualSearch = () => {
    setPage(1);
    fetchCreators(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchCreators(newPage);
  };

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-green-700 dark:from-white dark:via-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          Browse Creative Talents
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Discover verified content creators, review service catalogs, and invite candidate bids.
        </p>
      </div>

      {/* Premium Search Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-150 dark:border-gray-850">
        <div className="relative col-span-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search brand display name or bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        <div>
          <input
            type="text"
            placeholder="Skills (e.g. Figma, React)..."
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-1/2 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-1/2 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-2/5 px-2.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <span className="text-gray-400 font-bold">-</span>
          <input
            type="number"
            placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-2/5 px-2.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <button
            onClick={handleManualSearch}
            className="w-1/5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center shadow-lg shadow-green-500/20 transition-all active:scale-95"
            title="Search"
          >
            Go
          </button>
        </div>
      </div>

      {/* Creators Grid Frame */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin w-10 h-10 text-green-500" />
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-md">
          No creators matched search parameters.
        </div>
      ) : (
        <div className="space-y-6 animate-slide-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {creators.map((creator) => (
              <div
                key={creator.id}
                className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-150 dark:border-gray-850 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      {creator.avatarUrl ? (
                        <img
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          className="w-16 h-16 rounded-2xl object-cover border border-gray-100 dark:border-gray-700 bg-white"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center text-white text-2xl font-black select-none">
                          {creator.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-black text-gray-800 dark:text-white leading-tight">
                          {creator.displayName}
                        </h3>
                        <div className="flex items-center text-[10px] text-gray-400 font-bold mt-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-green-500" />
                          {creator.city || 'Unknown'}, {creator.country || 'Unknown'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-yellow-500 font-black text-sm">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      5.0
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                    {creator.bio || 'No bio description provided.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {creator.skills.slice(0, 5).map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-750 flex justify-between items-center">
                  <div className="text-xs text-gray-400 font-bold uppercase">
                    {creator.services?.length || 0} packages active
                  </div>
                  <button
                    onClick={() => setSelectedCreator(creator)}
                    className="flex items-center text-sm font-bold text-green-500 hover:text-green-600 hover:underline"
                  >
                    View Packages & details <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Premium Pagination Control Footer */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-md">
            <span className="text-xs font-bold text-gray-400">
              Page {page} of {totalPages} ({totalRecords} matching creators found)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-350 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition-all disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-350 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition-all disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details/Invite Modal */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 animate-slide-in">
            <div className="p-6 border-b border-gray-250 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 bg-opacity-40">
              <div>
                <h3 className="text-xl font-black">{selectedCreator.displayName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedCreator.user.email}</p>
              </div>
              <button
                onClick={() => setSelectedCreator(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-gray-400">Professional Bio</span>
                <p className="text-sm text-gray-700 dark:text-gray-350 leading-relaxed whitespace-pre-wrap">
                  {selectedCreator.bio}
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs uppercase font-bold text-gray-400 block">Available Service Packages</span>
                <div className="grid grid-cols-1 gap-3">
                  {selectedCreator.services?.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-4 italic border border-dashed rounded-2xl">
                      No service packages listed yet.
                    </div>
                  ) : (
                    selectedCreator.services?.map((service) => (
                      <div
                        key={service.id}
                        className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-2xl flex justify-between items-center hover:shadow-sm transition-shadow"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-800 dark:text-white">{service.title}</p>
                          <p className="text-xs text-gray-400 mt-1">Delivery: {service.deliveryDays} Days</p>
                        </div>
                        <span className="font-black text-green-500 text-lg">${service.price}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
