import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactionPicker from './ReactionPicker';
import { gradientForEmotion, emojiForEmotion, textColorForEmotion } from '../lib/sentiment';

export default function MessageBubble({ text, sent, status, reactions, onReact, id, sentiment }: { text: string; sent?: boolean; status?: string; reactions?: any; onReact?: (emoji: string) => void; id?: string; sentiment?: any }) {
  const [showPicker, setShowPicker] = useState(false);
  const [flyEmoji, setFlyEmoji] = useState<string | null>(null);

  const aggregated = reactions ? Object.entries(reactions).map(([emoji, users]) => ({ emoji, count: users.length })) : [];
  const gradient = sentiment ? gradientForEmotion(sentiment.emotion) : undefined;
  const badgeEmoji = sentiment ? emojiForEmotion(sentiment.emotion) : undefined;
  const textColor = sentiment ? textColorForEmotion(sentiment.emotion) : undefined;

  const handlePick = (emoji: string) => {
    setFlyEmoji(emoji);
    onReact && onReact(emoji);
    setTimeout(() => setFlyEmoji(null), 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`mb-2 flex ${sent ? 'justify-end' : 'justify-start'}`}
      onMouseLeave={() => setShowPicker(false)}
    >
      <div style={{ position: 'relative' }}>
        <div
          className={`${sent ? 'bubble-sent' : 'bubble-recv'} ${sentiment ? 'has-sentiment' : ''} shadow-sm`}
          style={{
            borderImage: 'none',
            backgroundImage: gradient || undefined,
            backgroundClip: sentiment ? 'padding-box' : undefined,
            color: textColor || undefined,
          }}
        >
          {/* top-left / top-right small badge inside bubble */}
          {sentiment && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18 }}
              title={`${sentiment.emotion} • ${(Math.round((sentiment.score || 0) * 100))}%`}              role="img"
              aria-label={`${sentiment.emotion} sentiment ${(Math.round((sentiment.score || 0) * 100))}%`}              style={{ position: 'absolute', top: -10, left: sent ? undefined : -10, right: sent ? -10 : undefined, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#ffffff', boxShadow: '0 6px 16px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', fontSize: 16 }}
            >
              {badgeEmoji}
            </motion.div>
          )}

          <div className="text-sm" style={{ wordBreak: 'break-word' }}>{text}</div>

          {sent && (
            <div style={{ fontSize: 10, color: textColor ? (textColor === '#ffffff' ? 'rgba(255,255,255,0.9)' : '#666') : '#666', marginTop: 6, textAlign: 'right' }}>
              {status === 'sending' && '⏳'}
              {status === 'sent' && '✓'}
              {status === 'delivered' && '✓✓'}
              {status === 'read' && <span style={{ color: '#0096ff' }}>✓✓</span>}
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', right: sent ? -40 : undefined, left: sent ? undefined : -40, top: -6 }}>
          <button onClick={() => setShowPicker(v => !v)} className="p-1 rounded-full bg-white/80">😊</button>
        </div>

        <AnimatePresence>
          {showPicker && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ position: 'absolute', top: -48, right: sent ? 0 : undefined, left: sent ? undefined : 0 }}>
              <ReactionPicker onPick={(emoji) => { handlePick(emoji); setShowPicker(false); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* flying emoji animation */}
        <AnimatePresence>
          {flyEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -36, scale: 1.6 }}
              exit={{ opacity: 0, y: -70, scale: 0.8 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ position: 'absolute', top: -20, right: sent ? 0 : undefined, left: sent ? undefined : 0, fontSize: 20 }}
            >
              {flyEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lottie reaction burst */}
        <AnimatePresence>
          {flyEmoji && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'absolute', top: -44, right: sent ? 0 : undefined, left: sent ? undefined : 0, width: 56, height: 56, pointerEvents: 'none' }}>
              {/* @ts-ignore dynamic import of public asset */}
              <img src="/lottie/reaction.json" alt="" style={{ width: '100%', height: '100%' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {aggregated.length > 0 && (
          <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex gap-2 items-center text-sm">
            {aggregated.map(r => (
              <motion.div key={r.emoji} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} className="px-2 py-1 rounded-full bg-white/90 shadow-sm" style={{ display: 'flex', gap: 6, alignItems: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 16 }}>{r.emoji}</div>
                <div style={{ fontSize: 12, color: '#333' }}>{r.count}</div>
              </motion.div>
            ))}

            {/* show sentiment summary */}
            {sentiment && (
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} className="px-2 py-1 rounded-full bg-white/90 shadow-sm" style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 16 }}>{badgeEmoji}</div>
                <div style={{ fontSize: 12, color: '#333' }}>{sentiment.emotion} {(sentiment.score !== undefined) && `• ${Math.round((sentiment.score||0)*100)}%`}</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
