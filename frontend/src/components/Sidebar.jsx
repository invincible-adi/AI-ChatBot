import React from 'react';
import { Plus, Settings, User, X } from 'lucide-react';

const Sidebar = ({
    chats = [],
    selectedChatId,
    onSelectChat,
    onNewChat,
    isOpen = true,
    onClose
}) => {
    return (
        <aside
            className={`fixed z-30 inset-y-0 left-0 w-64 bg-[#18181b] border-r border-gray-800 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            {/* Mobile close button */}
            <div className="md:hidden flex justify-end p-2">
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            {/* Top: Logo and New Chat */}
            <div className="flex flex-col gap-4 p-4 border-b border-gray-800">
                <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
                    DeepSeek
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-[#23232a] hover:bg-[#2a2a31] rounded text-white font-medium transition"
                    onClick={onNewChat}
                >
                    <Plus size={18} />
                    New Chat
                </button>
            </div>
            {/* Middle: Chat History */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="text-gray-400 text-sm">Chat History</div>
                <ul className="mt-2 space-y-2">
                    {chats.length === 0 ? (
                        <li className="text-gray-500 text-sm">No chats yet</li>
                    ) : (
                        chats.map((chat) => (
                            <li
                                key={chat._id}
                                className={`px-3 py-2 rounded cursor-pointer text-white flex items-center justify-between ${selectedChatId === chat._id ? 'bg-[#23232a]' : 'hover:bg-[#23232a]'}`}
                                onClick={() => onSelectChat(chat._id)}
                            >
                                <span className="truncate max-w-[140px]">{chat.title || 'Untitled Chat'}</span>
                            </li>
                        ))
                    )}
                </ul>
            </div>
            {/* Bottom: Settings/User */}
            <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
                <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[#23232a] text-gray-300">
                    <Settings size={18} />
                    Settings
                </button>
                <div className="flex items-center gap-2 mt-2 text-gray-400">
                    <User size={18} />
                    <span>User</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar; 