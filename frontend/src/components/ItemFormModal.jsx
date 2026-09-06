import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ItemFormModal = ({ isOpen, onClose, initialData = null, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '', category: '', hsn_code: '', unit: '', mrp: '',
        purchase_price: '', selling_price: '', opening_stock: '',
        min_stock_alert: 10, gst_percent: 18
    });
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [showMasterModal, setShowMasterModal] = useState({ type: null, show: false, value: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchMasters();
            setFormData({
                name: '', category: '', hsn_code: '', unit: '', mrp: '',
                purchase_price: '', selling_price: '', opening_stock: '',
                min_stock_alert: 10, gst_percent: 18,
                ...(initialData || {})
            });
        }
    }, [isOpen, initialData]);

    const fetchMasters = async () => {
        try {
            const [catRes, unitRes] = await Promise.all([
                api.get('/masters/categories'),
                api.get('/masters/units')
            ]);
            setCategories(catRes.data);
            setUnits(unitRes.data);
        } catch (error) {
            console.error("Error fetching masters", error);
        }
    };

    const handleAddMaster = async () => {
        const { type, value } = showMasterModal;
        if (!value.trim()) return;

        try {
            const endpoint = type === 'Category' ? '/masters/categories' : '/masters/units';
            const response = await api.post(endpoint, { name: value });

            if (type === 'Category') {
                setCategories([...categories, response.data]);
                setFormData({ ...formData, category: response.data.name });
            } else {
                setUnits([...units, response.data]);
                setFormData({ ...formData, unit: response.data.name });
            }
            setShowMasterModal({ type: null, show: false, value: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Error adding master');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData, selling_price: formData.mrp };
            let savedItem;

            if (initialData?.id) {
                const res = await api.put(`/items/${initialData.id}`, payload);
                // Return updated item or the payload merged if backend doesnt return full item
                savedItem = { ...initialData, ...payload, ...(res.data || {}) };
            } else {
                const res = await api.post('/items', payload);
                savedItem = { id: res.data.itemId || res.data.insertId || res.data.id, ...payload, current_stock: payload.opening_stock || 0, ...(res.data || {}) };
            }
            toast.success("Item saved successfully");
            onSuccess(savedItem); // Important
        } catch (error) {
            toast.error('Error saving item: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm animate-in fade-in text-slate-800">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold">{initialData?.id ? 'Edit Item' : 'Add New Item'}</h2>
                    <button onClick={onClose}><X className="h-6 w-6 text-gray-400 hover:text-gray-600 transition" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                        <input required type="text" className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <div className="flex space-x-2">
                            <select
                                className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowMasterModal({ type: 'Category', show: true, value: '' })}
                                className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100 transition"
                                title="Add New Category"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                        <input type="text" className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.hsn_code} onChange={e => setFormData({ ...formData, hsn_code: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <div className="flex space-x-2">
                            <select
                                className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1"
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            >
                                <option value="">Select Unit</option>
                                {units.map(u => <option key={u.id || u.name} value={u.name}>{u.name}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowMasterModal({ type: 'Unit', show: true, value: '' })}
                                className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100 transition"
                                title="Add New Unit"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                        <input type="number" step="0.01" className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                        <input required type="number" step="0.01" className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock</label>
                        <input type="number" disabled={!!initialData?.id} className="w-full border rounded p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.opening_stock} onChange={e => setFormData({ ...formData, opening_stock: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                        <input type="number" className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.min_stock_alert} onChange={e => setFormData({ ...formData, min_stock_alert: e.target.value })} />
                    </div>

                    <div className="col-span-2 pt-4 flex justify-end space-x-3 border-t mt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg text-slate-700 hover:bg-gray-50 font-medium transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center gap-2">
                            {saving ? <span className="animate-spin">↻</span> : null} Save Item
                        </button>
                    </div>
                </form>
            </div>

            {/* Master Creation Modal */}
            {showMasterModal.show && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[99999] backdrop-blur-sm animate-in fade-in zoom-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Add New {showMasterModal.type}</h3>
                            <button type="button" onClick={() => setShowMasterModal({ ...showMasterModal, show: false })}><X className="h-5 w-5 text-gray-500 hover:text-gray-700" /></button>
                        </div>
                        <div className="p-5">
                            <input
                                type="text"
                                autoFocus
                                className="w-full border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder={`Enter ${showMasterModal.type} Name`}
                                value={showMasterModal.value}
                                onChange={e => setShowMasterModal({ ...showMasterModal, value: e.target.value })}
                            />
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
                            <button type="button" onClick={handleAddMaster} className="bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700 transition">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemFormModal;
