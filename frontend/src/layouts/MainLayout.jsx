import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Package, ShoppingCart,
    FileText, Settings, Menu, X, LogOut, ChevronRight, Calculator,
    Truck, Wallet
} from 'lucide-react';

const Sidebar = ({ onLogoutClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = React.useState(false);

    const handleLogout = () => {
        onLogoutClick();
    }

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/purchases', label: 'Purchases', icon: Truck },
        { path: '/inventory', label: 'Inventory', icon: Package },
        { path: '/billing', label: 'POS Billing', icon: ShoppingCart },
        { path: '/due-payments', label: 'Due Payments', icon: Wallet },
        { path: '/ledger', label: 'Accounts', icon: FileText },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white min-h-screen flex flex-col transition-all duration-300 shadow-xl z-50`}>
            {/* Header / Logo Area */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between min-h-[5rem] relative">
                {!collapsed ? (
                    <div className="overflow-hidden w-full pr-6 tracking-tight">
                        <h1 className="text-lg font-bold text-blue-400 break-words leading-tight">{user?.business_name || 'Himalayan ERP'}</h1>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">Himalayan ERP Software</p>
                    </div>
                ) : (
                    <div
                        onClick={() => setCollapsed(false)}
                        className="w-full flex justify-center cursor-pointer text-blue-400 hover:text-blue-300 transition-colors"
                        title="Expand Sidebar"
                    >
                        <Menu className="h-8 w-8" />
                    </div>
                )}

                {/* Toggle Button (Only visible when expanded) */}
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors absolute right-2"
                        title="Collapse Sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.label : ''}
                        className={({ isActive }) =>
                            `flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <div className={`${collapsed ? '' : ''}`}>
                            <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                        </div>

                        {!collapsed && (
                            <span className="font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200">
                                {item.label}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Logout Footer */}
            <div className="p-3 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    title={collapsed ? "Logout" : ""}
                    className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3 px-4'} py-3 w-full text-left text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors`}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
};

import ConfirmationModal from '../components/ConfirmationModal';

const Navbar = ({ onLogoutClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/dashboard': return 'Dashboard';
            case '/inventory': return 'Inventory Management';
            case '/billing': return 'POS Billing';
            case '/ledger': return 'Accounts & Ledger';
            case '/settings': return 'System Settings';
            default: return 'Overview';
        }
    };

    const handleLogoutClick = () => {
        onLogoutClick();
    };

    return (
        <>
            <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-40 bg-opacity-90 backdrop-blur-md border-b border-gray-100">
                {/* Left: Title & Breadcrumbs */}
                <div className="flex flex-col">
                    <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                        {getPageTitle(location.pathname)}
                    </h2>
                    <div className="text-[11px] font-medium text-gray-400 flex items-center space-x-1 mt-0.5 uppercase tracking-wide">
                        <span>Portal</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-blue-500">{getPageTitle(location.pathname)}</span>
                    </div>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center space-x-6">

                    {/* Date & Time Widget */}
                    <div className="hidden md:flex flex-col items-end mr-4 border-r border-gray-100 pr-6">
                        <span className="text-sm font-bold text-gray-800 font-mono tracking-tight">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    {/* Icons */}
                    <div className="flex items-center space-x-3 text-gray-400">
                        <button className="p-2 hover:bg-blue-50 hover:text-blue-500 rounded-full transition duration-300 relative group">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white group-hover:animate-pulse"></span>
                        </button>
                        <button className="p-2 hover:bg-indigo-50 hover:text-indigo-500 rounded-full transition duration-300">
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>

                    {/* User Profile Dropdown */}
                    <div className="flex items-center space-x-3 pl-2 border-l border-gray-100 ml-2">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-gray-800 leading-none">{user?.username || 'Admin'}</div>
                            <div className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-wider">{user?.role || 'Administrator'}</div>
                        </div>
                        <div className="relative group cursor-pointer">
                            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200 transform group-hover:scale-105 transition-all duration-300 border-2 border-white">
                                {user?.username?.[0]?.toUpperCase() || 'A'}
                            </div>

                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50 p-2">
                                <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>
                                </div>
                                <button onClick={() => navigate('/settings')} className="flex items-center w-full px-3 py-2.5 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors font-medium">
                                    <Settings className="h-4 w-4 mr-3" /> System Settings
                                </button>
                                <button onClick={handleLogoutClick} className="flex items-center w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium mt-1">
                                    <LogOut className="h-4 w-4 mr-3" /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

const MainLayout = () => {
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const confirmLogout = () => {
        logout();
        navigate('/login');
        setShowLogoutConfirm(false);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Sign Out"
                message="Are you sure you want to end your session securely?"
                confirmText="Sign Out"
                isDanger={true}
            />
            <Sidebar onLogoutClick={() => setShowLogoutConfirm(true)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Navbar onLogoutClick={() => setShowLogoutConfirm(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-6 scroll-smooth">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
