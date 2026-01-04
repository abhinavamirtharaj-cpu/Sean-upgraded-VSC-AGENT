import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

export default function LottieAnimation({ src, autoplay = false, loop = false, style }: { src: any; autoplay?: boolean; loop?: boolean; style?: React.CSSProperties }) {
  return (
    <Player src={src} autoplay={autoplay} keepLastFrame={!loop} loop={loop} style={style} />
  );
}
