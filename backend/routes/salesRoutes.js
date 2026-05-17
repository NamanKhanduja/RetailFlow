const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSales,
  getDailySummary,
  getMonthlySummary,
  createSale,
  updateSale,
  deleteSale,
} = require('../controllers/salesController');

router.use(protect);

router.get('/daily',   getDailySummary);   // Must be before /:id
router.get('/monthly', getMonthlySummary);
router.route('/').get(getSales).post(createSale);
router.route('/:id').put(updateSale).delete(deleteSale);

module.exports = router;
