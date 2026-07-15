import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, Plus, Trash2, Printer, Save, User, Download, FileText, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from '../utils/numberToWords';
import { generatePDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const Billing = () => {
    const [invoiceNo, setInvoiceNo] = useState('LOADING...');
    const [customer, setCustomer] = useState({
        name: '',
        phone: '',
        address: '',
        gstin: '',
        eway_bill_no: '',
        payment_mode: 'Cash',
        previous_due: 0
    });
    const [freightCharges, setFreightCharges] = useState('');
    const [labourCharges, setLabourCharges] = useState('');
    const [driverName, setDriverName] = useState('');
    const [transportNo, setTransportNo] = useState('');
    const [isInterState, setIsInterState] = useState(false);
    const [payingNow, setPayingNow] = useState('');

    // Handle E-Way Bill Formatting
    const handleEwayChange = (e) => {
        let raw = e.target.value.replace(/\s/g, '');
        let formatted = raw.replace(/(.{4})/g, '$1 ').trim();
        setCustomer({ ...customer, eway_bill_no: formatted });
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [items, setItems] = useState([]); // All items for search
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [shopSettings, setShopSettings] = useState(null);

    // PDF Preview Modal State
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [lastSavedInvoice, setLastSavedInvoice] = useState(null); // To keep track of data for download

    // Print ref
    const printRef = useRef();

    useEffect(() => {
        fetchNextInvoiceNumber();
        fetchItems();
        fetchShopSettings();
    }, []);

    const fetchShopSettings = async () => {
        try {
            const res = await api.get('/settings');
            setShopSettings(res.data);
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    };

    // Auto-fetch customer details when typing phone number
    useEffect(() => {
        const fetchCustomerDetails = async () => {
            if (customer.phone && customer.phone.length >= 10) {
                try {
                    const res = await api.get(`/invoices/customer/${customer.phone}`);
                    if (res.data) {
                        setCustomer(prev => ({
                            ...prev,
                            // Overwrite only if currently empty or whitespace
                            name: (prev.name && prev.name.trim()) ? prev.name : (res.data.customer_name || ''),
                            address: (prev.address && prev.address.trim()) ? prev.address : (res.data.customer_address || ''),
                            gstin: (prev.gstin && prev.gstin.trim()) ? prev.gstin : (res.data.gstin || ''),
                            previous_due: parseFloat(res.data.due_amount) || 0
                        }));
                    }
                } catch (error) {
                    // Fail silently, not a big deal if not found 
                }
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCustomerDetails();
        }, 600); // debounce 600ms

        return () => clearTimeout(timeoutId);
    }, [customer.phone]);

    useEffect(() => {
        if (searchQuery.length > 1) {
            const lower = searchQuery.toLowerCase();
            const filtered = items.filter(i =>
                i.name.toLowerCase().includes(lower) ||
                (i.hsn_code && i.hsn_code.includes(lower))
            );
            setFilteredItems(filtered.slice(0, 10)); // Limit results
        } else {
            setFilteredItems([]);
        }
    }, [searchQuery, items]);

    const fetchNextInvoiceNumber = async () => {
        try {
            const res = await api.get('/invoices/next-number');
            setInvoiceNo(res.data.invoiceNumber);
        } catch (error) {
            console.error(error);
        }
    }

    const fetchItems = async () => {
        try {
            const res = await api.get('/items'); // Fetch all for clientside search (optimized for small shops)
            setItems(res.data);
        } catch (error) {
            console.error(error);
        }
    }

    const addToCart = (item) => {
        if (item.current_stock <= 0) {
            alert('Item is out of stock!');
            return;
        }

        const existing = cart.find(c => c.item_id === item.id);
        if (existing) {
            alert('Item already in cart');
            return;
        }

        const newItem = {
            item_id: item.id,
            item_name: item.name,
            hsn_code: item.hsn_code,
            quantity: 1,
            rate: parseFloat(item.selling_price), // Default to selling price
            discount_percent: 0,
            gst_percent: parseFloat(item.gst_percent),
            stock_available: item.current_stock
        };
        setCart([...cart, newItem]);
        setSearchQuery('');
        setFilteredItems([]);
    };

    const updateCartItem = (index, field, value) => {
        const newCart = [...cart];
        newCart[index][field] = value;
        setCart(newCart);
    };

    const removeCartItem = (index) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
    };

    // Calculate Totals
    const calculateRow = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const disc = parseFloat(item.discount_percent) || 0;
        // INCLUSIVE TAX LOGIC:
        // Rate is MRP (Inclusive of Tax)
        // 1. Calculate Net Price after Discount
        // 2. Back-calculate Taxable Value from Net Price

        const gross = qty * rate; // This is Total MRP
        const discAmt = (gross * disc) / 100;
        const netPrice = gross - discAmt; // This is the amount customer pays (Inclusive of Tax)

        // Back-calculate Taxable
        // Net Price = Taxable + Tax
        // Net Price = Taxable * (1 + GST/100)
        // Taxable = Net Price / (1 + GST/100)

        const taxable = netPrice / (1 + (item.gst_percent / 100));
        const gstAmtTotal = netPrice - taxable;

        let sgstAmt = 0, cgstAmt = 0, igstAmt = 0;

        if (isInterState) {
            igstAmt = gstAmtTotal;
        } else {
            sgstAmt = gstAmtTotal / 2;
            cgstAmt = gstAmtTotal / 2;
        }

        // Final Amount is simply Net Price (since it was inclusive)
        const final = netPrice;

        return {
            gross, discAmt, taxable, sgstAmt, cgstAmt, igstAmt, final
        };
    };

    const cartTotals = cart.reduce((acc, item) => {
        const row = calculateRow(item);
        return {
            gross: acc.gross + row.gross,
            discount: acc.discount + row.discAmt,
            taxable: acc.taxable + row.taxable,
            sgst: acc.sgst + row.sgstAmt,
            cgst: acc.cgst + row.cgstAmt,
            igst: acc.igst + row.igstAmt,
            final: acc.final + row.final
        };
    }, { gross: 0, discount: 0, taxable: 0, sgst: 0, cgst: 0, igst: 0, final: 0 });

    // Note: Extra charges (freight, labour) are dynamically added to totals in the UI and Payloads.

    // Action 1: Generate Invoice (Preview Mode, no saving yet)
    const handleGenerateInvoice = async () => {
        if (cart.length === 0) return toast.error('Cart is empty!');
        if (!customer.name) return toast.error('Customer Name is required!');

        // Calculate Tax on Freight & Labour (Assume input is EXCLUSIVE)
        const freight = parseFloat(freightCharges) || 0;
        const labour = parseFloat(labourCharges) || 0;
        const totalExtra = freight + labour;

        const extraTaxAmt = totalExtra * 0.18;

        let finalSgst = cartTotals.sgst;
        let finalCgst = cartTotals.cgst;
        let finalIgst = cartTotals.igst;

        if (isInterState) {
            finalIgst += extraTaxAmt;
        } else {
            finalSgst += extraTaxAmt / 2;
            finalCgst += extraTaxAmt / 2;
        }

        const invoiceItems = cart.map(item => {
            const row = calculateRow(item);
            return {
                ...item,
                discount_amount: row.discAmt,
                taxable_value: row.taxable,
                sgst_percent: isInterState ? 0 : item.gst_percent / 2,
                sgst_amount: row.sgstAmt,
                cgst_percent: isInterState ? 0 : item.gst_percent / 2,
                cgst_amount: row.cgstAmt,
                igst_percent: isInterState ? item.gst_percent : 0,
                igst_amount: row.igstAmt,
                final_amount: row.final
            };
        });

        const payload = {
            invoice_number: invoiceNo,
            customer_id: customer.id || null,
            customer_name: customer.name || '',
            customer_phone: customer.phone || '',
            customer_address: customer.address || '',
            gstin: customer.gstin || '',
            eway_bill_no: customer.eway_bill_no || '',
            payment_mode: customer.payment_mode,
            gross_amount: cartTotals.gross,
            total_discount: cartTotals.discount,
            taxable_amount: cartTotals.taxable + totalExtra, // Include basic Freight/Labour in Taxable
            total_sgst: finalSgst,
            total_cgst: finalCgst,
            total_igst: finalIgst,
            final_amount: Math.round(cartTotals.final + totalExtra * 1.18), // Item Final (Inc Tax) + Freight + Labour + Tax
            freight_charges: freight,
            labour_charges: labour,
            driver_name: driverName,
            transport_no: transportNo,
            is_interstate: isInterState,
            paying_now: payingNow === '' ? Math.round(cartTotals.final + totalExtra * 1.18) : parseFloat(payingNow),
            previous_due: customer.previous_due || 0,
            items: invoiceItems // fully formatted items
        };

        try {
            // Generate Blob URL for immediate preview
            const pdfBlobUrl = await generatePDF(payload, cart, shopSettings, 'return_blob');
            setPdfPreviewUrl(pdfBlobUrl);
            setLastSavedInvoice({ payload, items: cart });
            setShowPdfModal(true);
        } catch (error) {
            console.error("Preview Error:", error);
            toast.error("Failed to generate preview");
        }
    };

    // Action 2: Save to DB helper function
    const saveInvoiceToDB = async (payloadToSave, cartItems) => {
        setLoading(true);
        try {
            const res = await api.post('/invoices', payloadToSave);

            if (res.data && res.data.invoiceId) {
                toast.success(`Invoice #${res.data.invoiceNumber || res.data.invoiceId} Saved!`);

                try {
                    // Upload PDF silently
                    const pdfBlobUrl = await generatePDF(payloadToSave, cartItems, shopSettings, 'return_blob');
                    const response = await fetch(pdfBlobUrl);
                    const pdfBlob = await response.blob();
                    const formData = new FormData();
                    formData.append('pdf', pdfBlob, `${payloadToSave.invoice_number}.pdf`);
                    await api.post(`/invoices/${res.data.invoiceId}/pdf`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } catch (pdfErr) {
                    console.error("Failed to upload PDF:", pdfErr);
                }

                // Clear Form 
                setCart([]);
                setCustomer({ name: '', phone: '', address: '', gstin: '', payment_mode: 'Cash', eway_bill_no: '', previous_due: 0 });
                setFreightCharges('');
                setLabourCharges('');
                setPayingNow('');
                setDriverName('');
                setTransportNo('');
                setSearchQuery('');
                setIsInterState(false);
                fetchNextInvoiceNumber();
                setLastSavedInvoice(null); // Clear state so we can't double save
                return true;
            }
        } catch (error) {
            console.error("Save Error:", error);
            toast.error(error.response?.data?.error || "Failed to save invoice");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handlePrintFromModal = async () => {
        if (!lastSavedInvoice) return;
        
        // Generate a fresh PDF with autoPrint script injected for seamless printing
        const printBlobUrl = await generatePDF(lastSavedInvoice.payload, lastSavedInvoice.items, shopSettings, 'print_blob');
        
        const iframe = document.createElement('iframe');
        // Modern browsers block PDF JS autoPrint in 0x0 or display:none iframes.
        // We use size and opacity:0 to bypass this, plus a manual print trigger.
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '1000px';
        iframe.style.height = '1000px';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';
        
        // Add manual print fallback
        iframe.onload = () => {
            setTimeout(() => {
                try {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }
                } catch (e) {
                    console.error('Explicit print fallback failed:', e);
                }
            }, 500);
        };

        iframe.src = printBlobUrl;
        document.body.appendChild(iframe);

        const success = await saveInvoiceToDB(lastSavedInvoice.payload, lastSavedInvoice.items);
        if (success) {
            setShowPdfModal(false);
        }

        // Clean up hidden printing iframe safely after it's been triggered
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 15000);
    };

    const handleDownloadFromModal = async () => {
        if (!lastSavedInvoice) return;

        // Let the PDF generator handle the download trigger directly
        await generatePDF(lastSavedInvoice.payload, lastSavedInvoice.items, shopSettings, 'save');

        const success = await saveInvoiceToDB(lastSavedInvoice.payload, lastSavedInvoice.items);
        if (success) {
            setShowPdfModal(false);
        }
    };

    const handleCloseModal = () => {
        setShowPdfModal(false);
        setPdfPreviewUrl(null);
    };

    // Action 2: Save to DB helper function is completely replaced by saveInvoiceToDB + Modal triggers.

    return (
        <div className="flex flex-col xl:flex-row min-h-[calc(100vh-4rem)] gap-6 pb-20 lg:pb-6 px-2 lg:px-0">
            {/* LEFT SIDE: Operations (70%) */}
            <div className="flex-1 flex flex-col gap-6">

                {/* 1. Customer Details Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Customer Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400">
                                <User className="h-4 w-4" />
                            </span>
                            <input type="text" placeholder="Customer Name *" className="w-full border border-gray-200 rounded-lg p-2.5 pl-10 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400">
                                {/* <Phone className="h-4 w-4" /> */}
                            </span>
                            <input type="text" placeholder="Phone Number" className="w-full border border-gray-200 rounded-lg p-2.5 pl-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <input type="text" placeholder="Address" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
                        </div>
                        <div>
                            <input type="text" placeholder="GSTIN" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm uppercase focus:ring-1 focus:ring-blue-500 outline-none"
                                value={customer.gstin} onChange={e => setCustomer({ ...customer, gstin: e.target.value })} />
                        </div>
                        <div>
                            <input type="text" placeholder="E-Way Bill (Optional)" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm uppercase focus:ring-1 focus:ring-blue-500 outline-none"
                                value={customer.eway_bill_no} onChange={handleEwayChange} maxLength={20} />
                        </div>
                        <div>
                            <input type="text" placeholder="Driver Name" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                        </div>
                        <div>
                            <input type="text" placeholder="Transport No." className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                value={transportNo} onChange={(e) => setTransportNo(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* 2. Add Items Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Add Items</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Search items to add..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {/* Dropdown Results */}
                        {filteredItems.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-gray-200 mt-1 z-20 rounded-xl max-h-80 overflow-y-auto divide-y divide-gray-100">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors px-4"
                                        onClick={() => addToCart(item)}
                                    >
                                        <div>
                                            <div className="font-bold text-gray-800">{item.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5 flex space-x-2">
                                                <span className="bg-gray-100 px-1.5 rounded">Stock: {item.current_stock}</span>
                                                <span className="bg-gray-100 px-1.5 rounded">HSN: {item.hsn_code}</span>
                                            </div>
                                        </div>
                                        <div className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">₹{item.selling_price}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Bill Items Section */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[300px]">
                    <div className="p-5 border-b border-gray-100">
                        <h3 className="text-base font-bold text-gray-800">Bill Items</h3>
                    </div>
                    {/* Table */}
                    <div className="flex-1 overflow-x-auto overflow-y-auto">
                        <table className="w-full text-left text-sm relative">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0 z-20">
                                <tr>
                                    <th className="p-3 text-center w-12">#</th>
                                    <th className="p-3">Item Details</th>
                                    <th className="p-3 w-20 text-center">Qty</th>
                                    <th className="p-3 w-28 text-right">Rate</th>
                                    <th className="p-3 w-20 text-center">Disc%</th>
                                    <th className="p-3 w-24 text-right">Total</th>
                                    <th className="p-3 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cart.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="mb-2">
                                                    <FileText className="h-10 w-10 text-gray-300" />
                                                </div>
                                                <p className="font-medium text-gray-500">No items added yet</p>
                                                <p className="text-xs opacity-70">Search and add items above</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    cart.map((item, index) => {
                                        const row = calculateRow(item);
                                        return (
                                            <tr key={index} className="hover:bg-gray-50 group">
                                                <td className="p-3 text-center text-gray-400 font-medium">{index + 1}</td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-800">{item.item_name}</div>
                                                </td>
                                                <td className="p-3">
                                                    <input type="number" className="w-full border border-gray-200 bg-white rounded focus:border-blue-500 p-1.5 text-center font-medium text-gray-700 outline-none"
                                                        value={item.quantity}
                                                        min="1" max={item.stock_available}
                                                        onChange={e => updateCartItem(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                                </td>
                                                <td className="p-3">
                                                    <input type="number" className="w-full border border-gray-200 bg-white rounded focus:border-blue-500 p-1.5 text-right outline-none"
                                                        value={item.rate}
                                                        onChange={e => updateCartItem(index, 'rate', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                                </td>
                                                <td className="p-3">
                                                    <input type="number" className="w-full border border-gray-200 bg-white rounded focus:border-blue-500 p-1.5 text-center outline-none"
                                                        value={item.discount_percent}
                                                        onChange={e => updateCartItem(index, 'discount_percent', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                                </td>
                                                <td className="p-3 text-right font-medium text-gray-800">₹{row.final.toFixed(2)}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => removeCartItem(index)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Summary (30%) */}
            <div className="w-full xl:w-[450px] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 shrink-0 self-start sticky top-6">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-base font-bold text-gray-800">Bill Summary</h3>
                    <span className="text-xs font-mono text-gray-400 break-all">{invoiceNo}</span>
                </div>

                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                    {/* Read-only totals */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Items</span>
                            <span className="font-medium text-gray-800">{cart.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Quantity</span>
                            <span className="font-medium text-gray-800">{cart.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Sub Total</span>
                            <span className="font-medium text-gray-800">₹{cartTotals.taxable.toFixed(2)}</span>
                        </div>
                        {cartTotals.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Total Discount</span>
                                <span>-₹{cartTotals.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">Freight Charge</span>
                            <span className="font-medium text-gray-800">₹{(parseFloat(freightCharges) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Labour Charge</span>
                            <span className="font-medium text-gray-800">₹{(parseFloat(labourCharges) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-50">
                            <span className="text-gray-500">Taxable Amount</span>
                            <span className="font-medium text-gray-800">₹{(cartTotals.taxable + (parseFloat(freightCharges) || 0) + (parseFloat(labourCharges) || 0)).toFixed(2)}</span>
                        </div>

                        {/* Dynamic Tax Lines */}
                        {isInterState ? (
                            <div className="flex justify-between">
                                <span className="text-gray-500">IGST Output</span>
                                <span className="font-medium text-gray-800">₹{(cartTotals.igst + (((parseFloat(freightCharges) || 0) + (parseFloat(labourCharges) || 0)) * 0.18)).toFixed(2)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">SGST (9%)</span>
                                    <span className="font-medium text-gray-800">₹{(cartTotals.sgst + (((parseFloat(freightCharges) || 0) + (parseFloat(labourCharges) || 0)) * 0.09)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">CGST (9%)</span>
                                    <span className="font-medium text-gray-800">₹{(cartTotals.cgst + (((parseFloat(freightCharges) || 0) + (parseFloat(labourCharges) || 0)) * 0.09)).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Grand Total Highlight */}
                    <div className="flex justify-between items-center py-4 border-y border-gray-100 my-4">
                        <span className="text-base font-bold text-gray-900">Grand Total</span>
                        <span className="text-2xl font-black text-slate-800 tracking-tight">₹{Math.round(cartTotals.final + ((parseFloat(freightCharges) || 0) + (parseFloat(labourCharges) || 0)) * 1.18).toFixed(2)}</span>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        {customer.previous_due > 0 && (
                            <div className="flex justify-between items-center gap-4 bg-red-50 p-2 rounded-lg border border-red-100">
                                <label className="text-sm font-bold text-red-600 w-32 tracking-wide flex items-center gap-1">
                                    <span className="text-lg">⚠</span> Pending Due
                                </label>
                                <span className="flex-1 text-right text-base font-black text-red-700 pr-2">
                                    ₹{(parseFloat(customer.previous_due)).toFixed(2)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center gap-4">
                            <label className="text-sm font-medium text-gray-700 w-32">Paying Now</label>
                            <input type="number" className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none" 
                                value={payingNow} onChange={e => setPayingNow(e.target.value)} placeholder="0" />
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <label className="text-sm font-medium text-gray-700 w-32">Freight Charge</label>
                            <input type="number" className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
                                value={freightCharges} onChange={e => setFreightCharges(e.target.value)} placeholder="0" />
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <label className="text-sm font-medium text-gray-700 w-32">Labour Charge</label>
                            <input type="number" className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
                                value={labourCharges} onChange={e => setLabourCharges(e.target.value)} placeholder="0" />
                        </div>
                    </div>

                    {/* Inter-State Toggle inside Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium flex items-center text-gray-700">
                                <span className="mr-2">📍</span> Inter-State Sale (IGST)
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                                {isInterState ? 'IGST @18% will be applied' : 'SGST @9% + CGST @9% will be applied'}
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isInterState}
                                onChange={(e) => setIsInterState(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Payment Mode Selection */}
                    <div className="mt-4">
                        <label className="text-xs font-bold text-gray-600 block mb-2">Payment Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Cash', 'UPI', 'Card', 'Credit'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setCustomer({ ...customer, payment_mode: mode })}
                                    className={`py-2 text-sm font-medium rounded-lg border transition-all ${customer.payment_mode === mode ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                    <button
                        disabled={loading || cart.length === 0}
                        onClick={handleGenerateInvoice}
                        className="w-full py-3 bg-[#e8ac74] hover:bg-[#d89c64] text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        {loading ? <span className="animate-spin text-xl">↻</span> : <FileText className="h-4 w-4" />}
                        {loading ? 'Processing...' : 'Generate Invoice'}
                    </button>
                </div>
            </div>

            {/* PDF Preview Modal remains same */}
            {/* PDF Preview Modal */}
            {showPdfModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                        {/* Header Actions */}
                        <div className="flex justify-end items-center gap-3 p-4 border-b bg-gray-50/80">
                            <button
                                onClick={handlePrintFromModal}
                                disabled={loading}
                                className="px-5 py-2 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                style={{ backgroundColor: '#2563eb' }}
                            >
                                <Printer size={16} />
                                Print
                            </button>
                            <button
                                onClick={handleDownloadFromModal}
                                disabled={loading}
                                className="px-5 py-2 hover:bg-emerald-700 text-white rounded-md flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                style={{ backgroundColor: '#10b981' }}
                            >
                                <Download size={16} />
                                Download PDF
                            </button>
                            <button
                                onClick={handleCloseModal}
                                className="ml-2 px-5 py-2 hover:bg-slate-700 text-white rounded-md flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm"
                                style={{ backgroundColor: '#64748b' }}
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        </div>
                        {/* PDF Viewer */}
                        <div className="flex-1 bg-gray-100 p-4">
                            {pdfPreviewUrl ? (
                                <iframe
                                    src={pdfPreviewUrl}
                                    className="w-full h-full rounded shadow-sm bg-white"
                                    title="Invoice Preview"
                                    id="pdf-preview-iframe"
                                    name="pdf-preview-iframe"
                                    ref={printRef}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading Preview...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
