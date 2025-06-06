import Chat from '../models/Chat.js';

// Get all chats for a user
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username avatar')
      .select('-messages')
      .lean();

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    console.error('Error in getUserChats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats'
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

    // Ensure messages are properly structured
    const processedMessages = chat.messages.map(msg => ({
      ...msg.toObject(),
      sender: msg.isAI ? { username: "AI" } : msg.sender
    }));

    res.status(200).json({
      success: true,
      data: {
        ...chat.toObject(),
        messages: processedMessages
      }
    });
  } catch (error) {
    console.error('Error in getChatById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat details'
    });
  }
};

// Create a new chat
export const createChat = async (req, res) => {
  try {
    const { title } = req.body;

    const newChat = await Chat.create({
      title: title?.trim() || 'New Conversation',
      participants: [req.user._id],
      messages: []
    });

    // Populate the new chat with user info
    const populatedChat = await Chat.findById(newChat._id)
      .populate('participants', 'username avatar')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedChat
    });
  } catch (error) {
    console.error('Error in createChat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat'
    });
  }
};

// Add message to chat
export const addMessage = async (req, res) => {
  try {
    const { content, attachments, isAI = false } = req.body;
    const chatId = req.params.id;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

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

    // Create new message with proper structure
    const newMessage = {
      sender: isAI ? null : req.user._id,
      content: content.trim(),
      attachments: attachments || [],
      isAI,
      timestamp: new Date()
    };

    // Add message using model method
    await chat.addMessage(newMessage);

    // Get the updated chat with populated sender info
    const updatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'username avatar');

    const addedMessage = updatedChat.messages[updatedChat.messages.length - 1];

    // Ensure proper message structure in response
    const responseMessage = {
      ...addedMessage.toObject(),
      sender: isAI ? { username: "AI" } : addedMessage.sender
    };

    res.status(201).json({
      success: true,
      data: responseMessage
    });
  } catch (error) {
    console.error('Error in addMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message'
    });
  }
};

// Get new messages since last check
export const getNewMessages = async (req, res) => {
  try {
    const { lastMessageId } = req.query;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId)
      .populate('messages.sender', 'username avatar');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    let newMessages = [];
    if (lastMessageId) {
      const lastMessageIndex = chat.messages.findIndex(
        m => m._id.toString() === lastMessageId
      );
      if (lastMessageIndex !== -1) {
        // Get messages after the last message
        newMessages = chat.messages.slice(lastMessageIndex + 1);

        // Filter out any duplicate messages based on content and timestamp
        newMessages = newMessages.filter((msg, index, self) =>
          index === self.findIndex(m =>
            m._id.toString() === msg._id.toString() ||
            (m.content === msg.content &&
              Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 1000)
          )
        );
      }
    }

    res.status(200).json({
      success: true,
      data: newMessages
    });
  } catch (error) {
    console.error('Error in getNewMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch new messages'
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
    console.error('Error in deleteChat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat'
    });
  }
};

// Update chat title
export const updateChatTitle = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
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

    chat.title = title.trim();
    await chat.save();

    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Error in updateChatTitle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat title'
    });
  }
};