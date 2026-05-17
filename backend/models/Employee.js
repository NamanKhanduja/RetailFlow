const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
      default: 'Staff',
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
      default: 0,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', EmployeeSchema);
