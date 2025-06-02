import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, AlertCircle, FileUp, Loader, Edit, Check, X, ChevronLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import Header from '../components/Header.jsx';
import ChatList from '../components/ChatList.jsx';
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

  useEffect(() => {
    if (!socket || !selectedChatId) return;

    const handleNewMessage = (data) => {
      if (data.chatId === selectedChatId) {
        setChatMessages(prev => [...prev, data.message]);
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
        setSelectedChatId(newChat._id);
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
      // Send user message via socket
      sendMessage(selectedChatId, content);
      const newMessage = {
        sender: currentUser._id,
        content: content,
        isAI: false,
        timestamp: new Date(),
        attachments: []
      };
      setChatMessages(prev => [...prev, newMessage]);

      // Call AI API for response
      const aiRes = await axios.post(
        '/api/ai/message',
        { chatId: selectedChatId, message: content },
        { withCredentials: true }
      );
      if (aiRes.data && aiRes.data.success && aiRes.data.data) {
        setChatMessages(prev => [...prev, aiRes.data.data]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setChatError('Failed to send message.');
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

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        title={
          selectedChatId && selectedChatData ? (
            editingTitle ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 mr-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTitleUpdate();
                    } else if (e.key === 'Escape') {
                      setNewTitle(selectedChatData?.title || '');
                      setEditingTitle(false);
                    }
                  }}
                />
                <button
                  onClick={handleTitleUpdate}
                  className="p-1 text-green-500 hover:text-green-600"
                  aria-label="Save title"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setNewTitle(selectedChatData?.title || '');
                    setEditingTitle(false);
                  }}
                  className="p-1 text-red-500 hover:text-red-600 ml-1"
                  aria-label="Cancel"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                {selectedChatData.title}
                <button
                  onClick={() => setEditingTitle(true)}
                  className="ml-2 p-1 text-gray-500 hover:text-blue-500 transition-colors duration-200"
                  aria-label="Edit title"
                >
                  <Edit size={14} />
                </button>
              </div>
            )
          ) : (
            'AI Chat Dashboard'
          )
        }
        showBackButton={!!selectedChatId}
        onBackButtonClick={() => setSelectedChatId(null)}
        showLogout={true}
      />

      <main className="flex-1 overflow-hidden flex">
        <div className={`w-full md:w-80 lg:w-96 overflow-y-auto border-r dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${isSidebarOpen ? 'flex' : 'hidden'} ${selectedChatId && 'md:flex'}`}>
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Conversations
            </h3>

            <button
              onClick={handleCreateNewChat}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow-sm transition-colors duration-200"
              disabled={isLoading}
              aria-label="Create new chat"
            >
              <Plus size={16} className="mr-1" />
              New
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 m-4 rounded-md animate-fade-in text-sm text-red-800 dark:text-red-300 flex-shrink-0">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error loading chats:</p>
                  <p className="mt-1 text-red-700 dark:text-red-400">{error}</p>
                  <button
                    onClick={fetchChats}
                    className="text-sm text-red-600 dark:text-red-300 underline mt-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <ChatList
              chats={chats}
              onDeleteChat={handleDeleteChat}
              isLoading={isLoading}
              onSelectChat={(id) => { setSelectedChatId(id); setIsSidebarOpen(false); }}
            />
          </div>
        </div>

        {selectedChatId ? (
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
            {isChatLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading conversation...</p>
                </div>
              </div>
            ) : chatError ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Error loading chat</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{chatError}</p>
                  <button
                    onClick={() => fetchChatDetails(selectedChatId)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto space-y-4 message-list">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                        Start the conversation by sending a message
                      </p>
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
                    <div className="text-gray-500 text-sm animate-pulse">
                      {typingUser} is typing...
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {selectedChatId && !isChatLoading && !chatError && (
              <div className="absolute right-6 bottom-20 z-20">
                <button
                  onClick={() => setIsFileModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200"
                  aria-label="Upload file"
                >
                  <FileUp size={20} />
                </button>
              </div>
            )}

            {selectedChatId && !isChatLoading && !chatError && (
              <ChatInput onSendMessage={handleSendMessage} chatId={selectedChatId} onTyping={(status) => emitTyping(selectedChatId, status)} />
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <Loader size={48} className="text-blue-500 animate-spin" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chat...</p>
          </div>
        )}
      </main>

      {selectedChatId && (
        <FileUploadModal
          isOpen={isFileModalOpen}
          onClose={() => setIsFileModalOpen(false)}
          onFileAnalyzed={handleFileAnalyzed}
        />
      )}
    </div>
  );
};

export default Dashboard;