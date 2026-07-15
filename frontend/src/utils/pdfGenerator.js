import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToWords } from 'to-words';
import { NotoSansDevanagari } from './NotoSansDevanagari';

// Initialize number-to-words converter
const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
        currencyOptions: {
            name: 'Rupee',
            plural: 'Rupees',
            symbol: '₹',
            fractionalUnit: {
                name: 'Paise',
                plural: 'Paise',
                symbol: '',
            },
        },
    },
});

// Helper: Calculate Row Totals
const calculateRow = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discPercent = parseFloat(item.discount_percent) || 0;

    // Correctly handle Tax Percent
    let gstPercent = parseFloat(item.gst_percent) || 0;
    if (gstPercent === 0) {
        const sgst = parseFloat(item.sgst_percent) || 0;
        const cgst = parseFloat(item.cgst_percent) || 0;
        gstPercent = sgst + cgst;
    }

    // Inclusive Tax Logic
    const gross = qty * rate;
    const discAmt = (gross * discPercent) / 100;
    const final = gross - discAmt; // Amount is MRP * Qty - Discount

    // Taxable value is back-calculated from final amount
    const taxable = final / (1 + (gstPercent / 100)); // Total taxable for the row
    
    // Per item taxable (Rate - gst) of qty 1
    const rateAfterDisc = rate * (1 - discPercent / 100);
    const taxablePerItem = rateAfterDisc / (1 + (gstPercent / 100));

    const gstAmt = final - taxable;
    const sgstAmt = gstAmt / 2;
    const cgstAmt = gstAmt / 2;

    return { gross, discAmt, taxable, taxablePerItem, sgstAmt, cgstAmt, final, gstPercent };
};

// Helper: Convert Image URL to Base64
const getBase64ImageFromUrl = async (imageUrl) => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image:", error);
        return null;
    }
};

