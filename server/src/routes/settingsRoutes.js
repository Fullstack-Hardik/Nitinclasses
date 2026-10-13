const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  exportStudentsExcel,
  exportPaymentsExcel,
  exportStudentArchive
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/export/students', exportStudentsExcel);
router.get('/export/payments', exportPaymentsExcel);
router.get('/export/student-archive/:id', exportStudentArchive);

module.exports = router;
