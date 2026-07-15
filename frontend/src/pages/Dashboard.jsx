import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Package, AlertTriangle, TrendingUp, Calendar, DollarSign } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/reports/dashboard');
                setStats(response.data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-8">Loading stats...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Hi, Welcome back!</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Products"
                    value={stats?.totalProducts || 0}
                    icon={Package}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={stats?.lowStockCount || 0}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    subtext="Items below minimum stock level"
                />
                <StatCard
                    title="Today's Sales"
                    value={`₹${stats?.sales?.today || 0}`}
                    icon={TrendingUp}
                    color="bg-green-500"
                />
                <StatCard
                    title="Monthly Sales"
                    value={`₹${stats?.sales?.month || 0}`}
                    icon={Calendar}
                    color="bg-purple-500"
                />
            </div>

            {/* Placeholder for Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Sales Overview</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-400">Sales Chart Visualization (Coming Soon)</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
