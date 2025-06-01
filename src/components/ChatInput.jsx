import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Paperclip, Send } from 'lucide-react';

const ChatInput = ({ onSendMessage, chatId, onTyping }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // For speech recognition
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
          
        setMessage(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setRecordingError('Could not recognize speech. Please try again.');
        stopRecording();
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle typing indicator
  useEffect(() => {
    if (onTyping) {
      if (message) {
        onTyping(true);
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        onTyping(false);
      }
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, onTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      setRecordingError('Speech recognition is not supported in this browser.');
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      setRecordingError('');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setRecordingError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    onSendMessage(message);
    setMessage('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
      {recordingError && (
        <div className="text-red-500 text-sm mb-2 animate-fade-in">
          {recordingError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-blue-500 focus:outline-none disabled:opacity-50 transition-colors duration-200"
          disabled={isUploading}
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setMessage(prev => prev + `\n[Uploading: ${file.name}]`);
            }
          }}
          accept="image/*,application/pdf,text/plain"
        />
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        
        <button
          type="button"
          onClick={() => isRecording ? stopRecording() : startRecording()}
          className={`p-2 focus:outline-none transition-colors duration-200 ${
            isRecording ? 'text-red-500' : 'text-gray-500 hover:text-blue-500'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <MicOff size={20} className="animate-pulse" />
          ) : (
            <Mic size={20} />
          )}
        </button>
        
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:bg-blue-400"
          disabled={!message.trim() || isUploading}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;