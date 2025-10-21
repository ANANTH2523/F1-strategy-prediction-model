import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { SendIcon } from './icons/SendIcon';
import LoadingSpinner from './LoadingSpinner';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSubmit: (input: string) => void;
    isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSubmit, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSubmit(input);
            setInput('');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-gray-100 border-b-2 border-purple-500 p-4">
                Chat with the Strategist
            </h3>
            <div className="p-4 h-96 overflow-y-auto flex flex-col space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0"></div>}
                        <div className={`max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                           <p className="text-base whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-end gap-2 justify-start">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0"></div>
                         <div className="max-w-lg px-4 py-2 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                            <div className="flex items-center justify-center h-6 w-12">
                                <span className="animate-pulse-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                                <span className="animate-pulse-dot animation-delay-200 w-2 h-2 bg-gray-400 rounded-full mx-1"></span>
                                <span className="animate-pulse-dot animation-delay-400 w-2 h-2 bg-gray-400 rounded-full"></span>
                            </div>
                         </div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about the strategy..."
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 block w-full bg-gray-700 border-gray-600 rounded-lg shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm resize-none disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
            {/* FIX: Removed invalid `jsx` prop from style tag. The project is not configured for styled-jsx. */}
            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 1; }
                }
                .animate-pulse-dot {
                    animation: pulse-dot 1.4s infinite ease-in-out;
                }
                .animation-delay-200 { animation-delay: 0.2s; }
                .animation-delay-400 { animation-delay: 0.4s; }
            `}</style>
        </div>
    );
};

export default ChatInterface;
