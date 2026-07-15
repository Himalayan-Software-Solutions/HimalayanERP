import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const SuperAdminLayout = () => {
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
        setShowLogoutConfirm(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Sign Out"
                message="Are you sure you want to end your session securely?"
                confirmText="Sign Out"
                isDanger={true}
            />
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-white mb-2">
                        <div className="bg-orange-500 p-2 rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Himalayan ERP</h1>
                            <p className="text-xs text-slate-400">Software Company</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <NavLink
                        to="/superadmin"
                        end
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                            ${isActive
                                ? 'bg-slate-800 text-orange-500 border-l-4 border-orange-500'
                                : 'hover:bg-slate-800 hover:text-white'}
                        `}
                    >
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-medium">Business Management</span>
                    </NavLink>
                </nav>

                <div className="p-4 mt-auto border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white">
                            {user?.username?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-medium text-white truncate">{user?.username}</div>
                            <div className="text-xs text-slate-500">Software Owner</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 flex flex-col">
                <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md text-sm">
                            <span>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md text-sm">
                            <Building2 className="w-4 h-4" />
                            <span>Software Company Admin</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm font-semibold text-slate-800">Himalayan ERP</div>
                                <div className="text-xs text-slate-500">{user?.username}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold">
                                {user?.username?.[0]?.toUpperCase() || 'S'}
                            </div>
                        </div>
                    </div>
                </header>
                <div className="p-8 pb-20">
                    <Outlet />
                </div>
            </main>
        </div >
    );
};

export default SuperAdminLayout;
