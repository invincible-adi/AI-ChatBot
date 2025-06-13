import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Paperclip, Send, X } from 'lucide-react';

const ChatInput = ({ onSendMessage, onSendFile, isStreaming, onStopStreaming, onTyping }) => {
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingError, setRecordingError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
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

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Validate file type
                const allowedTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'application/pdf',
                    'text/plain',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];

                if (!allowedTypes.includes(file.type)) {
                    throw new Error('File type not supported. Please upload an image, PDF, or text file.');
                }

                // Validate file size (10MB max)
                const maxSize = 10 * 1024 * 1024; // 10MB in bytes
                if (file.size > maxSize) {
                    throw new Error('File size exceeds 10MB limit');
                }

                setSelectedFile(file);
                setRecordingError('');
            } catch (error) {
                console.error('Error selecting file:', error);
                setRecordingError(error.message || 'Failed to select file. Please try again.');
                setSelectedFile(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!message.trim() && !selectedFile) return;

        try {
            if (selectedFile) {
                setIsUploading(true);
                await onSendFile(selectedFile, message);
                setSelectedFile(null);
            } else {
                onSendMessage(message);
            }
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setRecordingError(error.message || 'Failed to send message. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="rounded-xl dark:bg-zinc-700 p-2 sm:p-4 transition-colors duration-200">
            {recordingError && (
                <div className="text-red-500 text-sm mb-2 animate-fade-in px-2">
                    {recordingError}
                </div>
            )}

            {selectedFile && (
                <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Paperclip size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px] sm:max-w-[300px]">
                            {selectedFile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                    </div>
                    <button
                        onClick={removeSelectedFile}
                        className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                        aria-label="Remove file"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3 max-w-[95%] mx-auto">
                {isStreaming ? (
                    <button
                        type="button"
                        onClick={onStopStreaming}
                        className="bg-red-600 hover:bg-red-700 text-white p-2.5 sm:p-3 rounded-full transition-colors duration-200 flex items-center gap-2"
                        aria-label="Stop generating"
                    >
                        <X size={18} className="sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Stop</span>
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 sm:p-2.5 text-gray-500 hover:text-blue-500 focus:outline-none disabled:opacity-50 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                            disabled={isUploading || isStreaming}
                            aria-label="Attach file"
                            title="Attach file"
                        >
                            <Paperclip size={20} className="sm:w-6 sm:h-6" />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={isStreaming}
                        />

                        <div className="flex-1 relative min-w-0">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={selectedFile ? "Add a message to your file..." : "Type a message..."}
                                className="w-full line-clamp-3 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base max-h-40 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                disabled={isStreaming}
                            />
                            {isUploading && (
                                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 bg-opacity-50 flex items-center justify-center rounded-lg">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => isRecording ? stopRecording() : startRecording()}
                            className={`p-2 sm:p-2.5 focus:outline-none transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isRecording ? 'text-red-500' : 'text-gray-500 hover:text-blue-500'}`}
                            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                            disabled={isStreaming}
                        >
                            {isRecording ? (
                                <MicOff size={20} className="sm:w-6 sm:h-6 animate-pulse" />
                            ) : (
                                <Mic size={20} className="sm:w-6 sm:h-6" />
                            )}
                        </button>

                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:p-3 rounded-full transition-colors duration-200  flex items-center gap-2"
                            disabled={(!message.trim() && !selectedFile) || isUploading || isStreaming}
                            aria-label="Send message"
                        >
                            <Send size={18} className="sm:w-5 sm:h-5" />
                            <span className="text-sm sm:text-base hidden sm:inline">Send</span>
                        </button>
                    </>
                )}
            </form>
        </div>
    );
};

export default ChatInput;