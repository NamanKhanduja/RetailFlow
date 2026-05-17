const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProducts,
  getLowStockProducts,
  getProduct,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
} = require('../controllers/productController');

router.use(protect); // All product routes are protected

router.get('/low-stock', getLowStockProducts); // Must be before /:id
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);
router.patch('/:id/stock', adjustStock);

module.exports = router;
