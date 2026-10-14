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

// Generate Full Fee History & Statement PDF for a Student
function generateStudentFeeStatementPDF(student, dues, payments, settings, res) {
  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'portrait' });
  doc.pipe(res);

  const navyColor = '#0F172A';
  const lightGrey = '#F8FAFC';
  const darkSlate = '#334155';
  const greenColor = '#16A34A';
  const redColor = '#DC2626';

  // Header Banner
  doc.rect(36, 36, doc.page.width - 72, 70).fill(navyColor);
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(settings?.instituteName || 'NITIN SIR CLASSES', 50, 48, { align: 'center' });

  doc.fontSize(9)
     .font('Helvetica')
     .text(`${settings?.address || 'Kota, Rajasthan'} | Contact: ${settings?.contactNumber || '+91 9876543210'}`, 50, 72, { align: 'center' });

  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('STUDENT COMPLETE FEE LEDGER & RECEIPT STATEMENT', 50, 88, { align: 'center' });

  // Student Profile Summary Box
  const startY = 120;
  doc.rect(36, startY, doc.page.width - 72, 65).fill(lightGrey).stroke('#E2E8F0');

  doc.fillColor(navyColor).fontSize(10).font('Helvetica-Bold');
  doc.text(`Student: ${student.fullName}`, 48, startY + 12);
  doc.text(`Student ID: ${student.studentId}`, 360, startY + 12);

  doc.fillColor(darkSlate).fontSize(9).font('Helvetica');
  doc.text(`Mobile: ${student.mobileNumber}`, 48, startY + 28);
  doc.text(`Membership: ${student.membershipType.replace(/_/g, ' ').toUpperCase()}`, 360, startY + 28);

  const totalBilled = dues.reduce((acc, d) => acc + d.amount, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalRemaining = dues.reduce((acc, d) => acc + d.remainingAmount, 0);

  doc.text(`Total Billed: Rs. ${totalBilled.toFixed(2)}`, 48, startY + 44);
  doc.fillColor(greenColor).font('Helvetica-Bold');
  doc.text(`Total Paid: Rs. ${totalPaid.toFixed(2)}`, 200, startY + 44);
  doc.fillColor(totalRemaining > 0 ? redColor : greenColor);
  doc.text(`Net Outstanding: Rs. ${totalRemaining.toFixed(2)}`, 360, startY + 44);

  // Table 1: Fee Dues Breakdown
  let currentY = startY + 80;
  doc.fillColor(navyColor).fontSize(11).font('Helvetica-Bold');
  doc.text('1. Fee Billing Periods & Dues', 36, currentY);

  currentY += 16;
  doc.rect(36, currentY, doc.page.width - 72, 22).fill(navyColor);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
  doc.text('Billing Period', 46, currentY + 6);
  doc.text('Service', 210, currentY + 6);
  doc.text('Billed (Rs)', 300, currentY + 6);
  doc.text('Paid (Rs)', 390, currentY + 6);
  doc.text('Pending (Rs)', 480, currentY + 6);

  currentY += 22;
  if (dues.length === 0) {
    doc.fillColor(darkSlate).font('Helvetica').fontSize(9);
    doc.text('No fee dues recorded yet.', 46, currentY + 8);
    currentY += 24;
  } else {
    dues.forEach((d, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, currentY, doc.page.width - 72, 20).fill(rowBg);
      doc.fillColor(darkSlate).font('Helvetica').fontSize(8.5);
      doc.text(d.billingPeriod, 46, currentY + 5);
      doc.text(d.serviceType.toUpperCase(), 210, currentY + 5);
      doc.text(d.amount.toFixed(2), 300, currentY + 5);
      doc.text(d.paidAmount.toFixed(2), 390, currentY + 5);
      doc.fillColor(d.remainingAmount > 0 ? redColor : greenColor).font('Helvetica-Bold');
      doc.text(d.remainingAmount.toFixed(2), 480, currentY + 5);
      currentY += 20;
    });
  }

  // Table 2: Payment Transactions History
  currentY += 16;
  doc.fillColor(navyColor).fontSize(11).font('Helvetica-Bold');
  doc.text('2. Payment Receipts & Transactions History', 36, currentY);

  currentY += 16;
  doc.rect(36, currentY, doc.page.width - 72, 22).fill(navyColor);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
  doc.text('Receipt No', 46, currentY + 6);
  doc.text('Date', 155, currentY + 6);
  doc.text('Service', 240, currentY + 6);
  doc.text('Mode', 320, currentY + 6);
  doc.text('Amount (Rs)', 400, currentY + 6);
  doc.text('Remaining (Rs)', 480, currentY + 6);

  currentY += 22;
  if (payments.length === 0) {
    doc.fillColor(darkSlate).font('Helvetica').fontSize(9);
    doc.text('No payment transactions received yet.', 46, currentY + 8);
    currentY += 24;
  } else {
    payments.forEach((p, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, currentY, doc.page.width - 72, 20).fill(rowBg);
      doc.fillColor(darkSlate).font('Helvetica').fontSize(8.5);
      doc.text(p.receiptNumber, 46, currentY + 5);
      doc.text(new Date(p.paymentDate).toLocaleDateString('en-GB'), 155, currentY + 5);
      doc.text(p.serviceType.toUpperCase(), 240, currentY + 5);
      doc.text(p.paymentMethod.toUpperCase(), 320, currentY + 5);
      doc.fillColor(greenColor).font('Helvetica-Bold');
      doc.text(p.amountPaid.toFixed(2), 400, currentY + 5);
      doc.fillColor(darkSlate).font('Helvetica');
      doc.text(p.remainingBalance.toFixed(2), 480, currentY + 5);
      currentY += 20;
    });
  }

  // Signatory Footer
  const footerY = doc.page.height - 70;
  doc.rect(36, footerY, doc.page.width - 72, 0.5).stroke('#CBD5E1');
  doc.fillColor(darkSlate).fontSize(8).font('Helvetica');
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 46, footerY + 12);
  doc.text('Authorized Signatory - Nitin Sir Classes', doc.page.width - 240, footerY + 12, { align: 'right' });

  doc.end();
}

module.exports = { 
  generateReceiptPDF,
  generateStudentFeeStatementPDF
};
