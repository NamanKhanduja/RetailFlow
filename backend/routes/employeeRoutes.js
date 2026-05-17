const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendanceByDate,
  getMonthlyAttendance,
  markAttendance,
  updateAttendance,
} = require('../controllers/employeeController');

router.use(protect);

// Attendance sub-routes (declared before /:id to avoid conflicts)
router.get('/attendance',         getAttendanceByDate);
router.post('/attendance',        markAttendance);
router.put('/attendance/:id',     updateAttendance);
router.get('/:id/attendance',     getMonthlyAttendance);

// Employee CRUD
router.route('/').get(getEmployees).post(createEmployee);
router.route('/:id').get(getEmployee).put(updateEmployee).delete(deleteEmployee);

module.exports = router;
