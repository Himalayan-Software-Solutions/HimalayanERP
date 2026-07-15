import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Mountain } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left Side - Branding (Hidden on Mobile) */}
            <div className="hidden md:flex md:w-1/2 bg-[#1b2a47] flex-col justify-center px-16 relative overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 right-10 w-96 h-96 bg-white opacity-5 rounded-full translate-y-1/3 translate-x-1/4"></div>

                <div className="relative z-10">
                    <div className="bg-[#e67e22] w-14 h-14 rounded-xl flex items-center justify-center mb-8 shadow-lg">
                        <Mountain className="text-white w-8 h-8" />
                    </div>

                    <h1 className="text-5xl font-bold text-white mb-4">Himalayan ERP</h1>
                    <p className="text-gray-300 text-lg mb-10 text-opacity-90">Complete Hardware & Building Materials Management System</p>

                    <ul className="space-y-4">
                        {[
                            'Inventory Management',
                            'Point of Sale Billing',
                            'Accounts & Transactions',
                            'Sales Reports & Analytics',
                            'Cloud Sync Across All Devices'
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-center text-gray-300 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e67e22] mr-3"></span>
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                        <p className="text-gray-500 text-sm">Please enter your credentials to continue</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-gray-700 text-xs font-semibold mb-2 ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent transition-all text-sm bg-white shadow-sm"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 text-xs font-semibold mb-2 ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent transition-all text-sm bg-white shadow-sm"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#e67e22] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#d67118] transition duration-200 shadow-sm"
                        >
                            Sign In
                        </button>
                    </form>

                    <div className="mt-8 text-center text-left">
                        <p className="text-xs text-gray-500 text-center">Contact your administrator if you need an account</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
