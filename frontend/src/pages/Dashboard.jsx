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
    const [isStreaming, setIsStreaming] = useState(false);
    const eventSourceRef = useRef(null);
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
        if (!selectedChatId || isStreaming) return;

        try {
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

                if ((chatMessagesMap[selectedChatId]?.length || 0) <= 1) {
                    const newTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
                    handleUpdateChatTitle(newTitle);
                }
            } else {
                throw new Error('Failed to save user message.');
            }

            setIsStreaming(true);
            const aiMessageId = `ai-placeholder-${Date.now()}`;
            const placeholder = {
                _id: aiMessageId,
                content: '',
                isAI: true,
                timestamp: new Date().toISOString(),
                sender: { username: 'AI' }
            };
            setChatMessagesMap(prev => ({
                ...prev,
                [selectedChatId]: [...(prev[selectedChatId] || []), placeholder]
            }));

            eventSourceRef.current = new EventSource(`/api/ai/message?chatId=${selectedChatId}&message=${encodeURIComponent(content)}`);

            eventSourceRef.current.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    setIsStreaming(false);
                    eventSourceRef.current.close();
                    fetchChatDetails(selectedChatId);
                    return;
                }

                const parsedData = JSON.parse(event.data);

                if (parsedData.error) {
                    setChatError(parsedData.error);
                    setChatMessagesMap(prev => ({
                        ...prev,
                        [selectedChatId]: prev[selectedChatId].filter(msg => msg._id !== aiMessageId)
                    }));
                    setIsStreaming(false);
                    eventSourceRef.current.close();
                    return;
                }

                setChatMessagesMap(prev => {
                    const newMap = { ...prev };
                    const chatMessages = newMap[selectedChatId] || [];
                    const msgIndex = chatMessages.findIndex(msg => msg._id === aiMessageId);

                    if (msgIndex !== -1) {
                        const updatedMessages = [...chatMessages];
                        updatedMessages[msgIndex] = {
                            ...updatedMessages[msgIndex],
                            content: updatedMessages[msgIndex].content + parsedData.content
                        };
                        newMap[selectedChatId] = updatedMessages;
                    }
                    return newMap;
                });
            };

            eventSourceRef.current.onerror = (err) => {
                console.error('EventSource failed:', err);
                setChatError('Failed to get response from AI.');
                setIsStreaming(false);
                eventSourceRef.current.close();
                setChatMessagesMap(prev => ({
                    ...prev,
                    [selectedChatId]: prev[selectedChatId].filter(msg => msg._id !== aiMessageId)
                }));
            };

        } catch (err) {
            console.error('Error sending message:', err);
            setChatError(err.response?.data?.message || 'Failed to send message.');
            setIsStreaming(false);
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
            formData.append('chatId', selectedChatId);
            formData.append('message', messageText || '');

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
                        attachments: [{
                            filename: fileData.filename,
                            originalname: file.name,
                            mimetype: file.type,
                            size: file.size,
                            path: fileData.path
                        }],
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

                    // Start AI response stream
                    handleSendMessage(messageText || `Received file: ${file.name}`);
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

    const handleStopStreaming = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            setIsStreaming(false);
            // Optionally, you might want to remove the placeholder or update its content
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
        <div className="relative flex h-screen bg-[#181A20] overflow-hidden">
            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <Sidebar
                chats={chats}
                selectedChatId={selectedChatId}
                onSelectChat={(id) => {
                    setSelectedChatId(id);
                    if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                    }
                }}
                onCreateChat={() => {
                    handleCreateNewChat();
                    if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                    }
                }}
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

            <div
                className={`flex-1 flex flex-col h-full bg-[#292a2d] transition-all duration-300 ease-in-out
    ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}
                style={{ minWidth: 0 }}
            >
                {/* Header */}
                <div className="flex lg:items-center lg:justify-center px-2 sm:px-4 py-3  bg-transparent shadow-sm sticky top-0 z-10">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleToggleSidebar}
                            className="p-2 hover:bg-[#23242C] rounded-lg text-gray-400 md:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-base sm:text-lg font-bold  text-white tracking-tight truncate max-w-[60vw]">
                            {selectedChatData?.title || 'New Chat'}
                        </h2>
                    </div>
                    {/* Add more header actions if needed */}
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-8 py-4 sm:py-6 space-y-4" style={{ minWidth: 0 }}>
                    {isLoading && <Loader className="mx-auto text-gray-400 animate-spin" />}
                    {chatError && (
                        <div className="text-red-500 text-center p-3 bg-red-900/20 rounded-lg">
                            <AlertCircle className="inline-block mr-2" />
                            {chatError}
                        </div>
                    )}
                    {(chatMessagesMap[selectedChatId] || []).length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 py-10">
                            <MessageSquare className="mx-auto w-10 h-10 sm:w-12 sm:h-12 text-gray-600" />
                            <p className="mt-2 text-sm sm:text-base">No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-3 sm:gap-4 w-full lg:max-w-[80%] mx-auto max-w-full">
                        {Array.from(
                            new Map((chatMessagesMap[selectedChatId] || []).map(msg => [msg._id, msg])).values()
                        ).map((msg) => (
                            <ChatMessage
                                key={msg._id}
                                msg={msg}
                                currentUser={currentUser}
                            />
                        ))}
                        {isTyping && (
                            <div className="flex items-center gap-2 text-gray-400 px-3 py-2 bg-[#23242C] rounded-lg animate-pulse self-start max-w-[90%] sm:max-w-[80%]">
                                <Loader className="w-4 h-4 animate-spin" />
                                <span className="text-xs sm:text-base">AI is processing...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Chat input */}
                <div className="px-2 sm:px-4 md:px-8 py-3 sm:py-4 bg-transparent sticky bottom-0 z-10">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onSendFile={handleSendFile}
                        isStreaming={isStreaming}
                        onStopStreaming={handleStopStreaming}
                        disabled={isChatLoading || isStreaming}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;