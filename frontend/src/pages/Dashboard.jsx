import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, AlertCircle, FileUp, Loader, Edit, Check, X, ChevronLeft, MessageSquare, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatMessage from '../components/ChatMessage.jsx';
import ChatInput from '../components/ChatInput.jsx';
import FileUploadModal from '../components/FileUploadModal.jsx';

const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatData, setSelectedChatData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isJoiningChat, setIsJoiningChat] = useState(false); // NEW: track if waiting for join confirmation

  const { currentUser } = useAuth();
  const { socket, connected, joinChat, leaveChat, sendMessage, emitTyping } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      fetchChatDetails(selectedChatId);
      if (connected) {
        joinChat(selectedChatId);
      }
    } else {
      setSelectedChatData(null);
      setChatMessages([]);
      setNewTitle('');
      setChatError(null);
    }

    const prevSelectedChatId = selectedChatId;
    return () => {
      if (connected && prevSelectedChatId) {
        leaveChat(prevSelectedChatId);
      }
    };

  }, [selectedChatId, connected, joinChat, leaveChat]);

  // Ensure chatMessages is always in sync with selectedChatData.messages
  useEffect(() => {
    if (selectedChatData && Array.isArray(selectedChatData.messages)) {
      setChatMessages(selectedChatData.messages);
    }
  }, [selectedChatData]);

  useEffect(() => {
    if (!socket || !selectedChatId) return;

    const handleNewMessage = (data) => {
      if (data.chatId === selectedChatId) {
        // Instead of fetching, directly append the new message (user or AI) to chatMessages
        setChatMessages(prev => {
          // Prevent duplicate messages (by _id or timestamp)
          const exists = prev.some(
            m => (m._id && data.message._id && m._id === data.message._id) ||
              (!m._id && !data.message._id && m.timestamp === data.message.timestamp && m.content === data.message.content)
          );
          if (exists) return prev;
          return [...prev, data.message];
        });
        // Hide typing indicator if AI message
        if (data.message.isAI) {
          setIsTyping(false);
          setTypingUser('');
        }
      }
    };

    const handleUserTyping = (data) => {
      if (data.chatId === selectedChatId && data.userId !== currentUser?._id) {
        setIsTyping(data.isTyping);
        setTypingUser(data.username);
      }
    };

    const handleChatUpdated = (data) => {
      setChats(prevChats => prevChats.map(chat =>
        chat._id === data.chatId ? { ...chat, lastMessage: data.lastMessage, updatedAt: new Date() } : chat
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('chat_updated', handleChatUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('chat_updated', handleChatUpdated);
    };
  }, [socket, selectedChatId, currentUser]);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get('/api/chat', { withCredentials: true });

      if (response.data.success) {
        setChats(response.data.data);
        if (response.data.data.length > 0 && !selectedChatId) {
          setSelectedChatId(response.data.data[0]._id);
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch chats');
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError(err.message || 'An error occurred while fetching your conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatDetails = async (id) => {
    try {
      setIsChatLoading(true);
      setChatError(null);
      const response = await axios.get(`/api/chat/${id}`, { withCredentials: true });
      if (response.data.success) {
        setSelectedChatData(response.data.data);
        setChatMessages(response.data.data.messages);
        setNewTitle(response.data.data.title);
      } else {
        throw new Error(response.data.message || 'Failed to fetch chat details');
      }
    } catch (err) {
      console.error('Error fetching chat details:', err);
      setChatError(err.message || 'An error occurred while loading chat details');
      setSelectedChatId(null);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleJoinedChat = (data) => {
      if (data && data.chatId) {
        setSelectedChatId(data.chatId);
        setIsJoiningChat(false);
      }
    };

    socket.on('joined_chat', handleJoinedChat);
    return () => {
      socket.off('joined_chat', handleJoinedChat);
    };
  }, [socket]);

  const handleCreateNewChat = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        '/api/chat',
        { title: `Chat with AI` },
        { withCredentials: true }
      );
      if (response.data.success) {
        const newChat = response.data.data;
        setChats(prevChats => [newChat, ...prevChats].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        // Join the chat room before setting selectedChatId
        if (connected && joinChat) {
          joinChat(newChat._id);
          setIsJoiningChat(true); // Wait for socket confirmation
        }
        // Do NOT setSelectedChatId here; wait for joined_chat event
      } else {
        throw new Error(response.data.message || 'Failed to create new chat');
      }
    } catch (err) {
      console.error('Error creating chat:', err);
      setError(err.message || 'An error occurred while creating a new chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/chat/${chatId}`, { withCredentials: true });

      if (response.data.success) {
        setChats(prevChats => prevChats.filter(chat => chat._id !== chatId));
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
        }
      } else {
        throw new Error(response.data.message || 'Failed to delete chat');
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError(err.message || 'An error occurred while deleting the conversation');
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedChatId) return;
    try {
      setIsTyping(true);
      setTypingUser('AI');
      // Optimistically add user message for immediate feedback
      setChatMessages(prev => [
        ...prev,
        {
          sender: { _id: currentUser?._id, username: currentUser?.username },
          content,
          isAI: false,
          timestamp: new Date().toISOString(),
          attachments: []
        }
      ]);
      // Save user message to database via REST API (ensures persistence)
      await axios.post(
        `/api/chat/${selectedChatId}/messages`,
        { content },
        { withCredentials: true }
      );
      // Call AI API for response
      await axios.post(
        '/api/ai/message',
        { chatId: selectedChatId, message: content },
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setChatError('Failed to send message.');
    } finally {
      setIsTyping(false);
      setTypingUser('');
    }
  };

  const handleFileAnalyzed = async (fileData) => {
    if (!selectedChatId) return;

    try {
      const fileMessage = `I've uploaded a file: ${fileData.filename}`;
      sendMessage(selectedChatId, fileMessage);

      if (fileData.analysis) {
        const analysisMessage = `**File Analysis**:\n\n${fileData.analysis}`;
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setChatError('Failed to process file analysis.');
    } finally {
      setIsFileModalOpen(false);
    }
  };

  const handleTitleUpdate = async () => {
    if (!newTitle.trim() || newTitle === selectedChatData?.title || !selectedChatId) {
      setNewTitle(selectedChatData?.title || '');
      setEditingTitle(false);
      return;
    }

    try {
      const response = await axios.patch(
        `/api/chat/${selectedChatId}`,
        { title: newTitle },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSelectedChatData(prev => ({ ...prev, title: newTitle }));
        setChats(prevChats => prevChats.map(chat =>
          chat._id === selectedChatId ? { ...chat, title: newTitle } : chat
        ));
        setEditingTitle(false);
      } else {
        throw new Error(response.data.message || 'Failed to update title');
      }
    } catch (err) {
      console.error('Error updating title:', err);
      setChatError('Failed to update chat title');
      setNewTitle(selectedChatData?.title || '');
      setEditingTitle(false);
    }
  };

  const handleSidebarClose = () => setIsSidebarOpen(false);
  const handleSidebarOpen = () => setIsSidebarOpen(true);

  return (
    <div className="flex h-screen bg-[#101014] text-white relative">
      {/* Sidebar and overlay for mobile */}
      <Sidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={(id) => {
          setSelectedChatId(id);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onNewChat={handleCreateNewChat}
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
      />
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={handleSidebarClose}
        />
      )}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="h-16 flex items-center px-4 md:px-6 border-b border-gray-800 bg-[#18181b] shadow-sm z-10">
          {/* Sidebar toggle for mobile */}
          <button
            className="md:hidden mr-3 text-gray-400 hover:text-white"
            onClick={handleSidebarOpen}
            aria-label="Open sidebar"
          >
            <Menu size={28} />
          </button>
          <div className="text-lg font-semibold truncate">
            {selectedChatId && selectedChatData ? selectedChatData.title : 'New Chat'}
          </div>
        </div>
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#101014]">
          <div className="max-w-2xl mx-auto space-y-4">
            {isChatLoading ? (
              <div className="flex items-center justify-center h-full py-20">
                <Loader size={40} className="animate-spin text-blue-500" />
              </div>
            ) : chatError ? (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle size={40} className="text-red-500 mb-4" />
                <div className="text-lg font-medium mb-2">Error loading chat</div>
                <div className="text-gray-400 mb-4">{chatError}</div>
                <button
                  onClick={() => fetchChatDetails(selectedChatId)}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="text-lg font-medium mb-2">No messages yet</div>
                <div className="text-sm">Start the conversation by sending a message.</div>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <ChatMessage
                  key={index}
                  message={message}
                  isCurrentUser={message.sender && message.sender._id === currentUser?._id && !message.isAI}
                  ref={index === chatMessages.length - 1 ? lastMessageRef : null}
                />
              ))
            )}
            {isTyping && (
              <div className="text-gray-500 text-sm animate-pulse">{typingUser} is typing...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {/* File Upload Button */}
        {selectedChatId && !isChatLoading && !chatError && (
          <div className="absolute right-8 bottom-28 z-20">
            <button
              onClick={() => setIsFileModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200"
              aria-label="Upload file"
            >
              <FileUp size={20} />
            </button>
          </div>
        )}
        {/* Chat Input */}
        {selectedChatId && !isChatLoading && !chatError && (
          <div className="bg-[#18181b] border-t border-gray-800 px-6 py-4">
            <ChatInput onSendMessage={handleSendMessage} chatId={selectedChatId} onTyping={(status) => emitTyping(selectedChatId, status)} disabled={isJoiningChat} />
          </div>
        )}
        {/* File Upload Modal */}
        {selectedChatId && (
          <FileUploadModal
            isOpen={isFileModalOpen}
            onClose={() => setIsFileModalOpen(false)}
            onFileAnalyzed={handleFileAnalyzed}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;