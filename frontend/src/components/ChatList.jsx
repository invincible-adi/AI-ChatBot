import React from 'react';
// import { Link } from 'react-router-dom';
import { MessageSquare, Trash2 } from 'lucide-react';

const ChatList = ({ chats, onDeleteChat, isLoading, onSelectChat }) => {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <div className="p-4 text-center py-10">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 animate-fade-in">
          <MessageSquare size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Start a new chat to begin
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700 animate-fade-in">
      {chats.map((chat) => (
        <div
          key={chat._id}
          className="relative group transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => onSelectChat(chat._id)}
        >
          <div className="flex justify-between items-start p-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                {chat.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                {/* Display last message preview if available */}
                {chat.lastMessage?.content || 'New conversation'}
              </p>
            </div>
            <span className="text-xs text-gray-400 ml-2">
              {formatDate(chat.updatedAt)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteChat(chat._id);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label={`Delete chat ${chat.title}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatList;