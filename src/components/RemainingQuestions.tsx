import React from 'react';
import { getRemainingQuestions, hasReachedDailyLimit } from '../utils/dailyLimit';
import { DonateButton } from './DonateButton';
import { LanguageStrings } from '../types';

interface RemainingQuestionsProps {
  text: string;
  limitReachedText: string;
  strings: LanguageStrings;
}

export function RemainingQuestions({ text, limitReachedText, strings }: RemainingQuestionsProps) {
  const remaining = getRemainingQuestions();
  const isLimitReached = hasReachedDailyLimit();
  
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-gray-400 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-500' : 'bg-green-500'}`} />
        {text.replace('{count}', remaining.toString())}
      </div>
      
      {isLimitReached && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-gray-400">{limitReachedText}</p>
          <DonateButton text={strings.supportProject} />
        </div>
      )}
    </div>
  );
}