const express = require('express');
const router = express.Router();
const {
  getFeeDues,
  collectPayment,
  downloadReceipt,
  syncDues
} = require('../controllers/feeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getFeeDues);
router.post('/collect', collectPayment);
router.get('/receipt/:paymentId/pdf', downloadReceipt);
router.post('/sync', syncDues);

module.exports = router;