export const generatePDF = async (data, items, shopSettings, action = 'view') => {
    const doc = new jsPDF('p', 'mm', 'a4');

    const currentItems = items || [];
    const pdfTotals = currentItems.reduce((acc, item) => {
        const row = calculateRow(item);
        return {
            gross: acc.gross + row.gross,
            discount: acc.discount + row.discAmt,
            taxable: acc.taxable + row.taxable,
            sgst: acc.sgst + row.sgstAmt,
            cgst: acc.cgst + row.cgstAmt,
            final: acc.final + row.final
        };
    }, { gross: 0, discount: 0, taxable: 0, sgst: 0, cgst: 0, final: 0 });

    const freight = parseFloat(data.freight_charges) || 0;
    const labour = parseFloat(data.labour_charges) || 0;

    // Calculate Extra Tax for PDF Display (18%)
    const extraTax = (freight + labour) * 0.18;

    // Adjust Totals for PDF
    if (data.is_interstate) {
        pdfTotals.igst = (pdfTotals.igst || 0) + extraTax;
    } else {
        pdfTotals.sgst += extraTax / 2;
        pdfTotals.cgst += extraTax / 2;
    }

    const totalFinal = pdfTotals.final + freight + labour + extraTax;

    // --- Border & Header ---
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 280); // Page Border leaves 12mm safe margin at bottom

    // Auspicious Blessings with Hindi Font
    doc.addFileToVFS("NotoSansDevanagari.ttf", NotoSansDevanagari);
    doc.addFont("NotoSansDevanagari.ttf", "NotoSansDevanagari", "normal");
    doc.setFont("NotoSansDevanagari", "normal");
    doc.setFontSize(11);
    doc.setTextColor(178, 34, 34); // Crimson/Dark Red

    if (shopSettings?.blessing_left) {
        doc.text(shopSettings.blessing_left, 10, 10);
    }
    if (shopSettings?.blessing_center) {
        doc.text(shopSettings.blessing_center, 105, 10, { align: "center" });
    }
    if (shopSettings?.blessing_right) {
        doc.text(shopSettings.blessing_right, 200, 10, { align: "right" });
    }

    // Reset text color and switch back to Helvetica for invoice body
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");

    const titleY = (shopSettings?.blessing_left || shopSettings?.blessing_center || shopSettings?.blessing_right) ? 18 : 15;

    // Business Name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text((shopSettings?.business_name || "HIMALAYAN ENTERPRISES"), 105, titleY, { align: "center" });

    if (shopSettings?.business_description) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        const descLines = doc.splitTextToSize(`Suppliers of: ${shopSettings.business_description}`, 180);
        doc.text(descLines, 105, titleY + 5, { align: "center" });
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const addressY = shopSettings?.business_description ? titleY + 13 : titleY + 7;
    doc.text(shopSettings?.address || "H.O.: Main Market, Near Bus Stand\nKullu, Himachal Pradesh - 175101", 105, addressY, { align: "center" });
    doc.text(`Phone: ${shopSettings?.contacts || "98160-XXXXX"}`, 105, addressY + 9, { align: "center" });

    // GST INVOICE BLOCK
    const gstTitleY = addressY + 14;
    doc.line(80, gstTitleY, 130, gstTitleY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("GST INVOICE", 105, gstTitleY + 4, { align: "center" });
    doc.line(80, gstTitleY + 6, 130, gstTitleY + 6);

    doc.setFontSize(9);
    doc.text(`GSTIN: ${shopSettings?.gstin || "XXXXXXXXXXXXXXX"}`, 105, gstTitleY + 11, { align: "center" });

    // --- Customer & Invoice Details ---
    const boxTop = gstTitleY + 14;
    const boxHeight = 35; // Increased to 35
    doc.rect(5, boxTop, 200, boxHeight);
    doc.line(105, boxTop, 105, boxTop + boxHeight);

    // Left Side: Customer
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("M/s " + (data.customer_name || "").toUpperCase(), 10, boxTop + 6);
    doc.setFont("helvetica", "normal");
    doc.text("Address: " + (data.customer_address || ""), 10, boxTop + 11);
    doc.text("PH.NO.: " + (data.customer_phone || ""), 10, boxTop + 16);
    doc.text("GSTIN: " + (data.gstin || ""), 10, boxTop + 21);

    // Right Side: Invoice
    const rightColX = 110;
    const valX = 160;

    doc.setFont("helvetica", "bold");
    doc.text("Invoice No.:", rightColX, boxTop + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.invoice_number}`, valX, boxTop + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", rightColX, boxTop + 11);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString()}`, valX, boxTop + 11);

    doc.setFont("helvetica", "bold");
    doc.text("E-Way Bill:", rightColX, boxTop + 16);
    doc.setFont("helvetica", "normal");
    if (data.eway_bill_no) {
        doc.text(`${data.eway_bill_no}`, valX, boxTop + 16);
    }

    doc.setFont("helvetica", "bold");
    doc.text("Mode:", rightColX, boxTop + 21);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.payment_mode || 'Cash'}`, valX, boxTop + 21);

    // Add Transport Details in the box
    doc.line(5, boxTop + boxHeight - 8, 205, boxTop + boxHeight - 8); // Horizontal separator for Transport
    doc.setFontSize(8);
    // Safe access with string conversion
    doc.text(`Transport No: ${data.transport_no || "-"}`, 10, boxTop + boxHeight - 3);
    doc.text(`Driver Name: ${data.driver_name || "-"}`, 115, boxTop + boxHeight - 3);

    // --- Table ---
    const tableColumn = ["S.", "Product", "HSN", "Qty.", "Rate", "Disc%", "Taxable Amt", "SGST", "CGST", "Amount"];
    const tableRows = [];

    currentItems.forEach((item, index) => {
        const rowCalc = calculateRow(item);
        const productData = [
            index + 1,
            item.item_name,
            item.hsn_code || "-",
            item.quantity,
            parseFloat(item.rate).toFixed(2),
            parseFloat(item.discount_percent || 0).toFixed(2),
            rowCalc.taxablePerItem.toFixed(2),
            `${(rowCalc.gstPercent / 2).toFixed(2)}%`,
            `${(rowCalc.gstPercent / 2).toFixed(2)}%`,
            rowCalc.final.toFixed(2)
        ];
        tableRows.push(productData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: boxTop + boxHeight + 5,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1, valign: 'middle', halign: 'center', lineWidth: 0.1, lineColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            1: { halign: 'left' },
            7: { halign: 'center' }, // SGST/IGST Rate
            8: { halign: 'center' }, // CGST/IGST Amount
            9: { halign: 'right' } // Amount
        },
        margin: { left: 5, right: 5, bottom: 85 } // Safe bottom margin to prevent overlapping footer over multiple items
    });

    // --- Footer ---
    const bottomBorderY = 285; // 5 (top) + 280 (height)
    const footerHeight = 70;
    const footerY = bottomBorderY - footerHeight;

    // Ensure table doesn't overlap
    if (doc.lastAutoTable && doc.lastAutoTable.finalY > footerY) {
        doc.addPage();
        doc.rect(5, 5, 200, 280);
    }

    // Footer Box
    doc.rect(5, footerY, 200, footerHeight);
    doc.line(105, footerY, 105, footerY + footerHeight);

    // === LEFT SIDE ===
    let leftY = footerY + 4;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const gstString = `GST ${pdfTotals.taxable.toFixed(2)}*9+9%=${pdfTotals.sgst.toFixed(2)}SGST+${pdfTotals.cgst.toFixed(2)}CGST, CESS:0%=0`;
    doc.text(gstString, 7, leftY);

    doc.line(5, leftY + 2, 105, leftY + 2);
    leftY += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    try {
        const amountInWords = toWords.convert(Math.round(totalFinal));
        doc.text(`Rs. ${amountInWords}`, 7, leftY);
    } catch (e) {
        doc.text(`Rs. ${Math.round(totalFinal)}`, 7, leftY);
    }

    doc.line(5, leftY + 2, 105, leftY + 2);
    leftY += 5;

    // Bank Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("BANK DETAILS:", 7, leftY);
    leftY += 3.5;

    const bankRow = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 7, leftY);
        doc.setFont("helvetica", "normal");
        doc.text(String(value || ""), 30, leftY);
        leftY += 3.5;
    };

    bankRow("Bank Name :", shopSettings?.bank_name || "SBI");
    bankRow("Branch :", shopSettings?.bank_branch || "Sainj");
    bankRow("A/C No :", shopSettings?.account_number || "");
    bankRow("IFSC :", shopSettings?.ifsc_code || "");

    doc.line(5, leftY, 105, leftY); // Separator after Bank
    leftY += 3.5;

    // --- DUE PAYMENT DETAILS ---
    const payingNow = data.paying_now !== null && data.paying_now !== undefined ? parseFloat(data.paying_now) : totalFinal;
    const previousDue = parseFloat(data.previous_due) || 0;
    const currentBillDue = Math.max(0, totalFinal - payingNow);
    const totalPendingAmount = previousDue + totalFinal - payingNow;

    if (previousDue > 0 || totalFinal - payingNow !== 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("Due Payment Details:", 7, leftY);
        leftY += 3.5;
        
        const dueRow = (label, amt) => {
            doc.setFont("helvetica", "normal");
            doc.text(label, 7, leftY);
            doc.text(amt.toFixed(2), 100, leftY, { align: "right" });
            leftY += 3.5;
        };
        dueRow("Previous Due:", previousDue);
        dueRow("Current Bill Due:", currentBillDue);
        dueRow("Amount Paid Now:", payingNow);
        
        // Attractive Box for Total Pending Amount
        doc.setFillColor(235, 235, 235); // Light Gray Background
        doc.rect(5, leftY - 2.5, 100, 5, "F"); // Fill exactly the left column securely inside
        doc.line(5, leftY - 2.5, 105, leftY - 2.5); // Top border of highlight
        
        doc.setFont("helvetica", "bold");
        doc.text("Total Pending Amount:", 7, leftY + 0.8);
        doc.text(totalPendingAmount.toFixed(2), 100, leftY + 0.8, { align: "right" });
        leftY += 3.5;
        
        doc.line(5, leftY - 1, 105, leftY - 1); // Separator
        leftY += 3.5;
    }

    // Terms & Conditions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Terms & Conditions:", 7, leftY);
    leftY += 3.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);

    const termsText = shopSettings?.terms_and_conditions ||
        `1. Goods once sold will not be taken back or exchanged.
