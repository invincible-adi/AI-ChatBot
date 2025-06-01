import Chat from '../models/Chat.js';

// Get all chats for a user
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username avatar')
      .select('-messages');

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single chat with messages
export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'username avatar')
      .populate('messages.sender', 'username avatar');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new chat
export const createChat = async (req, res) => {
  try {
    const { title } = req.body;

    const newChat = await Chat.create({
      title: title || 'New Conversation',
      participants: [req.user._id],
      messages: []
    });

    res.status(201).json({
      success: true,
      data: newChat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add message to chat
export const addMessage = async (req, res) => {
  try {
    const { content, attachments } = req.body;
    const chatId = req.params.id;

    // Find chat and check if user is participant
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add messages to this chat'
      });
    }

    // Create new message
    const newMessage = {
      sender: req.user._id,
      content,
      attachments: attachments || [],
      isAI: false
    };

    // Add message to chat
    chat.messages.push(newMessage);
    await chat.save();

    // Populate sender info
    const populatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'username avatar');

    const addedMessage = populatedChat.messages[populatedChat.messages.length - 1];

    res.status(201).json({
      success: true,
      data: addedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a chat
export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this chat'
      });
    }

    await chat.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update chat title
export const updateChatTitle = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this chat'
      });
    }

    chat.title = title;
    await chat.save();

    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};