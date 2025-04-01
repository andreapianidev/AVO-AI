import React from 'react';
import { Coffee } from 'lucide-react';

interface DonateButtonProps {
  text: string;
}

export function DonateButton({ text }: DonateButtonProps) {
  return (
    <a
      href="https://buymeacoffee.com/avoai"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFDD00] text-gray-900 rounded-lg font-medium hover:bg-[#FFDD00]/90 transition-colors"
    >
      <Coffee size={20} />
      {text}
    </a>
  );
}