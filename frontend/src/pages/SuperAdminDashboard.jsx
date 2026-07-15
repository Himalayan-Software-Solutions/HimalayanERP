import React, { useState, useEffect } from 'react';
import { Shield, Users, Briefcase, Activity, Plus, MoreVertical, Pause, XCircle, RefreshCcw, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AddBusinessModal from '../components/AddBusinessModal';
import ConfirmationModal from '../components/ConfirmationModal';

const SuperAdminDashboard = () => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Action States
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [passwordResetModal, setPasswordResetModal] = useState({ isOpen: false, businessId: null, name: '' });
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, businessId: null, name: '' });

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        suspended: 0,
        deactivated: 0
    });

    const fetchBusinesses = async () => {
        try {
            const response = await api.get('/superadmin/businesses');
            setBusinesses(response.data);

            // Calculate stats
            const currentStats = { total: response.data.length, active: 0, suspended: 0, deactivated: 0 };
            response.data.forEach(b => {
                if (b.status === 'Active') currentStats.active++;
                else if (b.status === 'Suspended') currentStats.suspended++;
                else if (b.status === 'Deactivated') currentStats.deactivated++;
            });
            setStats(currentStats);

        } catch (error) {
            toast.error('Failed to load businesses');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const toggleStatus = async (id, currentStatus, targetStatus) => {
        const newStatus = targetStatus || (currentStatus === 'Active' ? 'Suspended' : 'Active');
        try {
            setActionLoading(id);
            await api.put(`/superadmin/businesses/${id}/status`, { status: newStatus });
            toast.success(`Business marked as ${newStatus}`);
            fetchBusinesses();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setActionLoading(null);
            setOpenDropdownId(null);
        }
    };

    const handleDeleteBusiness = async () => {
        try {
            setActionLoading(deleteConfirmModal.businessId);
            await api.delete(`/superadmin/businesses/${deleteConfirmModal.businessId}`);
            toast.success('Business deleted successfully');
            fetchBusinesses();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete business');
        } finally {
            setActionLoading(null);
            setDeleteConfirmModal({ isOpen: false, businessId: null, name: '' });
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const newPassword = e.target.newPassword.value;
        if (!newPassword || newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        try {
            setActionLoading(passwordResetModal.businessId);
            await api.put(`/superadmin/businesses/${passwordResetModal.businessId}/reset-password`, { newPassword });
            toast.success('Password reset successfully');
            setPasswordResetModal({ isOpen: false, businessId: null, name: '' });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setActionLoading(null);
        }
    };

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header section matching mockup */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-slate-700" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Himalayan ERP - Admin Dashboard</h1>
                        <p className="text-slate-500 text-sm">Manage your business clients and software licenses</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add New Business
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-4">
                        <span className="text-sm font-medium">Total Businesses</span>
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-4">
                        <span className="text-sm font-medium">Active</span>
                        <Activity className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold text-green-500">{stats.active}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-4">
                        <span className="text-sm font-medium">Suspended</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-4 bg-yellow-500 rounded-full"></div>
                            <div className="w-1.5 h-4 bg-yellow-500 rounded-full"></div>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-yellow-500">{stats.suspended}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-4">
                        <span className="text-sm font-medium">Deactivated</span>
                        <div className="w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-red-500 transform rotate-45"></div>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-red-500">{stats.deactivated}</div>
                </div>
            </div>

            {/* Clients List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-bold text-slate-800">Business Clients</h2>
                    <p className="text-sm text-slate-500">All registered businesses using Himalayan ERP</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b text-sm text-slate-500">
                                <th className="px-6 py-4 font-medium">Business</th>
                                <th className="px-6 py-4 font-medium">Login Email</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Software Sold</th>
                                <th className="px-6 py-4 font-medium">Admin Users</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : businesses.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No businesses found.</td></tr>
                            ) : (
                                businesses.map((business) => (
                                    <tr key={business.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{business.name}</div>
                                            <div className="text-slate-500 text-xs mt-0.5">{business.owner_name}</div>
                                            <div className="text-slate-400 text-xs">{business.city ? `${business.city}, ` : ''}{business.state}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 flex items-center gap-2 mt-4">
                                            {business.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                                ${business.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    business.status === 'Suspended' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-red-50 text-red-700 border-red-200'}
                                            `}>
                                                {business.status === 'Active' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 border border-green-600"></div>}
                                                {business.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 mt-4 flex items-center gap-2">
                                            {formatDate(business.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {business.user_count}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === business.id ? null : business.id);
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${openDropdownId === business.id ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                    title="Actions"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {openDropdownId === business.id && (
                                                    <div
                                                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {business.status !== 'Suspended' && (
                                                            <button
                                                                onClick={() => toggleStatus(business.id, business.status, 'Suspended')}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-yellow-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <Pause className="w-4 h-4" /> Suspend
                                                            </button>
                                                        )}
                                                        {business.status !== 'Active' && (
                                                            <button
                                                                onClick={() => toggleStatus(business.id, business.status, 'Active')}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <Activity className="w-4 h-4" /> Activate
                                                            </button>
                                                        )}
                                                        {business.status !== 'Deactivated' && (
                                                            <button
                                                                onClick={() => toggleStatus(business.id, business.status, 'Deactivated')}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <XCircle className="w-4 h-4" /> Deactivate
                                                            </button>
                                                        )}

                                                        <div className="border-t border-gray-100 my-1"></div>

                                                        <button
                                                            onClick={() => {
                                                                setPasswordResetModal({ isOpen: true, businessId: business.id, name: business.name });
                                                                setOpenDropdownId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <RefreshCcw className="w-4 h-4" /> Reset Password
                                                        </button>

                                                        <div className="border-t border-gray-100 my-1"></div>

                                                        <button
                                                            onClick={() => {
                                                                setDeleteConfirmModal({ isOpen: true, businessId: business.id, name: business.name });
                                                                setOpenDropdownId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete Business
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <AddBusinessModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchBusinesses();
                    }}
                />
            )}

            {/* Password Reset Modal */}
            {passwordResetModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100 relative transform transition-all">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <RefreshCcw className="w-5 h-5 text-blue-500" />
                                Reset Password
                            </h3>
                            <button onClick={() => setPasswordResetModal({ isOpen: false, businessId: null, name: '' })} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-5">Set a new admin password for <span className="font-semibold text-gray-900">{passwordResetModal.name}</span>.</p>
                        <form onSubmit={handleResetPassword}>
                            <input
                                type="text"
                                name="newPassword"
                                placeholder="Enter new password"
                                required
                                minLength="6"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-5 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setPasswordResetModal({ isOpen: false, businessId: null, name: '' })} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading === passwordResetModal.businessId} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                    {actionLoading === passwordResetModal.businessId ? 'Resetting...' : 'Reset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ isOpen: false, businessId: null, name: '' })}
                onConfirm={handleDeleteBusiness}
                title="Delete Business"
                message={`Are you absolutely sure you want to delete ${deleteConfirmModal.name}? This action cannot be undone and will erase all data associated with this business!`}
                confirmText={actionLoading === deleteConfirmModal.businessId ? "Deleting..." : "Delete Business"}
                isDanger={true}
            />
        </div>
    );
};

export default SuperAdminDashboard;
