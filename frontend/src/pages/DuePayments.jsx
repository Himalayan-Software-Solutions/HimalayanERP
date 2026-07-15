import React, { useState, useEffect } from 'react';
import { IndianRupee, Eye, Trash2, Search, Plus, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DuePayments = () => {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Current selection
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [history, setHistory] = useState([]);

    // Forms
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        gstin: '',
        due_amount: ''
    });

    const [paymentData, setPaymentData] = useState({
        amount: '',
        notes: '',
        payment_mode: 'Cash'
    });

    useEffect(() => {
        fetchDueCustomers();
    }, []);

    const fetchDueCustomers = async () => {
        try {
            const res = await api.get('/due-payments');
            setCustomers(res.data);
        } catch (error) {
            console.error('Error fetching due customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (id) => {
        try {
            const res = await api.get(`/due-payments/${id}/history`);
            setHistory(res.data);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to load payment history');
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            if (currentCustomer) {
                await api.put(`/due-payments/${currentCustomer.id}`, formData);
                toast.success('Customer updated!');
            } else {
                await api.post('/due-payments', formData);
                toast.success('Customer added!');
            }
            setShowAddModal(false);
            fetchDueCustomers();
        } catch (error) {
            toast.error('Failed to save customer');
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/due-payments/${currentCustomer.id}/pay`, paymentData);
            toast.success('Payment recorded successfully!');
            setShowPayModal(false);
            fetchDueCustomers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer? This cannot be undone.')) return;
        try {
            await api.delete(`/due-payments/${id}`);
            toast.success('Customer deleted');
            fetchDueCustomers();
        } catch (error) {
            toast.error('Failed to delete customer');
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.phone && c.phone.includes(searchQuery))
    );

    const totalDue = customers.reduce((sum, c) => sum + parseFloat(c.due_amount || 0), 0);
    const withPending = customers.filter(c => parseFloat(c.due_amount) > 0).length;

    const openAddModal = (customer = null) => {
        if (customer) {
            setCurrentCustomer(customer);
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                address: customer.address || '',
                gstin: customer.gstin || '',
                due_amount: customer.due_amount
            });
        } else {
            setCurrentCustomer(null);
            setFormData({ name: '', phone: '', address: '', gstin: '', due_amount: '' });
        }
        setShowAddModal(true);
    };

    const openPayModal = (customer) => {
        setCurrentCustomer(customer);
        setPaymentData({ amount: '', notes: '', payment_mode: 'Cash' });
        setShowPayModal(true);
    };

    const openHistoryModal = (customer) => {
        setCurrentCustomer(customer);
        fetchHistory(customer.id);
        setShowHistoryModal(true);
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Due Payments</h1>
                    <p className="text-slate-500">Track customer pending payments</p>
                </div>
                <button 
                    onClick={() => openAddModal()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                >
                    <Plus size={20} />
                    <span>Add Due Customer</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Customers</p>
                    <p className="text-2xl font-bold text-slate-800">{customers.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">With Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{withPending}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Due</p>
                    <p className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by name or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-medium">
                                <th className="p-4">Customer</th>
                                <th className="p-4">Mobile</th>
                                <th className="p-4">Address</th>
                                <th className="p-4 text-right">Due Amount</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">Loading customers...</td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">No customers found</td>
                                </tr>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800 cursor-pointer hover:underline" onClick={() => openAddModal(customer)}>{customer.name}</div>
                                            {customer.gstin && <div className="text-xs text-slate-400 mt-0.5">GST: {customer.gstin}</div>}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {customer.phone ? customer.phone : '-'}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {customer.address ? customer.address : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-semibold ${parseFloat(customer.due_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹{parseFloat(customer.due_amount).toLocaleString('en-IN', {minimumFractionDigits: 0})}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-3 text-slate-400">
                                                <button onClick={() => openPayModal(customer)} className="hover:text-green-600 transition" title="Add Payment">
                                                    <IndianRupee size={18} />
                                                </button>
                                                <button onClick={() => openHistoryModal(customer)} className="hover:text-blue-600 transition" title="View History">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(customer.id)} className="hover:text-red-500 transition" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            
            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">{currentCustomer ? 'Edit Customer' : 'Add Due Customer'}</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Enter name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="10-digit number" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="City, State" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN (Optional)</label>
                                <input type="text" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Tax Number" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Amount (₹)</label>
                                <input type="number" step="0.01" value={formData.due_amount} onChange={e => setFormData({...formData, due_amount: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0.00" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">{currentCustomer ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {showPayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Add Payment</h2>
                            <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 pt-4 pb-2 bg-slate-50">
                            <p className="text-sm text-slate-500">Customer: <span className="font-semibold text-slate-800">{currentCustomer?.name}</span></p>
                            <p className="text-sm text-slate-500">Pending Due: <span className="font-bold text-red-600">₹{parseFloat(currentCustomer?.due_amount).toLocaleString('en-IN')}</span></p>
                        </div>
                        <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount to Pay (₹) *</label>
                                <input required type="number" step="0.01" max={currentCustomer?.due_amount} value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none text-lg font-semibold text-green-700" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                                <select value={paymentData.payment_mode} onChange={e => setPaymentData({...paymentData, payment_mode: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none">
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI / QR Code</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                                <input type="text" value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none" placeholder="Cheque No, Txn ID..." />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-sm shadow-green-200">Record Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Payment History</h2>
                                <p className="text-sm text-slate-500">{currentCustomer?.name}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    No past payments for this customer.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50">
                                            <div>
                                                {parseFloat(item.amount_paid) < 0 ? (
                                                    <div className="font-semibold text-red-600">+ ₹{Math.abs(parseFloat(item.amount_paid)).toLocaleString('en-IN')} <span className="text-[10px] text-red-500 bg-red-100 px-1.5 py-0.5 rounded ml-1 tracking-wide uppercase">Debt Added</span></div>
                                                ) : (
                                                    <div className="font-semibold text-emerald-600">- ₹{Math.abs(parseFloat(item.amount_paid)).toLocaleString('en-IN')} <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded ml-1 tracking-wide uppercase">Paid</span></div>
                                                )}
                                                <div className="text-xs text-slate-500 mt-1">{new Date(item.payment_date).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-2.5 py-1 border text-xs font-semibold rounded-md mb-1 ${item.payment_mode === 'Invoice' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>{item.payment_mode}</span>
                                                {item.notes && <div className="text-xs text-slate-400 font-medium">{item.notes}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DuePayments;
