import Chat from '../models/Chat.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const setupSocketHandlers = (io) => {
  // Map to store connected users
  const connectedUsers = new Map();

  // Middleware for authenticating socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  // Handle new socket connections
  io.on('connection', (socket) => {
    if (!socket.user) {
      console.warn('Unauthorized socket connection. Disconnecting.');
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Store user in connectedUsers map
    connectedUsers.set(socket.user._id.toString(), socket.id);

    // Join personal room for private messaging or notifications
    socket.join(socket.user._id.toString());

    // User joins a chat room
    socket.on('join_chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.toString() === socket.user._id.toString())) {
          socket.join(chatId);
          console.log(`${socket.user.username} joined chat: ${chatId}`);
          // Emit joined_chat event to confirm join
          socket.emit('joined_chat', { chatId });
        } else {
          socket.emit('error', { message: 'Not authorized to join this chat' });
        }
      } catch (error) {
        console.error(`Error joining chat: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    // User leaves a chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      console.log(`${socket.user.username} left chat: ${chatId}`);
    });

    // Send a message in a chat
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, attachments } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        if (!chat.participants.some(p => p.toString() === socket.user._id.toString())) {
          return socket.emit('error', { message: 'Not authorized to send messages in this chat' });
        }

        const newMessage = {
          sender: socket.user._id,
          content,
          attachments: attachments || [],
          isAI: false,
          timestamp: new Date()
        };

        chat.messages.push(newMessage);
        await chat.save();
        console.log('User message saved:', newMessage);

        const populatedChat = await Chat.findById(chatId)
          .populate('messages.sender', 'username avatar');

        const addedMessage = populatedChat.messages[populatedChat.messages.length - 1];

        io.to(chatId).emit('new_message', {
          chatId,
          message: addedMessage
        });

        chat.participants.forEach(participantId => {
          const socketId = connectedUsers.get(participantId.toString());
          if (socketId) {
            io.to(socketId).emit('chat_updated', {
              chatId,
              lastMessage: addedMessage
            });
          }
        });

      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicator logic
    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;

      socket.to(chatId).emit('user_typing', {
        chatId,
        userId: socket.user._id,
        username: socket.user.username,
        isTyping
      });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
      connectedUsers.delete(socket.user._id.toString());
    });
  });
};
