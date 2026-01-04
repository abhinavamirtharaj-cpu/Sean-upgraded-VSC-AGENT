import React from 'react';

export default function TypingIndicator({ username }: { username?: string }) {
  if (!username) return null;
  return (
    <div className="typing flex items-center gap-2">
      <div className="dot bg-gray-300 w-2 h-2 rounded-full animate-pulse" />
      <div className="dot bg-gray-300 w-2 h-2 rounded-full animate-pulse delay-100" />
      <div className="dot bg-gray-300 w-2 h-2 rounded-full animate-pulse delay-200" />
      <div className="text-xs ml-2">{username} is typing…</div>
    </div>
  );
}