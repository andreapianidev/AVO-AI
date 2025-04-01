import React from 'react';
import { Bot, User } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'assistant';

  return (
    <div className={`flex gap-4 ${isBot ? 'bg-gray-800/50' : ''} p-6 rounded-xl backdrop-blur-sm transition-all hover:shadow-sm`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        isBot 
          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-900/20' 
          : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/20'
      }`}>
        {isBot ? <Bot size={22} /> : <User size={22} />}
      </div>
      <div className="flex-1 space-y-2">
        <h3 className={`text-sm font-medium ${isBot ? 'text-green-400' : 'text-emerald-400'}`}>
          {isBot ? 'AVO AI' : 'You'}
        </h3>
        <p className="text-base text-gray-300 leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}