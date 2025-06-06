import React from 'react';
import { Bot, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const ChatMessage = ({ message }) => {
  const { currentUser } = useAuth();
  // Determine if the message is from the current user
  const isUser = message.isAI ? false : message.sender?._id === currentUser?._id;

  // Defensive: fallback for missing timestamp
  let timeString = '';
  try {
    timeString = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '';
  } catch {
    timeString = '';
  }

  // Defensive: fallback for missing attachments
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[80%]`}>
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-2 rounded-lg ${isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-gray-700 text-gray-100 rounded-tl-none'
            }`}>
            {message.content}
          </div>
          {attachments.length > 0 && (
            <div className={`mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
              {attachments.map((attachment, index) => {
                // Defensive: fallback for missing filename
                const filename = attachment.filename || 'file';
                // Show image preview if image, otherwise show download link
                const isImage = attachment.mimetype && attachment.mimetype.startsWith('image/');
                const fileUrl = attachment.filename ? `/uploads/${attachment.filename}` : undefined;
                // Use a unique key: prefer attachment._id, else filename+index
                const key = attachment._id || (attachment.filename ? attachment.filename + '-' + index : index);
                return (
                  <div key={key} className="text-sm text-gray-400">
                    {fileUrl ? (
                      isImage ? (
                        <img src={fileUrl} alt={filename} className="max-h-40 rounded mb-1 border border-gray-600" />
                      ) : (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">{filename}</a>
                      )
                    ) : (
                      filename
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {timeString}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;