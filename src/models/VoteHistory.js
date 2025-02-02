const mongoose = require('mongoose');

const VoteHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  vote: { type: String, enum: ['A', 'B'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VoteHistory', VoteHistorySchema);
