import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Printer, FileText, Download, X, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ItemFormModal from '../components/ItemFormModal';

const Purchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [supplierName, setSupplierName] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierGstin, setSupplierGstin] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [cart, setCart] = useState([]);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [inventoryItems, setInventoryItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showItemFormModal, setShowItemFormModal] = useState(false);

    // New Data Modals state
    const [purchaseToView, setPurchaseToView] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [loadingView, setLoadingView] = useState(false);
    const [purchaseToDelete, setPurchaseToDelete] = useState(null);

    useEffect(() => {
        fetchPurchases();
        fetchInventoryItems();
    }, []);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const res = await api.get('/purchases');
            setPurchases(res.data);
        } catch (error) {
            console.error("Error fetching purchases:", error);
            toast.error("Failed to load purchase history");
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryItems = async () => {
        try {
            const res = await api.get('/items');
            setInventoryItems(res.data);
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    // --- Supplier Suggestion Logic ---
    // Extract unique suppliers from purchase history
    const uniqueSuppliers = purchases.reduce((acc, current) => {
        if (!current.supplier_name) return acc;
        const x = acc.find(item => item.name?.toLowerCase() === current.supplier_name?.toLowerCase());
        if (!x) {
            return acc.concat([{
                name: current.supplier_name,
                phone: current.supplier_phone || '',
                gstin: current.supplier_gstin || ''
            }]);
        } else {
            return acc;
        }
    }, []).filter(s => s.name?.toLowerCase().includes((supplierName || '').toLowerCase()) && (supplierName || '').trim() !== '' && s.name?.toLowerCase() !== (supplierName || '').trim().toLowerCase());

    const handleSelectSupplier = (supplier) => {
        setSupplierName(supplier.name);
        if (supplier.phone) setSupplierPhone(supplier.phone);
        if (supplier.gstin) setSupplierGstin(supplier.gstin);
        setShowSupplierDropdown(false);
    };

    // --- Search Logic ---
    const filteredPurchases = purchases.filter(p =>
        (p.supplier_name && p.supplier_name.toLowerCase().includes((searchQuery || '').toLowerCase())) ||
        (p.supplier_phone && p.supplier_phone.includes(searchQuery)) ||
        (p.supplier_gstin && p.supplier_gstin.toLowerCase().includes((searchQuery || '').toLowerCase()))
    );

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            const results = inventoryItems.filter(item =>
                item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                (item.hsn_code && item.hsn_code.includes(itemSearchQuery))
            );
            setFilteredItems(results);
        } else {
            setFilteredItems([]);
        }
    }, [itemSearchQuery, inventoryItems]);

    // --- Cart Logic ---
    const addItemToCart = (item) => {
        if (cart.find(c => c.item_id === item.id)) {
            toast.error("Item already added. Update quantity instead.");
            setItemSearchQuery('');
            return;
        }

        setCart([...cart, {
            item_id: item.id,
            name: item.name,
            hsn_code: item.hsn_code,
            quantity: 1,
            mrp: item.mrp || 0,
            amount: item.mrp || 0 // qty * mrp
        }]);
        setItemSearchQuery('');
        setFilteredItems([]);
    };

    const handleNewItemAdded = (newItem) => {
        setInventoryItems(prev => [...prev, newItem]);
        addItemToCart(newItem);
        setShowItemFormModal(false);
    };

    const updateCartItem = (index, field, value) => {
        const newCart = [...cart];
        newCart[index][field] = value;
        // Recalculate amount
        if (field === 'quantity' || field === 'mrp') {
            const qty = parseFloat(newCart[index].quantity) || 0;
            const mrp = parseFloat(newCart[index].mrp) || 0;
            newCart[index].amount = qty * mrp;
        }
        setCart(newCart);
    };

    const removeCartItem = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // --- Submit Logic ---
    const handleSavePurchase = async () => {
        if (!supplierName.trim()) return toast.error("Supplier name is required");
        if (cart.length === 0) return toast.error("Add at least one item");

        // Validate cart 
        const invalidItem = cart.find(c => !c.quantity || c.quantity <= 0 || !c.mrp || c.mrp <= 0);
        if (invalidItem) return toast.error("Please ensure all items have valid quantity and MRP");

        setSaving(true);
        try {
            const payload = {
                supplier_name: supplierName,
                supplier_phone: supplierPhone,
                supplier_gstin: supplierGstin,
                total_amount: totalAmount,
                items: cart
            };

            await api.post('/purchases', payload);
            toast.success("Purchase recorded! Stock updated.");

            // Reset & Close
            setShowAddModal(false);
            setSupplierName('');
            setSupplierPhone('');
            setSupplierGstin('');
            setCart([]);
            fetchPurchases(); // Refresh history
            fetchInventoryItems(); // Refresh inventory
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error.response?.data?.error || "Failed to save purchase");
        } finally {
            setSaving(false);
        }
    };

    const handleViewPurchase = async (purchase) => {
        setPurchaseToView(purchase);
        setLoadingView(true);
        try {
            const res = await api.get(`/purchases/${purchase.id}`);
            setViewData(res.data);
        } catch (error) {
            toast.error("Failed to load purchase details");
        } finally {
            setLoadingView(false);
        }
    };

    const handleDeletePurchase = async () => {
        if (!purchaseToDelete) return;
        try {
            await api.delete(`/purchases/${purchaseToDelete.id}`);
            toast.success("Purchase deleted and stock reverted.");
            setPurchaseToDelete(null);
            fetchPurchases();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete purchase");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in flex flex-col items-center">
            {/* Header */}
            <div className="flex justify-between items-center w-full max-w-6xl">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Purchases</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage supplier purchases and stock</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-[#1e293b] hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Add Purchase
                </button>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-6xl bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">

                {/* Search Bar */}
                <div className="p-4 border-b bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by supplier name, phone, or GSTIN..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Header Area */}
                <div className="p-6 border-b flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-bold text-slate-800">Purchase History</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#f8fafc] text-gray-500 font-medium tracking-wide">
                            <tr>
                                <th className="p-4 pl-6 w-32">Date</th>
                                <th className="p-4 w-60">Supplier</th>
                                <th className="p-4 w-32">Phone</th>
                                <th className="p-4 w-40">GSTIN</th>
                                <th className="p-4 pr-6 text-right w-40">Total Amount</th>
                                <th className="p-4 pr-6 text-center w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">Loading purchase history...</td>
                                </tr>
                            ) : filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <Package className="h-10 w-10 text-gray-300 mb-3" />
                                            <p className="font-medium text-slate-500">No purchases found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6 text-slate-500">{new Date(purchase.purchase_date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-4 font-medium">{purchase.supplier_name.toUpperCase()}</td>
                                        <td className="p-4 text-slate-500">{purchase.supplier_phone || '-'}</td>
                                        <td className="p-4 text-slate-500">{purchase.supplier_gstin || '-'}</td>
                                        <td className="p-4 pr-6 text-right font-bold text-slate-800">₹{parseFloat(purchase.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-4 pr-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => handleViewPurchase(purchase)} className="text-blue-500 hover:text-blue-700 transition p-1.5 rounded-md hover:bg-blue-50" title="View Details">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setPurchaseToDelete(purchase)} className="text-red-400 hover:text-red-600 transition p-1.5 rounded-md hover:bg-red-50" title="Delete">
                                                    <Trash2 className="h-4 w-4" />
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

            {/* Add Purchase Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#f8fafc] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b bg-white">
                            <h2 className="text-xl font-bold text-slate-800">Add New Purchase</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Supplier Section bg-white */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier Name *</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="Enter supplier name"
                                        value={supplierName}
                                        onChange={e => {
                                            setSupplierName(e.target.value);
                                            setShowSupplierDropdown(true);
                                        }}
                                        onFocus={() => setShowSupplierDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                                    />
                                    {showSupplierDropdown && uniqueSuppliers.length > 0 && (
                                        <div className="absolute top-[72px] left-0 right-0 bg-white shadow-xl border border-gray-200 rounded-lg max-h-48 overflow-y-auto z-20 divide-y divide-gray-50">
                                            {uniqueSuppliers.map((supplier, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer transition"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent onBlur from firing before click
                                                        handleSelectSupplier(supplier);
                                                    }}
                                                >
                                                    <div className="font-medium text-slate-800">{supplier.name.toUpperCase()}</div>
                                                    <div className="text-xs text-slate-500 flex gap-3">
                                                        {supplier.phone && <span>Ph: {supplier.phone}</span>}
                                                        {supplier.gstin && <span>GST: {supplier.gstin}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone No.</label>
                                    <input type="text" className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Enter phone number" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">GST No.</label>
                                    <input type="text" className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Enter GSTIN" value={supplierGstin} onChange={e => setSupplierGstin(e.target.value)} />
                                </div>
                            </div>

                            {/* Item Search Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Add Items</label>
                                <div className="flex gap-2 relative">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 rounded-lg p-2.5 pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            placeholder="Select an item"
                                            value={itemSearchQuery}
                                            onChange={e => setItemSearchQuery(e.target.value)}
                                        />
                                        <div className="absolute right-3 top-3 text-gray-400 cursor-pointer">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowItemFormModal(true)} className="bg-[#1e293b] text-white p-2.5 rounded-lg hover:bg-slate-800 transition shadow-sm">
                                        <Plus className="h-5 w-5" />
                                    </button>

                                    {/* Dropdown Results */}
                                    {filteredItems.length > 0 && (
                                        <div className="absolute top-12 left-0 right-[48px] bg-white shadow-xl border border-gray-200 rounded-lg max-h-60 overflow-y-auto z-20 overflow-hidden divide-y divide-gray-50">
                                            {filteredItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition"
                                                    onClick={() => addItemToCart(item)}
                                                >
                                                    <div>
                                                        <div className="font-medium text-slate-800">{item.name}</div>
                                                        <div className="text-xs text-slate-500">HSN: {item.hsn_code || '-'}</div>
                                                    </div>
                                                    <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Stock: {item.current_stock}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cart Table */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f8fafc] text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 font-medium">Item</th>
                                            <th className="p-4 font-medium w-24">HSN</th>
                                            <th className="p-4 font-medium w-28">Qty</th>
                                            <th className="p-4 font-medium w-32">MRP (₹)</th>
                                            <th className="p-4 font-medium w-32">Amount</th>
                                            <th className="p-4 font-medium w-12 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {cart.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-400 bg-white">No items added to purchase yet.</td>
                                            </tr>
                                        ) : (
                                            cart.map((item, index) => (
                                                <tr key={index} className="bg-white hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-medium text-slate-800">{item.name.toUpperCase()}</td>
                                                    <td className="p-4 text-slate-500">{item.hsn_code}</td>
                                                    <td className="p-4">
                                                        <input type="number" min="1" className="w-full border border-gray-200 rounded p-1.5 outline-none focus:border-blue-500 bg-white" value={item.quantity} onChange={(e) => updateCartItem(index, 'quantity', e.target.value)} />
                                                    </td>
                                                    <td className="p-4">
                                                        <input type="number" min="0" step="0.01" className="w-full border border-gray-200 rounded p-1.5 outline-none focus:border-blue-500 bg-white" value={item.mrp} onChange={(e) => updateCartItem(index, 'mrp', e.target.value)} />
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-800">₹{parseFloat(item.amount).toFixed(2)}</td>
                                                    <td className="p-4 text-center">
                                                        <button onClick={() => removeCartItem(index)} className="text-red-400 hover:text-red-600 transition p-1.5 rounded-md hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Total Area */}
                            <div className="flex justify-end pt-2">
                                <div className="text-xl font-bold tracking-tight text-slate-800">
                                    Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition text-sm font-medium">Cancel</button>
                            <button onClick={handleSavePurchase} disabled={saving || cart.length === 0} className="px-6 py-2.5 bg-[#1e293b] hover:bg-slate-800 text-white rounded-lg transition disabled:opacity-50 text-sm font-semibold shadow-sm flex items-center gap-2">
                                {saving ? <span className="animate-spin">↻</span> : null} Save Purchase
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Purchase Details Modal */}
            {purchaseToView && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b bg-gray-50/80">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Purchase Details</h2>
                                <p className="text-xs text-slate-500">Ref: {purchaseToView.id} • {new Date(purchaseToView.purchase_date).toLocaleDateString('en-GB')}</p>
                            </div>
                            <button onClick={() => { setPurchaseToView(null); setViewData(null); }} className="text-gray-400 hover:text-gray-600 transition p-1 bg-white rounded-full shadow-sm hover:shadow">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex flex-wrap gap-x-12 gap-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-blue-900/60 uppercase tracking-wider mb-1">Supplier</p>
                                    <p className="font-bold text-blue-950 text-base">{purchaseToView.supplier_name.toUpperCase()}</p>
                                </div>
                                {purchaseToView.supplier_phone && (
                                    <div>
                                        <p className="text-xs font-semibold text-blue-900/60 uppercase tracking-wider mb-1">Phone</p>
                                        <p className="font-medium text-slate-700">{purchaseToView.supplier_phone}</p>
                                    </div>
                                )}
                                {purchaseToView.supplier_gstin && (
                                    <div>
                                        <p className="text-xs font-semibold text-blue-900/60 uppercase tracking-wider mb-1">GSTIN</p>
                                        <p className="font-medium text-slate-700">{purchaseToView.supplier_gstin}</p>
                                    </div>
                                )}
                            </div>

                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f8fafc] text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-3 pl-4">Item Name</th>
                                            <th className="p-3 w-28">HSN</th>
                                            <th className="p-3 w-24">Qty</th>
                                            <th className="p-3 w-32">Rate/MRP (₹)</th>
                                            <th className="p-3 pr-4 text-right w-36">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loadingView ? (
                                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading item breakdown...</td></tr>
                                        ) : viewData?.items?.length ? (
                                            viewData.items.map((it, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 pl-4 font-medium text-slate-800">{it.item_name}</td>
                                                    <td className="p-3 text-slate-500">{it.hsn_code || '-'}</td>
                                                    <td className="p-3 font-semibold text-slate-700">{it.quantity}</td>
                                                    <td className="p-3 text-slate-600">{parseFloat(it.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="p-3 pr-4 text-right font-bold text-slate-800">{parseFloat(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="5" className="p-6 text-center text-gray-400">No items captured for this purchase.</td></tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-gray-50/50">
                                        <tr>
                                            <td colSpan="4" className="p-4 text-right font-bold text-slate-600">Total Purchase Value:</td>
                                            <td className="p-4 pr-4 text-right font-black text-slate-800 text-lg">₹{parseFloat(purchaseToView.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {purchaseToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-red-600 mb-3 flex items-center gap-2">
                                <Trash2 className="h-6 w-6" /> Delete Purchase
                            </h2>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                Are you sure you want to permanently delete the purchase from <strong>{purchaseToDelete.supplier_name.toUpperCase()}</strong> worth <strong>₹{parseFloat(purchaseToDelete.total_amount).toLocaleString('en-IN')}</strong>?
                            </p>
                            <div className="mt-3 bg-red-50 text-red-700 text-xs p-3 rounded flex gap-2">
                                <span className="font-bold">⚠️ Warning:</span> All items from this purchase will be subtracted from the live stock inventory automatically.
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                            <button onClick={() => setPurchaseToDelete(null)} className="px-5 py-2 border border-gray-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition font-medium text-sm">
                                Cancel
                            </button>
                            <button onClick={handleDeletePurchase} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition text-sm">
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ItemFormModal
                isOpen={showItemFormModal}
                onClose={() => setShowItemFormModal(false)}
                onSuccess={handleNewItemAdded}
                initialData={{ name: itemSearchQuery }}
            />
        </div>
    );
};

export default Purchases;
