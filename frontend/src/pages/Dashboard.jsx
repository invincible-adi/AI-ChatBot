import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, AlertCircle, Loader, Edit, Check, X, ChevronLeft, MessageSquare, Menu, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatMessage from '../components/ChatMessage.jsx';
import ChatInput from '../components/ChatInput.jsx';

const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatData, setSelectedChatData] = useState(null);
  const [chatMessagesMap, setChatMessagesMap] = useState({}); // { chatId: [messages] }
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isJoiningChat, setIsJoiningChat] = useState(false);
  const pollingIntervalRef = useRef(null);
  const processedMessageIds = useRef(new Set());

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Automatically open a new chat if there are no chats and no chat is selected
  useEffect(() => {
    if (!isLoading && chats.length === 0 && !selectedChatId) {
      handleCreateNewChat();
    }
  }, [isLoading, chats.length, selectedChatId]);

  useEffect(() => {
    if (selectedChatId) {
      fetchChatDetails(selectedChatId);
      // Start polling for new messages
      startPolling(selectedChatId);
    } else {
      setSelectedChatData(null);
      // Stop polling when no chat is selected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }

    const prevSelectedChatId = selectedChatId;
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedChatId]);

  // In polling, update chatMessagesMap for the selected chat
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessagesMap[selectedChatId]]);

  const startPolling = (chatId) => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start new polling interval (every 3 seconds)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(
          `/api/chat/${chatId}`,
          { withCredentials: true }
        );

        if (response.data.success) {
          const allMessages = response.data.data.messages;
          const newMessages = allMessages.filter(
            msg => !processedMessageIds.current.has(msg._id)
          );

          if (newMessages.length > 0) {
            setChatMessagesMap(prev => ({
              ...prev,
              [chatId]: [...(prev[chatId] || []), ...newMessages]
            }));

            newMessages.forEach(msg => processedMessageIds.current.add(msg._id));
            setIsTyping(false);
          }
        }
      } catch (err) {
        console.error('Error polling for new messages:', err);
      }
    }, 3000);
  };

  // Reset processed message IDs when changing chats
  useEffect(() => {
    if (selectedChatId) {
      processedMessageIds.current.clear();
    }
  }, [selectedChatId]);

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
        if (response.data.data.messages.length > 0) {
          setChatMessagesMap(prev => ({
            ...prev,
            [id]: response.data.data.messages
          }));
        }
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
        { title: 'New Chat' },
        { withCredentials: true }
      );
      if (response.data.success) {
        const newChat = response.data.data;
        setChats(prevChats => [newChat, ...prevChats].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedChatId(newChat._id);
        const greetingMessage = {
          content: "Hello! I'm your AI assistant. How can I help you today?",
          isAI: true,
          timestamp: new Date().toISOString(),
          sender: { username: 'AI' },
          attachments: []
        };
        setChatMessagesMap(prev => ({
          ...prev,
          [newChat._id]: [greetingMessage]
        }));
        setSelectedChatData({ ...newChat, messages: [greetingMessage] });
        setNewTitle(newChat.title || 'New Chat');
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
        setChatMessagesMap(prev => {
          const newMap = { ...prev };
          delete newMap[chatId];
          return newMap;
        });
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
          setSelectedChatData(null);
          setNewTitle('');
          setChatError(null);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
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

      // First, save user message to database
      const userMessageResponse = await axios.post(
        `/api/chat/${selectedChatId}/messages`,
        { content },
        { withCredentials: true }
      );

      if (userMessageResponse.data.success) {
        const userMessage = userMessageResponse.data.data;
        setChatMessagesMap(prev => ({
          ...prev,
          [selectedChatId]: [...(prev[selectedChatId] || []), userMessage]
        }));
        processedMessageIds.current.add(userMessage._id);

        // If this is the first user message, update the chat title
        if (!chatMessagesMap[selectedChatId] || chatMessagesMap[selectedChatId].length === 0) {
          const newTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
          try {
            const titleResponse = await axios.patch(
              `/api/chat/${selectedChatId}`,
              { title: newTitle },
              { withCredentials: true }
            );

            if (titleResponse.data.success) {
              setSelectedChatData(prev => ({ ...prev, title: newTitle }));
              setChats(prevChats => prevChats.map(chat =>
                chat._id === selectedChatId ? { ...chat, title: newTitle } : chat
              ));
              setNewTitle(newTitle);
            }
          } catch (err) {
            console.error('Error updating chat title:', err);
          }
        }
      }

      // Then call AI API for response
      const aiResponse = await axios.post(
        `/api/ai/message`,
        { chatId: selectedChatId, message: content },
        { withCredentials: true }
      );

      if (aiResponse.data.success) {
        const aiMessage = aiResponse.data.data;
        setChatMessagesMap(prev => ({
          ...prev,
          [selectedChatId]: [...(prev[selectedChatId] || []), aiMessage]
        }));
        processedMessageIds.current.add(aiMessage._id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setChatError('Failed to send message.');
    } finally {
      setIsTyping(false);
      setTypingUser('');
    }
  };

  // Add handleSendFile to handle file upload and send as chat message
  const handleSendFile = async (file, messageText) => {
    if (!selectedChatId) {
      setChatError('Please select or create a chat first');
      return;
    }

    if (!file) {
      setChatError('No file selected');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setChatError('File size exceeds 10MB limit');
      return;
    }

    try {
      setIsTyping(true);
      setTypingUser('AI');
      setChatError(null);

      // 1. Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('message', messageText || ''); // Include the message text with the file

      const uploadRes = await axios.post(`/api/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });

      if (uploadRes.data.success) {
        const fileData = uploadRes.data.data;
        // 2. Send the chat message with the file attachment
        const msgRes = await axios.post(
          `/api/chat/${selectedChatId}/messages`,
          {
            content: messageText || '',
            attachments: [fileData],
          },
          { withCredentials: true }
        );

        if (msgRes.data.success) {
          const userMessage = msgRes.data.data;
          setChatMessagesMap(prev => ({
            ...prev,
            [selectedChatId]: [...(prev[selectedChatId] || []), userMessage]
          }));
          processedMessageIds.current.add(userMessage._id);

          // Update chat title if this is the first message
          if (!chatMessagesMap[selectedChatId] || chatMessagesMap[selectedChatId].length === 0) {
            const newTitle = messageText || `File: ${file.name}`;
            const titleToUse = newTitle.length > 30 ? newTitle.substring(0, 30) + '...' : newTitle;
            try {
              const titleResponse = await axios.patch(
                `/api/chat/${selectedChatId}`,
                { title: titleToUse },
                { withCredentials: true }
              );

              if (titleResponse.data.success) {
                setSelectedChatData(prev => ({ ...prev, title: titleToUse }));
                setChats(prevChats => prevChats.map(chat =>
                  chat._id === selectedChatId ? { ...chat, title: titleToUse } : chat
                ));
                setNewTitle(titleToUse);
              }
            } catch (err) {
              console.error('Error updating chat title:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error sending file:', err);
      setChatError(err.response?.data?.message || 'Failed to send file. Please try again.');
    } finally {
      setIsTyping(false);
      setTypingUser('');
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleJoinChat = async (chatId) => {
    setIsJoiningChat(true);
    try {
      const response = await axios.post(
        `/api/chat/join`,
        { chatId },
        { withCredentials: true }
      );
      if (response.data.success) {
        setSelectedChatId(chatId);
        setChats(prevChats => {
          const chatToMove = prevChats.find(chat => chat._id === chatId);
          const otherChats = prevChats.filter(chat => chat._id !== chatId);
          return [chatToMove, ...otherChats];
        });
      } else {
        throw new Error(response.data.message || 'Failed to join chat');
      }
    } catch (err) {
      console.error('Error joining chat:', err);
      setError(err.message || 'An error occurred while joining the chat');
    } finally {
      setIsJoiningChat(false);
    }
  };

  const handleLeaveChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to leave this conversation?')) {
      return;
    }

    try {
      const response = await axios.post(
        `/api/chat/leave`,
        { chatId },
        { withCredentials: true }
      );

      if (response.data.success) {
        setChats(prevChats => prevChats.filter(chat => chat._id !== chatId));
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
          setSelectedChatData(null);
          setNewTitle('');
          setChatError(null);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        }
      } else {
        throw new Error(response.data.message || 'Failed to leave chat');
      }
    } catch (err) {
      console.error('Error leaving chat:', err);
      setError(err.message || 'An error occurred while leaving the chat');
    }
  };

  const handleUpdateChatTitle = async (title) => {
    if (!selectedChatId) return;
    try {
      const response = await axios.patch(
        `/api/chat/${selectedChatId}`,
        { title },
        { withCredentials: true }
      );

      if (response.data.success) {
        setNewTitle(title);
        setSelectedChatData(prev => ({ ...prev, title }));
        setChats(prevChats => prevChats.map(chat =>
          chat._id === selectedChatId ? { ...chat, title } : chat
        ));
      } else {
        throw new Error(response.data.message || 'Failed to update chat title');
      }
    } catch (err) {
      console.error('Error updating chat title:', err);
      setError(err.message || 'An error occurred while updating the chat title');
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchChats();
  };

  return (
    <div className="flex h-screen bg-[#181A20]">
      <Sidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onCreateChat={handleCreateNewChat}
        onDeleteChat={handleDeleteChat}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        isJoiningChat={isJoiningChat}
        onJoinChat={handleJoinChat}
        onLeaveChat={handleLeaveChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col h-full bg-[#22232B]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23242C] bg-[#181A20] shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleSidebar}
              className="p-2 hover:bg-[#23242C] rounded-lg lg:hidden text-gray-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {selectedChatData?.title || 'New Chat'}
            </h2>
          </div>
          {/* Add more header actions if needed */}
        </div>
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-0 sm:px-8 py-6 space-y-4 bg-[#22232B]">
          {isLoading && <Loader className="mx-auto text-gray-400" />}
          {chatError && (
            <div className="text-red-500 text-center">
              <AlertCircle className="inline-block mr-1" />
              {chatError}
            </div>
          )}
          {(chatMessagesMap[selectedChatId] || []).length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-4">
              No messages yet. Type a message below to start the conversation.
            </div>
          )}
          <div className="flex flex-col gap-4">
            {/* Deduplicate messages by _id before rendering */}
            {Array.from(
              new Map((chatMessagesMap[selectedChatId] || []).map(msg => [msg._id, msg])).values()
            ).map((msg, index) => (
              <div
                key={msg._id || `${index}-${msg.timestamp || ''}`}
                className={
                  msg.isAI
                    ? 'self-start max-w-[80%] bg-[#23242C] text-gray-100 rounded-2xl rounded-bl-none px-5 py-3 shadow-md border border-[#23242C]'
                    : 'self-end max-w-[80%] bg-[#2A2B32] text-white rounded-2xl rounded-br-none px-5 py-3 shadow-md border border-[#35363C]'
                }
                style={{ marginLeft: msg.isAI ? 0 : 'auto', marginRight: msg.isAI ? 'auto' : 0 }}
              >
                <ChatMessage
                  message={msg}
                  isLast={index === (chatMessagesMap[selectedChatId] || []).length - 1}
                />
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-gray-400 px-4 py-2 bg-[#23242C] rounded-lg animate-pulse self-start max-w-[80%]">
                <Loader className="w-4 h-4 animate-spin" />
                <span>AI's processing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {/* Chat input */}
        <div className="px-0 sm:px-8 py-6 bg-[#181A20] border-t border-[#23242C]">
          <ChatInput
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            disabled={isChatLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;