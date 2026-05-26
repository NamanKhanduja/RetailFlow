/**
 * pairingEngine.js
 * ────────────────
 * Analyses historical orders to discover which products are frequently
 * bought together (market-basket / co-occurrence analysis).
 *
 * The resulting pairing map is injected into the AI system prompt so the
 * LLM can suggest companion products after ADD_PRODUCT or LOG_SALE actions.
 *
 * Example output:
 *   {
 *     "Bread":  [{ pairedWith: "Butter", count: 12 }, ...],
 *     "Butter": [{ pairedWith: "Bread",  count: 12 }, ...],
 *   }
 */

const Order = require('../models/Order');

/**
 * @param {string|ObjectId} shopId    – Authenticated shop owner ID
 * @param {number}          minCount  – Minimum co-occurrence to surface  (default 2)
 * @param {number}          topN      – Max pairs to return globally       (default 15)
 * @returns {Promise<Object>} Bidirectional map: productName → pairings[]
 */
async function getPairingRules(shopId, minCount = 2, topN = 15) {
  // Only consider orders that have at least 2 distinct items
  const orders = await Order.find({
    shop:     shopId,
    'items.1': { $exists: true }, // MongoDB: 'items.1' means index 1 exists → length >= 2
  }).select('items').lean();

  if (!orders.length) return {};

  // ── Build co-occurrence frequency map ────────────────────────────────────
  const coOccurrence = {};

  for (const order of orders) {
    const names = [...new Set(order.items.map((i) => i.productName))]; // dedupe within order

    // Generate every unique unordered pair
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join('|||');
        coOccurrence[key] = (coOccurrence[key] || 0) + 1;
      }
    }
  }

  // ── Filter by minimum frequency, sort by strength ─────────────────────
  const pairs = Object.entries(coOccurrence)
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN);

  if (!pairs.length) return {};

  // ── Build bidirectional lookup: A→B and B→A ───────────────────────────
  const pairingMap = {};

  for (const [key, count] of pairs) {
    const [a, b] = key.split('|||');

    if (!pairingMap[a]) pairingMap[a] = [];
    if (!pairingMap[b]) pairingMap[b] = [];

    pairingMap[a].push({ pairedWith: b, count });
    pairingMap[b].push({ pairedWith: a, count });
  }

  // Sort each product's list by descending co-occurrence count
  for (const key of Object.keys(pairingMap)) {
    pairingMap[key].sort((a, b) => b.count - a.count);
  }

  return pairingMap;
}

module.exports = { getPairingRules };
