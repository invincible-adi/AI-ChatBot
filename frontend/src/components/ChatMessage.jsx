import React, { useState } from 'react';
import { Bot, User, Clipboard, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../contexts/AuthContext.jsx';

const ChatMessage = ({ msg, currentUser }) => {
    const [isMessageCopied, setIsMessageCopied] = useState(false);
    const isUser = msg.isAI ? false : msg.sender?._id === currentUser?._id;

    const handleMessageCopy = () => {
        navigator.clipboard.writeText(msg.content);
        setIsMessageCopied(true);
        setTimeout(() => setIsMessageCopied(false), 2000);
    };

    const CodeBlock = {
        code({ node, inline, className, children, ...props }) {
            const [isCopied, setIsCopied] = useState(false);
            const match = /language-(\w+)/.exec(className || '');

            const handleCopy = () => {
                navigator.clipboard.writeText(String(children));
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            };

            return !inline && match ? (
                <div className="relative group/code">
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 opacity-0 group-hover/code:opacity-100 transition-opacity"
                        aria-label="Copy code"
                    >
                        {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                    </button>
                    <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" {...props}>
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code className={`${className} code-block`} {...props}>
                    {children}
                </code>
            );
        },
    };

    return (
        <div
            key={msg._id}
            className={`group flex items-start gap-2 sm:gap-3 leading-8 fs-1 w-full max-w-full sm:max-w-[90%] md:max-w-[90%] ${msg.isAI ? 'self-start' : 'self-end flex-row-reverse'}`}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
            {isUser && (
                <button
                    onClick={handleMessageCopy}
                    className="p-1.5 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                    aria-label="Copy message"
                >
                    {isMessageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                </button>
            )}
            <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 ${msg.isAI ? 'bg-blue-500' : 'bg-green-500'} flex items-center justify-center text-white font-bold text-xs sm:text-base`}
            >
                {msg.isAI ? 'AI' : currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${msg.isAI
                    ? 'bg-transparent text-gray-200 w-full rounded-bl-none'
                    : 'bg-[#414158] text-white w-full rounded-br-none'
                    } w-full break-words`}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}
            >
                <ReactMarkdown components={CodeBlock}>{msg.content}</ReactMarkdown>
            </div>
            {!isUser && (
                <button
                    onClick={handleMessageCopy}
                    className="p-1.5 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    aria-label="Copy message"
                >
                    {isMessageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
};

export default ChatMessage;