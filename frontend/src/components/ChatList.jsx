import React from 'react';
// import { Link } from 'react-router-dom';
import { MessageSquare, Trash2 } from 'lucide-react';

const ChatList = ({ chats, onDeleteChat, isLoading, onSelectChat }) => {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <div className="p-4 text-center py-8 sm:py-10">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-6 animate-fade-in">
          <MessageSquare size={32} className="mx-auto mb-3 text-gray-400 sm:w-10 sm:h-10" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">No conversations yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-1">
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
          className="relative group transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700"
          onClick={() => onSelectChat(chat._id)}
        >
          <div className="flex items-center justify-between p-2 sm:p-4 gap-2">
            <div className="flex flex-col flex-grow min-w-0 flex-shrink pr-2 sm:pr-16">
              <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                {chat.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
                {/* Display last message preview if available */}
                {chat.lastMessage?.content || 'New conversation'}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
                {formatDate(chat.updatedAt)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (window.confirm('Are you sure you want to delete this conversation?')) {
                    onDeleteChat(chat._id);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 text-white bg-purple-600 dark:bg-purple-800 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-900 transition-all duration-200 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-purple-500 focus:ring-opacity-75 text-xs sm:text-base font-bold border-2 sm:border-4 border-dashed border-yellow-400"
                aria-label={`Delete chat ${chat.title}`}
                title="Delete conversation"
              >
                <Trash2 size={16} className="w-4 h-4 sm:w-6 sm:h-6" />
                <span className="hidden sm:inline">DELETE CHAT</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;