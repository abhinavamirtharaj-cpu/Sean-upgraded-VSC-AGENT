import React from 'react';
import Header from './Header';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import React, { useEffect, useState } from 'react';

export default function ChatLayout({ username, messages, input, setInput, onSend }: { username: string; messages: any[]; input: string; setInput: (s: string) => void; onSend: () => void }) {
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    // listen for typing events
    const onTyping = (payload: any) => {
      if (payload.username === username) return; // ignore self
      if (payload.isTyping) setTypingUser(payload.username);
      else setTypingUser(null);
    };

    // @ts-ignore global socket from page
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.on('typing', onTyping);
    }

    return () => {
      if (typeof window !== 'undefined' && (window as any).socket) {
        (window as any).socket.off('typing', onTyping);
      }
    };
  }, [username]);

  return (
    <div className="chat-container">
      <Header username={username} />
      <div className="message-list">
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            id={m.id}
            text={m.ciphertext}
            sent={m.sender === username}
            status={m.status}
            reactions={m.reactions}
            sentiment={m.sentiment}
            onReact={(emoji) => {
              // emit reaction via global socket
              // @ts-ignore
              const s = (window as any).socket;
              if (!s) return;
              s.emit('message-reaction', { messageId: m.id, emoji, username: (window as any).USERNAME || username });
            }}
          />
        ))}
      </div>

      <div className="px-4 py-2">
        <TypingIndicator username={typingUser ?? undefined} />
      </div>

      <ChatInput value={input} onChange={setInput} onSend={onSend} />
    </div>
  );
}
