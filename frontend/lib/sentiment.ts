export const EMOTION_MAP: Record<string, { colorA: string; colorB: string; emoji: string }> = {
  joy: { colorA: '#C6F6D5', colorB: '#74C69D', emoji: '😊' },
  love: { colorA: '#FFE4E6', colorB: '#FF7BAC', emoji: '❤️' },
  trust: { colorA: '#E6F6FF', colorB: '#7CC6FF', emoji: '🤝' },
  surprise: { colorA: '#FFF7E6', colorB: '#FFD166', emoji: '😲' },
  anger: { colorA: '#FFE6E6', colorB: '#FF6B6B', emoji: '😡' },
  fear: { colorA: '#F0F4FF', colorB: '#9AA7FF', emoji: '🙈' },
  sadness: { colorA: '#EAF2FF', colorB: '#9FB3FF', emoji: '😢' },
  disgust: { colorA: '#F8EDEB', colorB: '#E07A5F', emoji: '🤢' },
  anticipation: { colorA: '#FFF5E6', colorB: '#FFB703', emoji: '🤔' },
  neutral: { colorA: '#F3F4F6', colorB: '#D1D5DB', emoji: '😐' },
  excitement: { colorA: '#FFF7F0', colorB: '#FF8C42', emoji: '🎉' },
  confusion: { colorA: '#F6F7FB', colorB: '#B8B8FF', emoji: '😕' },
};

export function gradientForEmotion(emotion?: string) {
  if (!emotion) return '';
  const m = EMOTION_MAP[emotion] || EMOTION_MAP['neutral'];
  return `linear-gradient(90deg, ${m.colorA}, ${m.colorB})`;
}

export function emojiForEmotion(emotion?: string) {
  if (!emotion) return '';
  return (EMOTION_MAP[emotion] || EMOTION_MAP['neutral']).emoji;
}

// pick a readable text color (white or dark) based on the average luminance of the two gradient colors
export function textColorForEmotion(emotion?: string) {
  if (!emotion) return '#041724';
  const m = EMOTION_MAP[emotion] || EMOTION_MAP['neutral'];
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };
  const [r1, g1, b1] = hexToRgb(m.colorA);
  const [r2, g2, b2] = hexToRgb(m.colorB);
  const r = (r1 + r2) / 2 / 255;
  const g = (g1 + g2) / 2 / 255;
  const b = (b1 + b2) / 2 / 255;
  // relative luminance
  const srgb = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return lum < 0.5 ? '#ffffff' : '#041724';
}
