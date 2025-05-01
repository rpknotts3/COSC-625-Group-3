// models/Event.js
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  event_name:   { type: String, required: true, trim: true },
  description:  { type: String, required: true, trim: true },
  event_date:   { type: Date,   required: true },
  event_time:   { type: String, required: true }, // or Date if you prefer
  venue_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
  category_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  course_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course',   default: null },
  organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  status:       { type: String, enum: ['pending','approved','rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
