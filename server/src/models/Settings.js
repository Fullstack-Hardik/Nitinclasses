const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  instituteName: {
    type: String,
    default: 'Nitin Sir Classes'
  },
  contactNumber: {
    type: String,
    default: '+91 9876543210'
  },
  email: {
    type: String,
    default: 'contact@nitinsirclasses.com'
  },
  address: {
    type: String,
    default: 'Main Branch, Near City Center, Kota, Rajasthan'
  },
  receiptPrefix: {
    type: String,
    default: 'NSC-REC'
  },
  receiptFooterNote: {
    type: String,
    default: 'Fees once paid are non-refundable. Thank you for learning with Nitin Sir Classes.'
  },
  boysLibraryTotalSeats: {
    type: Number,
    default: 50
  },
  girlsLibraryTotalSeats: {
    type: Number,
    default: 50
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
