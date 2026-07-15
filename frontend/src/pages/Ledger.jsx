import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Trash2, Edit, TrendingUp, DollarSign, Calendar, X, Save, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { generatePDF } from '../utils/pdfGenerator';

const Ledger = () => {
    const [entries, setEntries] = useState([]);
    const [stats, setStats] = useState({
        total_sales: 0, total_profit: 0,
        weekly_sales: 0, weekly_profit: 0,
        monthly_sales: 0, monthly_profit: 0,
        yearly_sales: 0, yearly_profit: 0
    });
    const [loading, setLoading] = useState(true);
    const [shopSettings, setShopSettings] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editForm, setEditForm] = useState({
        customer_name: '', customer_phone: '', customer_address: '', gstin: '', payment_mode: '', date: '', invoice_number: '', eway_bill_no: '',
        items: [], freight_charges: 0, labour_charges: 0, driver_name: '', transport_no: ''
    });
    const [isInterState, setIsInterState] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [searchTerm, dateRange]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            setShopSettings(res.data);
        } catch (error) {
            console.error("Error fetching settings", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                search: searchTerm,
                ...(dateRange.start && { startDate: dateRange.start }),
                ...(dateRange.end && { endDate: dateRange.end })
            });

            const [ledgerRes, statsRes] = await Promise.all([
                api.get(`/ledger?${queryParams}`),
                api.get('/ledger/stats')
            ]);
            setEntries(ledgerRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, invoiceNo) => {
        if (!window.confirm(`Are you sure you want to delete Invoice ${invoiceNo}? This will delete the invoice, restore stock, and remove the ledger entry. This action cannot be undone.`)) {
            return;
        }
        try {
            await api.delete(`/invoices/${id}`);
            toast.success(`Invoice ${invoiceNo} deleted successfully`);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete invoice");
        }
    };

    const handleView = async (entry) => {
        if (!entry.invoice_id) return;
        try {
            // Check if stored PDF exists
            if (entry.pdf_path) {
                window.open(`http://localhost:5000${entry.pdf_path}`, '_blank');
            } else {
                // Fallback to generating on the fly
                const res = await api.get(`/invoices/${entry.invoice_id}`);
                const invoiceData = res.data;
                await generatePDF(invoiceData.invoice, invoiceData.items, shopSettings, 'view');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load invoice details for viewing");
        }
    };

    const openEditModal = async (entry) => {
        setEditingInvoice(entry);
        try {
            const res = await api.get(`/invoices/${entry.invoice_id}`);
            const inv = res.data.invoice;
            const items = res.data.items;

            setIsInterState(!!inv.is_interstate || parseFloat(inv.total_igst) > 0);

            setEditForm({
                invoice_number: inv.invoice_number,
                date: new Date(inv.created_at).toISOString().slice(0, 16),
                payment_mode: inv.payment_mode || 'Cash',
                customer_name: inv.customer_name || '',
                customer_phone: inv.customer_phone || '',
                customer_address: inv.customer_address || '',
                gstin: inv.gstin || '',
                eway_bill_no: inv.eway_bill_no || '',
                driver_name: inv.driver_name || '',
                transport_no: inv.transport_no || '',
                freight_charges: parseFloat(inv.freight_charges || 0),
                labour_charges: parseFloat(inv.labour_charges || 0),
                items: items.map(item => ({
                    ...item,
                    quantity: parseFloat(item.quantity),
                    rate: parseFloat(item.rate), // This is now MRP
                    discount_percent: parseFloat(item.discount_percent || 0),
                }))
            });
            setShowEditModal(true);
        } catch (e) {
            console.error("Failed to fetch full invoice details", e);
            toast.error("Failed to load invoice details");
        }
    };

    // Calculate Row Totals
    const calculateRow = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const disc = parseFloat(item.discount_percent) || 0;

        // INCLUSIVE TAX LOGIC:
        // Rate is MRP (Inclusive of Tax)
        const gross = qty * rate; // Total MRP
        const discAmt = (gross * disc) / 100;
        const netPrice = gross - discAmt; // Inclusive of Tax

        // Back-calculate Taxable
        const taxable = netPrice / (1 + (item.gst_percent / 100));
        const gstAmtTotal = netPrice - taxable;

        let sgstAmt = 0, cgstAmt = 0, igstAmt = 0;

        if (isInterState) {
            igstAmt = gstAmtTotal;
        } else {
            sgstAmt = gstAmtTotal / 2;
            cgstAmt = gstAmtTotal / 2;
        }

        const final = netPrice;

        return {
            gross,
            discount_amount: discAmt,
            taxable_value: taxable,
            sgst_amount: sgstAmt,
            cgst_amount: cgstAmt,
            igst_amount: igstAmt,
            sgst_percent: isInterState ? 0 : item.gst_percent / 2,
            cgst_percent: isInterState ? 0 : item.gst_percent / 2,
            igst_percent: isInterState ? item.gst_percent : 0,
            final_amount: final
        };
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...editForm.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditForm({ ...editForm, items: newItems });
    };

    const handleUpdate = async () => {
        // Recalculate everything before saving
        let totalGross = 0, totalDiscount = 0, totalTaxable = 0, totalSGST = 0, totalCGST = 0, totalIGST = 0, totalFinal = 0;

        const processedItems = editForm.items.map(item => {
            const calcs = calculateRow(item);
            totalGross += calcs.gross;
            totalDiscount += calcs.discount_amount;
            totalTaxable += calcs.taxable_value;
            totalSGST += calcs.sgst_amount;
            totalCGST += calcs.cgst_amount;
            totalIGST += calcs.igst_amount;
            totalFinal += calcs.final_amount;

            return {
                ...item,
                ...calcs
            };
        });

        // Calculate Extra Tax on Freight & Labour (18%)
        const freightAmt = parseFloat(editForm.freight_charges) || 0;
        const labourAmt = parseFloat(editForm.labour_charges) || 0;
        const extraTaxRate = 18;
        const extraTaxAmt = (freightAmt + labourAmt) * (extraTaxRate / 100);

        if (isInterState) {
            totalIGST += extraTaxAmt;
        } else {
            totalSGST += extraTaxAmt / 2;
            totalCGST += extraTaxAmt / 2;
        }

        const finalAmount = totalFinal + freightAmt + labourAmt + extraTaxAmt;

        const payload = {
            ...editForm,
            items: processedItems,
            gross_amount: totalGross,
            total_discount: totalDiscount,
            taxable_amount: totalTaxable + freightAmt + labourAmt, // Include Freight/Labour
            total_sgst: totalSGST,
            total_cgst: totalCGST,
            total_igst: totalIGST,
            final_amount: finalAmount,
            is_interstate: isInterState
        };

        try {
            await api.put(`/invoices/${editingInvoice.invoice_id}`, payload);
            toast.success("Invoice updated successfully");

            // Regenerate PDF & Upload
            try {
                // Prepare data for PDF Gen (needs to match Billing structure mostly)
                // generatePDF expects (headerData, items, action)
                // But in pdfGenerator it expects (data, items, settings, action)
                // We need to confirm signature.

                // Correction: The `generatePDF` imported in Ledger is from utils/pdfGenerator.
                // It expects (invoiceData, items, settings, action).
                // Let's reuse pdfGenerator logic.

                const pdfBlobUrl = await generatePDF(payload, processedItems, shopSettings, 'return_blob');

                // Convert to File
                const pdfResponse = await fetch(pdfBlobUrl);
                const pdfBlob = await pdfResponse.blob();
                const pdfFile = new File([pdfBlob], `invoice_${editingInvoice.invoice_id}.pdf`, { type: 'application/pdf' });

                const formData = new FormData();
                formData.append('pdf', pdfFile);

                await api.post(`/invoices/${editingInvoice.invoice_id}/pdf`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                toast.success("Invice PDF Updated!");

            } catch (pdfErr) {
                console.error("PDF Update Failed", pdfErr);
                toast.error("Data saved, but PDF update failed");
            }

            setShowEditModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update invoice");
        }
    };

    const getInvoiceTotal = () => {
        const itemsTotal = editForm.items.reduce((sum, item) => sum + calculateRow(item).final_amount, 0);
        return itemsTotal + (parseFloat(editForm.freight_charges) || 0) + (parseFloat(editForm.labour_charges) || 0);
    };

    const StatsCard = ({ title, value, color, icon: Icon }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
                <Icon className={`h-8 w-8 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <div className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</div>
                <div className="text-2xl font-bold text-gray-800">{value}</div>
            </div>
        </div>
    );

    const formatCurrency = (val) => `₹${parseFloat(val || 0).toFixed(2)}`;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Accounts & Ledger</h1>
                <button onClick={fetchData} className="text-blue-600 hover:underline text-sm">Refresh Data</button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Sales" value={formatCurrency(stats.total_sales)} color="text-blue-600" icon={DollarSign} />
                <StatsCard title="Weekly Sales" value={formatCurrency(stats.weekly_sales)} color="text-blue-600" icon={TrendingUp} />
                <StatsCard title="Monthly Sales" value={formatCurrency(stats.monthly_sales)} color="text-blue-600" icon={Calendar} />
                <StatsCard title="Yearly Sales" value={formatCurrency(stats.yearly_sales)} color="text-blue-600" icon={FileText} />

                <StatsCard title="Total Profit" value={formatCurrency(stats.total_profit)} color="text-green-600" icon={DollarSign} />
                <StatsCard title="Weekly Profit" value={formatCurrency(stats.weekly_profit)} color="text-green-600" icon={TrendingUp} />
                <StatsCard title="Monthly Profit" value={formatCurrency(stats.monthly_profit)} color="text-green-600" icon={Calendar} />
                <StatsCard title="Yearly Profit" value={formatCurrency(stats.yearly_profit)} color="text-green-600" icon={FileText} />
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50 space-y-4 md:space-y-0">
                    <h2 className="font-bold text-gray-700">Transactions</h2>

                    <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                        {/* Date Filters */}
                        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border rounded-lg shadow-sm">
                            <span className="text-xs font-medium text-gray-500">Filter:</span>
                            <input
                                type="date"
                                className="text-xs border-none focus:ring-0 text-gray-700 bg-transparent outline-none p-0"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                placeholder="From"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                className="text-xs border-none focus:ring-0 text-gray-700 bg-transparent outline-none p-0"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                placeholder="To"
                            />
                            {(dateRange.start || dateRange.end) && (
                                <button
                                    onClick={() => setDateRange({ start: '', end: '' })}
                                    className="ml-2 text-gray-400 hover:text-red-500"
                                    title="Clear Date Filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Customer or Invoice..."
                                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 text-sm shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="p-4 w-16">S.No.</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Invoice</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4 text-center">Mode</th>
                                <th className="p-4 text-right">Grand Total</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : entries.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500">No transactions found.</td></tr>
                            ) : (
                                entries.map((entry, index) => (
                                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-500 text-sm">{index + 1}</td>
                                        <td className="p-4 text-gray-600 text-sm">
                                            {new Date(entry.transaction_date).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-medium text-blue-600 text-sm">
                                            {entry.invoice_number || entry.description}
                                        </td>
                                        <td className="p-4 text-gray-800 font-medium text-sm">{entry.customer_name || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${entry.payment_mode === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {entry.payment_mode}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-800">
                                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                        </td>
                                        <td className="p-4 flex justify-center space-x-2">
                                            <button
                                                onClick={() => handleView(entry)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                                title="View/Print"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(entry)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                                title="Update"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.invoice_id, entry.description)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enhanced Update Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-xl text-gray-800">
                                Edit Invoice - {editForm.invoice_number}
                            </h3>
                            <div className="flex items-center space-x-3">
                                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center" onClick={() => generatePDF(editForm, editForm.items, shopSettings, 'view')}>
                                    <Eye className="w-4 h-4 mr-2" /> Preview
                                </button>
                                <button onClick={handleUpdate} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center">
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </button>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-red-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">

                            {/* Date Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                                <input
                                    type="datetime-local"
                                    className="border rounded-lg p-2 w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.date}
                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                />
                            </div>

                            {/* Customer Details */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h4 className="font-bold text-gray-700 mb-3">Customer Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.customer_name}
                                            onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.customer_phone}
                                            onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.customer_address}
                                            onChange={e => setEditForm({ ...editForm, customer_address: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.gstin}
                                            onChange={e => setEditForm({ ...editForm, gstin: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">E-Way Bill</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.eway_bill_no}
                                            onChange={e => setEditForm({ ...editForm, eway_bill_no: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 bg-blue-50 p-2 rounded border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-bold text-gray-800">Inter-State Sale (IGST)</span>
                                            <p className="text-xs text-gray-500">Enable for customers outside state</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isInterState}
                                                onChange={e => setIsInterState(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Driver Name</label>
                                            <input
                                                type="text"
                                                className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={editForm.driver_name}
                                                onChange={e => setEditForm({ ...editForm, driver_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Transport No</label>
                                            <input
                                                type="text"
                                                className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={editForm.transport_no}
                                                onChange={e => setEditForm({ ...editForm, transport_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Mode */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                                <div className="flex space-x-2">
                                    {['Cash', 'Online', 'Card', 'Credit'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setEditForm({ ...editForm, payment_mode: mode })}
                                            className={`px-6 py-2 rounded-lg border text-sm font-medium transition ${editForm.payment_mode === mode
                                                ? 'bg-orange-100 border-orange-500 text-orange-700'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <h4 className="font-bold text-gray-700 mb-3">Items</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium">
                                            <tr>
                                                <th className="p-3">Item Name</th>
                                                <th className="p-3 w-20">HSN</th>
                                                <th className="p-3 w-16">Qty</th>
                                                <th className="p-3 w-24">MRP</th>
                                                <th className="p-3 w-16">Disc%</th>
                                                <th className="p-3 w-28 text-right">Total {isInterState ? '(IGST)' : '(GST)'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {editForm.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="p-2">
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded p-1"
                                                            value={item.item_name}
                                                            onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded p-1"
                                                            value={item.hsn_code || ''}
                                                            onChange={e => handleItemChange(index, 'hsn_code', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded p-1"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded p-1"
                                                            value={item.rate}
                                                            onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded p-1"
                                                            value={item.discount_percent}
                                                            onChange={e => handleItemChange(index, 'discount_percent', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right font-medium text-gray-700">
                                                        {formatCurrency(calculateRow(item).final_amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold text-gray-800">
                                            <tr>
                                                <td colSpan="5" className="p-3 text-right">Grand Total:</td>
                                                <td className="p-3 text-right text-lg">{formatCurrency(getInvoiceTotal())}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ledger;
