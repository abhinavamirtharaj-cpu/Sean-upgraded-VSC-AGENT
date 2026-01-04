import React from 'react';
import { FiSearch } from 'react-icons/fi';

export default function Header({ username }: { username: string }) {
  return (
    <div className="header flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white/10 w-10 h-10 flex items-center justify-center">{username.charAt(0).toUpperCase()}</div>
        <div>
          <div className="text-sm font-semibold">SEAN Chat</div>
          <div className="text-xs opacity-90">Online</div>
          <div className="text-xs typing-indicator" style={{ marginTop: 2 }}>
            {/* placeholder for typing status */}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-white/90 p-2 rounded-md"><FiSearch /></button>
      </div>
    </div>
  );
}
