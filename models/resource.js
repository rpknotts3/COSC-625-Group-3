// models/Resource.js
const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  event:         { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name:          { type: String, required: true },
  url:           { type: String, required: true },
}, { timestamps: { createdAt: 'uploaded_at', updatedAt: false } });

module.exports = mongoose.model('Resource', ResourceSchema);
