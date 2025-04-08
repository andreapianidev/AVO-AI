import React from 'react';
import { Heart } from 'lucide-react';

interface DonateButtonProps {
  text: string;
}

export function DonateButton({ text }: DonateButtonProps) {
  return (
    <a
      href="https://buymeacoffee.com/avoai"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-gray-900 rounded-lg font-medium transition-colors"
    >
      <Heart size={20} className="text-red-600" />
      {text}
    </a>
  );
}