const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  exportStudentsExcel,
  exportPaymentsExcel,
  exportStudentArchive,
  dangerWipePayments,
  dangerWipeStudents,
  dangerWipeAll
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/export/students', exportStudentsExcel);
router.get('/export/payments', exportPaymentsExcel);
router.get('/export/student-archive/:id', exportStudentArchive);

// Secret Danger Zone Actions (Protected by Admin Password re-entry)
router.post('/danger/wipe-payments', dangerWipePayments);
router.post('/danger/wipe-students', dangerWipeStudents);
router.post('/danger/wipe-all', dangerWipeAll);

module.exports = router;
