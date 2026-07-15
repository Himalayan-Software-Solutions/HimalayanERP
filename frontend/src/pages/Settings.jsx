import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Save, Building2, CreditCard, User, PenTool, X, Upload } from 'lucide-react';

const Settings = () => {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        business_name: '',
        owner_name: '',
        gstin: '',
        contacts: '',
        email: '',
        address: '',
        signatory_name: '',
        bank_name: '',
        bank_branch: '',
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        blessing_left: '',
        blessing_center: '',
        blessing_right: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            console.log('API Response:', response);
            if (response.data) {
                console.log('Fetched settings:', response.data);
                toast.success('Settings loaded successfully');
                setSettings(response.data);
            } else {
                toast.error('Response data is empty');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error(`Failed to load: ${error.message}`);
        }
    };

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSignatureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('signature', file);

        try {
            const toastId = toast.loading('Uploading signature...');
            const response = await api.post('/settings/upload-signature', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSettings({ ...settings, signature_path: response.data.signature_path });
            toast.success('Signature uploaded!', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/settings', settings);

            // Sync context dynamically
            if (user && settings.business_name && user.business_name !== settings.business_name) {
                const updatedUser = { ...user, business_name: settings.business_name };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            toast.success('Settings updated successfully!');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    console.log('Settings State during render:', settings);

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto p-2">
            <h1 className="text-2xl font-bold text-gray-800">Shop Settings</h1>

            <form onSubmit={handleSubmit} className="space-y-6 pb-10">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-2 border-b pb-3 mb-4">
                        <Building2 className="text-blue-600 h-6 w-6" />
                        <h2 className="text-lg font-bold text-gray-700">Business Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Business Name</label>
                            <input
                                type="text"
                                name="business_name"
                                value={settings.business_name || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Owner Name</label>
                            <input
                                type="text"
                                name="owner_name"
                                value={settings.owner_name || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">GSTIN</label>
                            <input
                                type="text"
                                name="gstin"
                                value={settings.gstin || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Contacts</label>
                            <input
                                type="text"
                                name="contacts"
                                value={settings.contacts || ''}
                                onChange={handleChange}
                                placeholder="e.g. 98160-XXXXX, 98160-YYYYY"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={settings.email || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Business Description</label>
                            <textarea
                                name="business_description"
                                value={settings.business_description || ''}
                                onChange={handleChange}
                                rows="2"
                                placeholder="e.g. Deals in all kinds of Hardware & Electrical Goods"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Address</label>
                            <textarea
                                name="address"
                                value={settings.address || ''}
                                onChange={handleChange}
                                rows="3"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Terms & Conditions</label>
                            <textarea
                                name="terms_and_conditions"
                                value={settings.terms_and_conditions || ''}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Enter invoice terms (one per line)..."
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Auspicious Blessings Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-2 border-b pb-3 mb-4">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Auspicious Blessings</h2>
                            <p className="text-sm text-gray-500">Add divine names or blessings to display at the top of invoices</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Left Side</label>
                            <input
                                type="text"
                                name="blessing_left"
                                value={settings.blessing_left || ''}
                                onChange={handleChange}
                                placeholder="ॐ गणेशाय नमः"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Center</label>
                            <input
                                type="text"
                                name="blessing_center"
                                value={settings.blessing_center || ''}
                                onChange={handleChange}
                                placeholder="जय माता दी"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Right Side</label>
                            <input
                                type="text"
                                name="blessing_right"
                                value={settings.blessing_right || ''}
                                onChange={handleChange}
                                placeholder="ॐ नमः शिवाय"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">These blessings will appear at the top of every invoice</p>
                </div>

                {/* Signature Upload Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <PenTool className="text-purple-600 h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Authorised Signatory</h2>
                            <p className="text-sm text-gray-500">Upload signature image for invoices (JPG or PNG)</p>
                        </div>
                    </div>

                    <div className="mt-4">
                        {settings.signature_path ? (
                            <div className="relative inline-block border rounded-lg p-1">
                                <img
                                    src={`http://localhost:5000${settings.signature_path}`}
                                    alt="Signature"
                                    className="h-24 w-auto object-contain bg-gray-50 rounded"
                                />
                                <button
                                    onClick={() => setSettings({ ...settings, signature_path: '' })}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : (
                            <div className="h-24 w-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                                No Signature Uploaded
                            </div>
                        )}

                        <div className="mt-4">
                            <input
                                id="signature-upload"
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={handleSignatureUpload}
                                className="hidden"
                            />
                            <label
                                htmlFor="signature-upload"
                                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-gray-300 shadow-sm"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Change Image
                            </label>
                            <p className="text-xs text-gray-500 mt-2">Max file size: 2MB. Supported formats: JPG, PNG</p>
                        </div>
                    </div>
                </div>

                {/* Bank Details Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-2 border-b pb-3 mb-4">
                        <CreditCard className="text-green-600 h-6 w-6" />
                        <h2 className="text-lg font-bold text-gray-700">Bank Details</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Bank Name</label>
                            <input
                                type="text"
                                name="bank_name"
                                value={settings.bank_name || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Branch</label>
                            <input
                                type="text"
                                name="bank_branch"
                                value={settings.bank_branch || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Account Holder Name</label>
                            <input
                                type="text"
                                name="account_holder_name"
                                value={settings.account_holder_name || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Account Number</label>
                            <input
                                type="text"
                                name="account_number"
                                value={settings.account_number || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">IFSC Code</label>
                            <input
                                type="text"
                                name="ifsc_code"
                                value={settings.ifsc_code || ''}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        <span>{loading ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
