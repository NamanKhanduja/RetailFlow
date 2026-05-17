const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/orderController');

router.use(protect);

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrder).delete(deleteOrder);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
