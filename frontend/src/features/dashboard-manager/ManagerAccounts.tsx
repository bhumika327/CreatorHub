import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { Users, ShieldAlert, Award, Calendar, Loader2 } from 'lucide-react';

interface SystemUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'CREATOR' | 'MANAGER';
  createdAt: string;
}

export const ManagerAccounts: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/users');
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch users list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    setUpdatingId(userId);
    try {
      const res = await apiClient.put(`/api/admin/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        showToast('User role updated successfully', 'success');
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u))
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update user role', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-green-700 dark:from-white dark:via-gray-250 dark:to-green-400 bg-clip-text text-transparent">
          System Accounts Management
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Monitor all platform user profiles, audit registration details, and reassign access roles.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin w-8 h-8 text-green-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-850 overflow-hidden transition-all duration-300">
          <div className="p-5 border-b border-gray-150 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 bg-opacity-40 flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" /> Registered Accounts List
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full">
              {users.length} Total Users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 dark:border-gray-850 text-xs uppercase font-bold text-gray-400">
                  <th className="p-4 bg-gray-50 dark:bg-gray-900">Email / User ID</th>
                  <th className="p-4 bg-gray-50 dark:bg-gray-900">Joined Date</th>
                  <th className="p-4 bg-gray-50 dark:bg-gray-900">Active Role</th>
                  <th className="p-4 bg-gray-50 dark:bg-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-850 text-sm">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-800 dark:text-white">{item.email}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.id}</div>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.role === 'MANAGER'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : item.role === 'CREATOR'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                        }`}
                      >
                        {item.role === 'MANAGER' ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : item.role === 'CREATOR' ? (
                          <Award className="w-3.5 h-3.5" />
                        ) : (
                          <Users className="w-3.5 h-3.5" />
                        )}
                        {item.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {updatingId === item.id ? (
                        <Loader2 className="animate-spin w-5 h-5 ml-auto text-green-500" />
                      ) : (
                        <select
                          value={item.role}
                          onChange={(e) => handleRoleChange(item.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="CUSTOMER">Make Customer</option>
                          <option value="CREATOR">Make Creator</option>
                          <option value="MANAGER">Make Manager</option>
                        </select>
                      )}
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
