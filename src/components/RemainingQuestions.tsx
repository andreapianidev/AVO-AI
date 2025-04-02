import React from 'react';
import { getRemainingQuestions } from '../utils/dailyLimit';

interface RemainingQuestionsProps {
  text: string;
}

export function RemainingQuestions({ text }: RemainingQuestionsProps) {
  const remaining = getRemainingQuestions();
  
  return (
    <div className="text-sm text-gray-400 flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg">
      <div className="w-2 h-2 rounded-full bg-green-500"></div>
      {text.replace('{count}', remaining.toString())}
    </div>
  );
}