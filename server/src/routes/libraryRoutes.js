const express = require('express');
const router = express.Router();
const {
  getLibraryOverview,
  allocateSeat,
  releaseSeat,
  toggleBlockSeat,
  configureCapacity,
  addSeat,
  deleteSeat,
  getEligibleStudents
} = require('../controllers/libraryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/overview', getLibraryOverview);
router.post('/allocate', allocateSeat);
router.post('/release', releaseSeat);
router.post('/toggle-block', toggleBlockSeat);
router.post('/configure-capacity', configureCapacity);
router.post('/add-seat', addSeat);
router.post('/delete-seat', deleteSeat);
router.get('/eligible-students', getEligibleStudents);

module.exports = router;
