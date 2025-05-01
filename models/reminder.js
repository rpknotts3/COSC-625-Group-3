// models/Reminder.js
const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  time:  { type: Date, required: true },
  sent:  { type: Boolean, default: false }
});

module.exports = mongoose.model('Reminder', ReminderSchema);
