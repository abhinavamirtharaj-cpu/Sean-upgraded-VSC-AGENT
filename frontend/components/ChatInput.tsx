import React from 'react';
import { FiPaperclip, FiSmile } from 'react-icons/fi';

export default function ChatInput({ value, onChange, onSend }: { value: string; onChange: (v: string) => void; onSend: () => void }) {
  // emit typing when input changes
  const handleChange = (v: string) => {
    onChange(v);
    // @ts-ignore global socket
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.emit('typing', { room: 'general', isTyping: !!v, username: (window as any).USERNAME || 'unknown' });
    }
  };

  return (
    <div className="input-area">
      <button className="p-2 text-gray-600"><FiPaperclip /></button>
      <div style={{ flex: 1 }}>
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (onSend(), playSendAnim())}
          className="w-full rounded-full border border-gray-200 px-4 py-2 focus:outline-none"
          placeholder="Message"
        />
      </div>
      <button className="p-2 text-gray-600 mr-2"><FiSmile /></button>
      <div style={{ position: 'relative' }}>
        <div className="fab" role="button" onClick={() => { onSend(); playSendAnim(); }}>➤</div>
        {/* simple Lottie play on send (uses public asset) */}
        <div id="send-lottie" style={{ position: 'absolute', top: -56, left: '50%', transform: 'translateX(-50%)', width: 64, height: 64, pointerEvents: 'none', display: 'none' }}>
          <img src="/lottie/send.json" alt="" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );

  function playSendAnim() {
    const el = document.getElementById('send-lottie');
    if (!el) return;
    el.style.display = 'block';
    setTimeout(() => { el.style.opacity = '1'; }, 10);
    setTimeout(() => { el.style.display = 'none'; }, 900);
  }
}
