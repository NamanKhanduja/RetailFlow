const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    unit: {
      type: String,
      default: 'pcs', // e.g. kg, litre, pcs, box
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Threshold cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: stockStatus ─────────────────────────────────────────────────────
// Computed on read — not stored in DB, always accurate.
ProductSchema.virtual('stockStatus').get(function () {
  if (this.quantity === 0) return 'Out of Stock';
  if (this.quantity <= this.lowStockThreshold) return 'Short Stock';
  return 'Sufficient';
});

// ─── Virtual: profitMargin ────────────────────────────────────────────────────
ProductSchema.virtual('profitMargin').get(function () {
  if (this.sellingPrice === 0) return 0;
  return (((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100).toFixed(2);
});

// ─── Compound index: unique SKU per shop ──────────────────────────────────────
ProductSchema.index({ shop: 1, sku: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Product', ProductSchema);
