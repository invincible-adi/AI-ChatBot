import React, { forwardRef } from 'react';
import { FileText } from 'lucide-react';

const ChatMessage = forwardRef(({ message, isCurrentUser }, ref) => {
  const { content, isAI, timestamp, sender, attachments = [] } = message;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Parse markdown-style links and code blocks
  const renderContent = () => {
    let parts = content.split(/(```[^`]+```|\[.*?\]\(.*?\))/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Code block
        const code = part.slice(3, -3);
        return (
          <pre key={index} className="bg-gray-800 text-gray-200 p-3 rounded-md my-2 overflow-x-auto">
            <code>{code}</code>
          </pre>
        );
      } else if (part.match(/\[.*?\]\(.*?\)/)) {
        // Link
        const [_, text, url] = part.match(/\[(.*?)\]\((.*?)\)/);
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            {text}
          </a>
        );
      }
      return part;
    });
  };

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 text-sm"
          >
            <FileText size={16} className="text-blue-500" />
            <a
              href={attachment.path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 truncate"
            >
              {attachment.filename}
            </a>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={`flex flex-col ${isAI
        ? 'items-start' // AI message on left
        : 'items-end'   // User message on right
        } mb-4 animate-fade-in`}
    >
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-2 shadow-sm
          ${isAI
            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-br-none'
            : 'bg-blue-600 text-white rounded-bl-none'}
        `}
      >
        {/* Show sender name: current user for user messages, "AI" for AI */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {isAI
            ? "AI"
            : (sender && sender.username) ? sender.username : "You"}
        </div>
        <div className="prose dark:prose-invert max-w-none">
          {renderContent()}
        </div>
        {renderAttachments()}
        <div className="text-xs opacity-70 text-right mt-1">
          {formattedTime}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;