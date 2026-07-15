import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', category: '', hsn_code: '', unit: '', mrp: '',
        purchase_price: '', selling_price: '', opening_stock: '',
        min_stock_alert: 10, gst_percent: 18
    });
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [showMasterModal, setShowMasterModal] = useState({ type: null, show: false, value: '' });
    const [editId, setEditId] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => {
        fetchItems();
        fetchMasters();
    }, [searchTerm]);

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

    const fetchItems = async () => {
        try {
            const response = await api.get(`/items?search=${searchTerm}`);
            setItems(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching items", error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Default selling_price to MRP if not provided (since field is removed)
            const payload = { ...formData, selling_price: formData.mrp };

            if (editId) {
                await api.put(`/items/${editId}`, payload);
            } else {
                await api.post('/items', payload);
            }
            setShowModal(false);
            setEditId(null);
            resetForm();
            fetchItems();
        } catch (error) {
            alert('Error saving item: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleEdit = (item) => {
        setFormData(item);
        setEditId(item.id);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '', category: '', hsn_code: '', unit: '', mrp: '',
            purchase_price: '', selling_price: '', opening_stock: '',
            min_stock_alert: 10, gst_percent: 18
        });
    }

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

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await api.delete(`/items/${itemToDelete.id}`);
            toast.success("Item deleted successfully");
            fetchItems();
            setItemToDelete(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error deleting item');
        }
    };

    const filteredItems = items; // Backend does filtering

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <button
                    onClick={() => { resetForm(); setEditId(null); setShowModal(true); }}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    <span>Add New Item</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50">
                    <Search className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search items by name or HSN..."
                        className="bg-transparent border-none focus:outline-none w-full text-gray-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="p-4">S.No.</th>
                                <th className="p-4">Item Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">HSN</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4">Unit</th>
                                <th className="p-4">MRP</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="8" className="p-4 text-center">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan="8" className="p-4 text-center text-gray-500">No items found.</td></tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 group">
                                        <td className="p-4 text-gray-500">{index + 1}</td>
                                        <td className="p-4 font-medium text-gray-800">{item.name}</td>
                                        <td className="p-4 text-gray-600">{item.category}</td>
                                        <td className="p-4 text-gray-500 font-mono text-sm">{item.hsn_code}</td>
                                        <td className={`p-4 font-bold ${item.current_stock <= item.min_stock_alert ? 'text-red-600' : 'text-green-600'}`}>
                                            {item.current_stock}
                                        </td>
                                        <td className="p-4 text-gray-500">{item.unit}</td>
                                        <td className="p-4 text-gray-600">₹{item.mrp}</td>
                                        <td className="p-4 flex items-center">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-blue-500 hover:text-blue-700 mr-3"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(item)}
                                                className="text-red-500 hover:text-red-700"
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold">{editId ? 'Edit Item' : 'Add New Item'}</h2>
                            <button onClick={() => setShowModal(false)}><X className="h-6 w-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                                <input required type="text" className="w-full border rounded p-2"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <div className="flex space-x-2">
                                    <select
                                        className="w-full border rounded p-2"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowMasterModal({ type: 'Category', show: true, value: '' })}
                                        className="bg-blue-100 text-blue-600 p-2 rounded hover:bg-blue-200"
                                        title="Add New Category"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">HSN Code</label>
                                <input type="text" className="w-full border rounded p-2"
                                    value={formData.hsn_code} onChange={e => setFormData({ ...formData, hsn_code: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Unit</label>
                                <div className="flex space-x-2">
                                    <select
                                        className="w-full border rounded p-2"
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        <option value="">Select Unit</option>
                                        {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowMasterModal({ type: 'Unit', show: true, value: '' })}
                                        className="bg-blue-100 text-blue-600 p-2 rounded hover:bg-blue-200"
                                        title="Add New Unit"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                                <input type="number" step="0.01" className="w-full border rounded p-2"
                                    value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">MRP</label>
                                <input required type="number" step="0.01" className="w-full border rounded p-2"
                                    value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Opening Stock</label>
                                <input type="number" disabled={!!editId} className="w-full border rounded p-2 bg-gray-50"
                                    value={formData.opening_stock} onChange={e => setFormData({ ...formData, opening_stock: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Low Stock Alert</label>
                                <input type="number" className="w-full border rounded p-2"
                                    value={formData.min_stock_alert} onChange={e => setFormData({ ...formData, min_stock_alert: e.target.value })} />
                            </div>

                            <div className="col-span-2 pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Item</h2>
                            <p className="text-gray-600">
                                Are you sure you want to delete <span className="font-semibold">{itemToDelete.name}</span>?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Master Creation Modal */}
            {showMasterModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold">Add New {showMasterModal.type}</h3>
                            <button onClick={() => setShowMasterModal({ ...showMasterModal, show: false })}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                autoFocus
                                className="w-full border rounded p-2"
                                placeholder={`Enter ${showMasterModal.type} Name`}
                                value={showMasterModal.value}
                                onChange={e => setShowMasterModal({ ...showMasterModal, value: e.target.value })}
                            />
                        </div>
                        <div className="p-4 border-t flex justify-end space-x-2">
                            <button onClick={handleAddMaster} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
