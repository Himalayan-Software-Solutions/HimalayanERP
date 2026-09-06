import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ItemFormModal from '../components/ItemFormModal';

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => {
        fetchItems();
    }, [searchTerm]);

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

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleSuccess = (savedItem) => {
        setShowModal(false);
        setEditingItem(null);
        fetchItems();
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <button
                    onClick={() => { setEditingItem(null); setShowModal(true); }}
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

            <ItemFormModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingItem(null); }}
                initialData={editingItem}
                onSuccess={handleSuccess}
            />

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
        </div>
    );
};

export default Inventory;
