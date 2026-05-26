/**
 * demandPredictor.js
 * ──────────────────
 * Calculates per-product Sales Velocity over a rolling lookback window
 * and returns items whose current stock falls below a safety buffer
 * (avgDailySales × bufferDays).
 *
 * This data is injected into the AI system prompt so the LLM can answer
 * "Kya khatam hone wala hai?" with actual numbers instead of guessing.
 */

const Order   = require('../models/Order');
const Product  = require('../models/Product');
const mongoose = require('mongoose');

/**
 * @param {string|ObjectId} shopId      – The authenticated shop owner's ID
 * @param {number}          lookbackDays – Days of history to analyse   (default 7)
 * @param {number}          bufferDays   – Safety buffer multiplier      (default 3)
 * @returns {Promise<Array>} Sorted list of at-risk products (most urgent first)
 */
async function getLowStockPredictions(shopId, lookbackDays = 7, bufferDays = 3) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  since.setHours(0, 0, 0, 0);

  // ── Aggregate total quantity sold per product inside the lookback window ──
  const shopObjectId = new mongoose.Types.ObjectId(shopId);
  const salesData = await Order.aggregate([
    {
      $match: {
        shop:   shopObjectId,          // must be ObjectId in aggregation $match
        status: { $in: ['Completed', 'Pending', 'Processing'] },
        createdAt: { $gte: since },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        totalSold:   { $sum:  '$items.quantity'    },
      },
    },
  ]);

  if (!salesData.length) return [];

  // ── Fetch current stock for matched products ────────────────────────────
  const productIds = salesData.map((s) => s._id).filter(Boolean);
  const products   = await Product.find({
    shop: shopId,
    _id:  { $in: productIds },
  }).select('_id name quantity unit');

  const stockMap = {};
  products.forEach((p) => { stockMap[p._id.toString()] = p; });

  // ── Evaluate each product against its safety threshold ─────────────────
  const atRisk = [];

  for (const item of salesData) {
    const product = stockMap[item._id?.toString()];
    if (!product) continue;

    const avgDailySales    = item.totalSold / lookbackDays;
    const criticalThreshold = avgDailySales * bufferDays;
    const daysLeft =
      avgDailySales > 0
        ? Math.floor(product.quantity / avgDailySales)
        : Infinity;

    if (product.quantity <= criticalThreshold) {
      atRisk.push({
        name:              product.name,
        currentStock:      product.quantity,
        unit:              product.unit || 'pcs',
        avgDailySales:     parseFloat(avgDailySales.toFixed(2)),
        criticalThreshold: parseFloat(criticalThreshold.toFixed(2)),
        daysLeft:          daysLeft === Infinity ? 'N/A' : daysLeft,
      });
    }
  }

  // ── Sort by urgency: fewest days left first ─────────────────────────────
  atRisk.sort((a, b) => {
    if (a.daysLeft === 'N/A') return 1;
    if (b.daysLeft === 'N/A') return -1;
    return a.daysLeft - b.daysLeft;
  });

  return atRisk;
}

module.exports = { getLowStockPredictions };
