import mongoose from 'mongoose';

// Remove 'required' and 'default' from sender to make it truly optional
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // no required, no default
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAI: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }]
}, { _id: true });

const chatSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'New Conversation',
    trim: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: {
    type: [messageSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ 'messages.timestamp': 1 });

// Update the updatedAt timestamp before saving
chatSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for message count
chatSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

// Method to get last message
chatSchema.methods.getLastMessage = function () {
  return this.messages[this.messages.length - 1];
};

// Method to add message with proper timestamp
chatSchema.methods.addMessage = function (message) {
  message.timestamp = new Date();
  this.messages.push(message);
  this.updatedAt = message.timestamp;
  return this.save();
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;