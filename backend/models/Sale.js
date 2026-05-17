const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Linked to an order when auto-created; null for manual entries
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    revenue: {
      type: Number,
      required: [true, 'Revenue is required'],
      min: [0, 'Revenue cannot be negative'],
    },
    costOfGoodsSold: {
      type: Number,
      required: [true, 'COGS is required'],
      min: [0, 'COGS cannot be negative'],
      default: 0,
    },
    profit: {
      type: Number,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-compute profit before every save
SaleSchema.pre('save', function (next) {
  this.profit = this.revenue - this.costOfGoodsSold;
  next();
});

module.exports = mongoose.model('Sale', SaleSchema);