2. Bills not paid due date will attract 24% interest.
3. All disputes subject to Jurisdiction only.`;

    const splitTerms = doc.splitTextToSize(termsText, 95);
    doc.text(splitTerms, 7, leftY);

    // === RIGHT SIDE ===
    let rightY = footerY + 5;
    const rightLabelX = 110;
    const rightValX = 200;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    // === RIGHT SIDE ===
    // Variables rightY, rightLabelX, rightValX are already defined above.

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    // 1. Sub Total
    doc.text("Sub Total", rightLabelX, rightY);
    doc.text(pdfTotals.taxable.toFixed(2), rightValX, rightY, { align: 'right' });

    // 2. Freight (Always Show)
    rightY += 5;
    doc.text("Freight Charge", rightLabelX, rightY);
    doc.text(freight.toFixed(2), rightValX, rightY, { align: 'right' });

    // 3. Labour (Always Show)
    rightY += 5;
    doc.text("Labour Charge", rightLabelX, rightY);
    doc.text(labour.toFixed(2), rightValX, rightY, { align: 'right' });

    // 4. Taxable Amount
    const totalTaxableAmount = pdfTotals.taxable + freight + labour;
    rightY += 5;
    doc.line(rightLabelX, rightY - 3, rightValX, rightY - 3);
    doc.text("Taxable Amount", rightLabelX, rightY);
    doc.text(totalTaxableAmount.toFixed(2), rightValX, rightY, { align: 'right' });

    // 5. Taxes
    rightY += 5;
    doc.text("SGST", rightLabelX, rightY);
    doc.text(pdfTotals.sgst.toFixed(2), rightValX, rightY, { align: 'right' });

    rightY += 5;
    doc.text("CGST", rightLabelX, rightY);
    doc.text(pdfTotals.cgst.toFixed(2), rightValX, rightY, { align: 'right' });

    const grandTotalY = rightY + 10;
    doc.line(105, grandTotalY - 4, 205, grandTotalY - 4);
    doc.setFontSize(10);
    doc.text("GRAND TOTAL", rightLabelX, grandTotalY);
    doc.text(totalFinal.toFixed(2), rightValX, grandTotalY, { align: 'right' });
    doc.line(105, grandTotalY + 2, 205, grandTotalY + 2);

    const sigBlockY = grandTotalY + 8;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("For " + (shopSettings?.business_name || "HIMALAYAN ENTERPRISES"), 155, sigBlockY, { align: "center" });

    // Enable Signature Image
    if (shopSettings?.signature_url) {
        const sigUrl = shopSettings.signature_url.startsWith('http')
            ? shopSettings.signature_url
            : `${window.location.protocol}//${window.location.hostname}:5000${shopSettings.signature_url}`;

        const base64Img = await getBase64ImageFromUrl(sigUrl);
        if (base64Img) {
            try {
                doc.addImage(base64Img, 'PNG', 135, sigBlockY + 2, 40, 15);
            } catch (e) {
                console.error("Sig error", e);
            }
        }
    }

    doc.text("Authorized Signatory", 155, sigBlockY + 20, { align: "center" });

    if (action === 'save') {
        doc.save(`${data.invoice_number}.pdf`);
    } else if (action === 'return_blob') {
        return doc.output('bloburl');
    } else if (action === 'print_blob') {
        doc.autoPrint();
        return doc.output('bloburl');
    } else {
        window.open(doc.output('bloburl'), '_blank');
    }
};
