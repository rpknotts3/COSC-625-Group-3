// models/Feedback.js
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  event:    { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  rating:   { type: Number, min: 1, max: 5, required: true },
  comments: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);