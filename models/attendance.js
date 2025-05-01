// models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  event:     { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  checkin:   { type: Date, default: Date.now },
  checkout:  { type: Date },
  attended:  { type: Boolean, default: false }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
