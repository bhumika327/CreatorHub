import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { Shield, CheckSquare, Square, RefreshCw } from 'lucide-react';

const ALL_SYSTEM_PERMISSIONS = [
  'profile:read',
  'profile:write',
  'requirement:create',
  'requirement:read',
  'requirement:write',
  'proposal:create',
  'proposal:read',
  'proposal:accept',
  'engagement:read',
  'engagement:complete',
  'chat:read',
  'chat:send',
  'payment:pay',
  'payment:refund',
  'review:create',
  'review:read',
  'ai:suggest',
  'user:manage',
  'creator:approve',
  'dispute:resolve'
];

export const PermissionGrid: React.FC = () => {
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({
    CUSTOMER: [],
    CREATOR: [],
    MANAGER: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchRolePermissions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/rbac/permissions');
      if (res.data?.success) {
        setRoleMap(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolePermissions();
  }, []);

  const handleToggle = async (role: string, permissionName: string) => {
    const isCurrentlyActive = roleMap[role]?.includes(permissionName);
    const key = `${role}-${permissionName}`;
    setSaving(key);

    try {
      const res = await apiClient.put('/api/rbac/permissions/role', {
        role,
        permissionName,
        active: !isCurrentlyActive
      });

      if (res.data?.success) {
        // Update local state immediately
        setRoleMap((prev) => {
          const list = prev[role] || [];
          const updated = isCurrentlyActive
            ? list.filter((p) => p !== permissionName)
            : [...list, permissionName];
          return { ...prev, [role]: updated };
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update permission mapping.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dynamic RBAC Matrix</h2>
        <p className="text-gray-500 dark:text-gray-400">Configure permission authorization bounds for system roles. Changes apply instantly.</p>
      </div>

      {loading ? (
        <div>Loading permissions maps...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-150 dark:border-gray-850 overflow-hidden">
          <div className="p-4 border-b border-gray-150 dark:border-gray-850 flex justify-between items-center bg-gray-50 dark:bg-gray-900 bg-opacity-50">
            <h3 className="font-bold flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-500" />
              Role Authorization Controller
            </h3>
            <button
              onClick={fetchRolePermissions}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 dark:border-gray-850 text-xs uppercase font-bold text-gray-400">
                  <th className="p-4 bg-gray-50 dark:bg-gray-900">System Capability / Permission</th>
                  <th className="p-4 text-center bg-gray-50 dark:bg-gray-900">Customer</th>
                  <th className="p-4 text-center bg-gray-50 dark:bg-gray-900">Creator</th>
                  <th className="p-4 text-center bg-gray-50 dark:bg-gray-900">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-850 text-sm">
                {ALL_SYSTEM_PERMISSIONS.map((perm) => (
                  <tr key={perm} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="p-4 font-mono text-xs">{perm}</td>
                    {/* CUSTOMER */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggle('CUSTOMER', perm)}
                        disabled={saving !== null}
                        className="inline-block p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-850 text-green-600 focus:outline-none"
                      >
                        {roleMap['CUSTOMER']?.includes(perm) ? (
                          <CheckSquare className="w-5 h-5 mx-auto" />
                        ) : (
                          <Square className="w-5 h-5 mx-auto text-gray-400" />
                        )}
                      </button>
                    </td>
                    {/* CREATOR */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggle('CREATOR', perm)}
                        disabled={saving !== null}
                        className="inline-block p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-850 text-green-600 focus:outline-none"
                      >
                        {roleMap['CREATOR']?.includes(perm) ? (
                          <CheckSquare className="w-5 h-5 mx-auto" />
                        ) : (
                          <Square className="w-5 h-5 mx-auto text-gray-400" />
                        )}
                      </button>
                    </td>
                    {/* MANAGER */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggle('MANAGER', perm)}
                        disabled={saving !== null}
                        className="inline-block p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-850 text-green-600 focus:outline-none"
                      >
                        {roleMap['MANAGER']?.includes(perm) ? (
                          <CheckSquare className="w-5 h-5 mx-auto" />
                        ) : (
                          <Square className="w-5 h-5 mx-auto text-gray-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
