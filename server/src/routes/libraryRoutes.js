const express = require('express');
const router = express.Router();
const {
  getLibraryOverview,
  allocateSeat,
  releaseSeat,
  toggleBlockSeat,
  configureCapacity
} = require('../controllers/libraryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/overview', getLibraryOverview);
router.post('/allocate', allocateSeat);
router.post('/release', releaseSeat);
router.post('/toggle-block', toggleBlockSeat);
router.post('/configure-capacity', configureCapacity);

module.exports = router;
