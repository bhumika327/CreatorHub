import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { Loader2, Plus, Upload, Save, Edit2, Eye, MapPin, Globe, ExternalLink } from 'lucide-react';

interface Service {
  id?: string;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  category: string;
}

interface CreatorProfile {
  id?: string;
  displayName: string;
  bio: string;
  skills: string[];
  hourlyRate: number | null;
  portfolioUrl: string | null;
  avatarUrl: string | null;
  services: Service[];
  city?: string;
  country?: string;
}

export const CreatorPortfolio: React.FC = () => {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // New service form
  const [newService, setNewService] = useState<Service>({
    title: '',
    description: '',
    price: 0,
    deliveryDays: 1,
    category: ''
  });
  const [addingService, setAddingService] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/user-profile');
      if (res.data?.success && res.data.data) {
        setProfile(res.data.data);
        if (res.data.data.avatarUrl) setAvatarPreview(res.data.data.avatarUrl);
      } else {
        setProfile({
          displayName: '',
          bio: '',
          skills: [],
          hourlyRate: null,
          portfolioUrl: null,
          avatarUrl: null,
          services: []
        });
      }
    } catch (err) {
      setProfile({
        displayName: '',
        bio: '',
        skills: [],
        hourlyRate: null,
        portfolioUrl: null,
        avatarUrl: null,
        services: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    // Frontend validations
    if (!profile.displayName.trim()) {
      showToast('Display Name is required', 'warning');
      return;
    }
    if (profile.bio.length > 0 && profile.bio.length < 15) {
      showToast('Bio description must be at least 15 characters long', 'warning');
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = profile.avatarUrl;

      // Handle avatar upload via Cloudinary base64
      if (avatarFile) {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(avatarFile);
        const uploadedUrl = await new Promise<string>((resolve, reject) => {
          fileReader.onload = async () => {
            try {
              const uploadRes = await apiClient.post('/api/catalog/upload-media', {
                image: fileReader.result
              });
              if (uploadRes.data?.success) {
                resolve(uploadRes.data.data.url);
              } else {
                reject(new Error('Upload failed'));
              }
            } catch (e) {
              reject(e);
            }
          };
          fileReader.onerror = () => reject(fileReader.error);
        });
        avatarUrl = uploadedUrl;
      }

      const payload = {
        displayName: profile.displayName,
        bio: profile.bio,
        skills: profile.skills,
        avatarUrl
      };

      const res = await apiClient.put('/api/user-profile', payload);

      if (res.data?.success) {
        setProfile((prev) => (prev ? { ...prev, ...res.data.data } : prev));
        showToast('Profile saved successfully!', 'success');
        setAvatarFile(null);
        setIsEditing(false); // Return to preview mode on success
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save profile.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || !profile) return;
    if (profile.skills.includes(trimmed)) {
      showToast('Skill already added', 'warning');
      return;
    }
    setProfile((prev) => (prev ? { ...prev, skills: [...prev.skills, trimmed] } : prev));
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setProfile((prev) => (prev ? { ...prev, skills: prev.skills.filter((s) => s !== skill) } : prev));
  };

  const handleAddService = async () => {
    // Validations
    if (!newService.title.trim()) {
      showToast('Service package title is required', 'warning');
      return;
    }
    if (newService.price <= 0) {
      showToast('Price must be a positive amount', 'warning');
      return;
    }
    if (newService.deliveryDays <= 0) {
      showToast('Delivery Days must be at least 1 day', 'warning');
      return;
    }

    setAddingService(true);
    try {
      const res = await apiClient.post('/api/user-profile/services', newService);
      if (res.data?.success) {
        setProfile((prev) => (prev ? { ...prev, services: [...prev.services, res.data.data] } : prev));
        setNewService({ title: '', description: '', price: 0, deliveryDays: 1, category: '' });
        setShowServiceForm(false);
        showToast('Service package added successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to add service package', 'error');
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Delete this service package?')) return;
    try {
      const res = await apiClient.delete(`/api/user-profile/services/${serviceId}`);
      if (res.data?.success) {
        setProfile((prev) => (prev ? { ...prev, services: prev.services.filter((s) => s.id !== serviceId) } : prev));
        showToast('Service package deleted', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete service package', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-green-500" /></div>;
  if (!profile) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-green-700 dark:from-white dark:via-gray-200 dark:to-green-400 bg-clip-text text-transparent">
            Creator Studio Portfolio
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Configure your brand details, services packages, and view your public marketplace listing card.
          </p>
        </div>
        
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
            isEditing
              ? 'bg-gray-150 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-250'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isEditing ? (
            <>
              <Eye className="w-4 h-4" /> View Public Profile
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" /> Edit Profile Info
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* VIEW PREVIEW MODE CARD */}
        {!isEditing ? (
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
              {/* Cover Gradient Cover banner */}
              <div className="h-32 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600" />
              
              <div className="px-8 pb-8 relative">
                {/* Avatar positioning */}
                <div className="relative -mt-16 mb-4">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="creator-avatar"
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-white dark:border-gray-800 shadow-lg bg-white"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-3xl bg-green-500 flex items-center justify-center text-white text-5xl font-black border-4 border-white dark:border-gray-800 shadow-lg select-none">
                      {profile.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Bio & Skills details */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <h3 className="text-2xl font-black text-gray-800 dark:text-white">
                        {profile.displayName || 'Unnamed Studio'}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-bold mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-green-500" />
                          {profile.city || 'Location resolved resolved'}, {profile.country || 'silently'}
                        </span>
                        {profile.portfolioUrl && (
                          <a
                            href={profile.portfolioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-green-500 hover:underline"
                          >
                            <Globe className="w-3.5 h-3.5" /> Website link <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs uppercase font-bold text-gray-400">About Me</span>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {profile.bio || 'Your bio is currently empty. Click "Edit Profile Info" at the top right to write details about your expertise!'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs uppercase font-bold text-gray-400 block">Skills list</span>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No skills listed yet</span>
                        ) : (
                          profile.skills.map((s) => (
                            <span
                              key={s}
                              className="px-3 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full border border-green-200 dark:border-green-900"
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Public services listings */}
                  <div className="lg:col-span-1 space-y-4 bg-gray-50 dark:bg-gray-900 bg-opacity-40 p-6 rounded-2xl border border-gray-150 dark:border-gray-850">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="font-bold text-sm uppercase text-gray-400">Service Packages</span>
                    </div>

                    <div className="space-y-3">
                      {profile.services.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No services listed yet.</p>
                      ) : (
                        profile.services.map((s) => (
                          <div key={s.id} className="p-3 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-850 rounded-xl flex justify-between items-center shadow-sm">
                            <div>
                              <p className="font-bold text-xs text-gray-800 dark:text-white truncate max-w-[120px]">{s.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{s.deliveryDays} days delivery</p>
                            </div>
                            <span className="text-green-500 font-black text-sm">${s.price}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT PROFILE PANEL FORM MODE */
          <>
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-lg space-y-4">
                <div className="flex flex-col items-center space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-pointer group border-4 border-green-500 shadow-md"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-black select-none">
                        {profile.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-40 hidden group-hover:flex items-center justify-center transition-all">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <p className="text-xs text-gray-400">Click avatar image to upload cover</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile((p) => (p ? { ...p, displayName: e.target.value } : p))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Brand or Studio Name"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Bio & Skills */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-lg space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Studio Bio</label>
                  <textarea
                    rows={4}
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : p))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none leading-relaxed"
                    placeholder="Explain what vector logo, video editing, or voice over assets you specialize in..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-gray-400">Add Skills</label>
                  <div className="flex flex-wrap gap-1.5 min-h-6">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center px-3 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full text-xs font-bold border border-green-200 dark:border-green-900"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-green-500 hover:text-red-500 font-bold transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      className="flex-1 px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
                      placeholder="e.g. Figma"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Service Packages Setup */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                  <label className="block text-xs font-bold uppercase text-gray-400">Configure Service Packages</label>
                  <button
                    onClick={() => setShowServiceForm(!showServiceForm)}
                    className="flex items-center text-xs font-bold text-green-500 hover:underline"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Package Option
                  </button>
                </div>

                <div className="space-y-3">
                  {profile.services.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-850 flex justify-between items-center hover:shadow-sm transition-shadow"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-800 dark:text-white">{service.title}</p>
                        <p className="text-xs text-gray-400">
                          {service.category} · {service.deliveryDays} Days delivery
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-green-500 text-lg">${service.price}</span>
                        <button
                          onClick={() => service.id && handleDeleteService(service.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-500 text-xs font-bold rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {showServiceForm && (
                  <div className="p-4 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 rounded-2xl space-y-4 mt-4 animate-slide-in">
                    <h4 className="text-xs font-bold uppercase text-green-600 dark:text-green-400">New Pricing Package</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Package Title"
                        value={newService.title}
                        onChange={(e) => setNewService((s) => ({ ...s, title: e.target.value }))}
                        className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={newService.category}
                        onChange={(e) => setNewService((s) => ({ ...s, category: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Price ($)"
                        value={newService.price || ''}
                        onChange={(e) => setNewService((s) => ({ ...s, price: Number(e.target.value) }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Delivery Days"
                        value={newService.deliveryDays || ''}
                        onChange={(e) => setNewService((s) => ({ ...s, deliveryDays: Number(e.target.value) }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <textarea
                        placeholder="Package deliverable description details..."
                        value={newService.description}
                        onChange={(e) => setNewService((s) => ({ ...s, description: e.target.value }))}
                        className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 h-20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddService}
                        disabled={addingService}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                      >
                        {addingService ? 'Saving Service...' : 'Save Package'}
                      </button>
                      <button
                        onClick={() => setShowServiceForm(false)}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving changes...' : 'Save Profile Settings'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
