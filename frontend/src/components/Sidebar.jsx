import React, { useState } from 'react';
import { Plus, User, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({
    chats = [],
    selectedChatId,
    onSelectChat,
    onCreateChat,
    isOpen = true,
    onClose,
    onDeleteChat
}) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const result = await logout();
        if (result.success) {
            navigate('/login');
        }
    };

    return (
        <>
            {/* Mobile overlay - only clickable when sidebar is open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={e => {
                        e.stopPropagation();
                        if (typeof onClose === 'function') onClose();
                    }}
                    aria-label="Close sidebar overlay"
                />
            )}
            <aside
                className={`fixed z-30 inset-y-0 left-0 w-[280px] bg-[#18181b] border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Mobile close button */}
                <div className="md:hidden flex justify-end p-2">
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            if (typeof onClose === 'function') onClose();
                        }}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X size={24} />
                    </button>
                </div>
                {/* Top: Logo and New Chat */}
                <div className="flex flex-col gap-4 p-4 border-b border-gray-800">
                    <div className="flex items-center gap-2 text-xl font-bold text-white">
                        <span className="text-blue-500">AI</span>
                        <span>ChatBot</span>
                    </div>
                    <button
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#23232a] hover:bg-[#2a2a31] rounded-lg text-white font-medium transition-colors w-full"
                        onClick={onCreateChat}
                    >
                        <Plus size={18} />
                        <span>New Chat</span>
                    </button>
                </div>
                {/* Middle: Chat History */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="text-gray-400 text-sm mb-2">Chat History</div>
                    <ul className="space-y-2">
                        {chats.length === 0 ? (
                            <li className="text-gray-500 text-sm text-center py-4">No chats yet</li>
                        ) : (
                            chats.map((chat) => (
                                <li
                                    key={chat._id}
                                    className={`px-3 py-2.5 rounded-lg cursor-pointer text-white flex items-center justify-between transition-colors ${selectedChatId === chat._id
                                        ? 'bg-[#23232a]'
                                        : 'hover:bg-[#23232a]'
                                        }`}
                                    onClick={() => onSelectChat(chat._id)}
                                >
                                    <span className="truncate max-w-[140px]">{chat.title || 'Untitled Chat'}</span>
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            if (typeof onDeleteChat === 'function') onDeleteChat(chat._id);
                                        }}
                                        className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-800 transition-colors"
                                        title="Delete chat"
                                        aria-label={`Delete chat ${chat.title}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
                {/* Bottom: User Menu */}
                <div className="p-4 border-t border-gray-800">
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[#23232a] text-gray-300 transition-colors"
                        >
                            <User size={18} />
                            <span className="flex-1 text-left truncate">{user?.username || 'User'}</span>
                        </button>

                        {showUserMenu && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#23232a] rounded-lg shadow-lg overflow-hidden">
                                <div className="px-3 py-2 text-sm text-gray-300 border-b border-gray-700">
                                    {user?.username || 'User'}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#2a2a31] transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;