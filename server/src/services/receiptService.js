const PDFDocument = require('pdfkit');

function generateReceiptPDF(payment, student, settings, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A5', layout: 'portrait' });

  // Stream PDF directly to HTTP response
  doc.pipe(res);

  // Styling Constants
  const navyColor = '#0F172A';
  const lightGrey = '#F1F5F9';
  const darkSlate = '#334155';
  const greenColor = '#16A34A';

  // Header Banner
  doc.rect(40, 40, doc.page.width - 80, 70).fill(navyColor);
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(settings?.instituteName || 'NITIN SIR CLASSES', 55, 52, { align: 'center' });

  doc.fontSize(9)
     .font('Helvetica')
     .text(`${settings?.address || 'Kota, Rajasthan'} | Contact: ${settings?.contactNumber || '+91 9876543210'}`, 55, 76, { align: 'center' });

  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text('FEE PAYMENT RECEIPT', 55, 92, { align: 'center' });

  // Receipt & Student Details Box
  const startY = 125;
  doc.rect(40, startY, doc.page.width - 80, 85).fill(lightGrey);

  doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold');
  doc.text(`Receipt No: ${payment.receiptNumber}`, 50, startY + 10);
  doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString('en-GB')}`, 250, startY + 10);

  doc.fillColor(darkSlate).font('Helvetica');
  doc.text(`Student Name: ${student.fullName}`, 50, startY + 28);
  doc.text(`Student ID: ${student.studentId}`, 250, startY + 28);

  doc.text(`Mobile: ${student.mobileNumber}`, 50, startY + 45);
  doc.text(`Service: ${payment.serviceType.toUpperCase()}`, 250, startY + 45);

  doc.text(`Billing Period: ${payment.billingPeriod}`, 50, startY + 62);
  doc.text(`Payment Mode: ${payment.paymentMethod.toUpperCase()}`, 250, startY + 62);

  // Financial Breakdown Table
  const tableY = 225;
  doc.rect(40, tableY, doc.page.width - 80, 24).fill(navyColor);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
  doc.text('Description', 50, tableY + 7);
  doc.text('Amount (INR)', doc.page.width - 130, tableY + 7);

  let currentY = tableY + 24;
  const items = [
    { label: `${payment.serviceType === 'coaching' ? 'Coaching' : 'Library'} Fee for Period`, val: `Rs. ${payment.originalFeeAmount.toFixed(2)}` },
    { label: 'Previously Paid', val: `Rs. ${payment.previousPaidAmount.toFixed(2)}` },
    { label: 'Amount Paid Now', val: `Rs. ${payment.amountPaid.toFixed(2)}`, highlight: true },
    { label: 'Remaining Outstanding Balance', val: `Rs. ${payment.remainingBalance.toFixed(2)}`, isDue: true }
  ];

  items.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(40, currentY, doc.page.width - 80, 22).fill(rowBg);

    if (item.highlight) {
      doc.fillColor(greenColor).font('Helvetica-Bold');
    } else if (item.isDue) {
      doc.fillColor(payment.remainingBalance > 0 ? '#DC2626' : greenColor).font('Helvetica-Bold');
    } else {
      doc.fillColor(darkSlate).font('Helvetica');
    }

    doc.text(item.label, 50, currentY + 6);
    doc.text(item.val, doc.page.width - 130, currentY + 6);
    currentY += 22;
  });

  // Optional UPI Ref
  if (payment.upiTransactionRef) {
    currentY += 10;
    doc.fillColor(darkSlate).fontSize(8).font('Helvetica');
    doc.text(`UPI Reference / Transaction ID: ${payment.upiTransactionRef}`, 50, currentY);
  }

  // Footer & Signature
  const footerY = 380;
  doc.rect(40, footerY, doc.page.width - 80, 0.5).stroke('#CBD5E1');

  doc.fillColor(darkSlate).fontSize(8).font('Helvetica');
  doc.text(settings?.receiptFooterNote || 'Thank you for your payment!', 50, footerY + 10, { width: 180 });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Authorized Signatory', doc.page.width - 150, footerY + 30);
  doc.text('Nitin Sir Classes', doc.page.width - 150, footerY + 42);

  doc.end();
}

module.exports = { generateReceiptPDF };
