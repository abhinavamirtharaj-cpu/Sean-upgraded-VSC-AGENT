import React from 'react';

const EMOJIS = ['😀','😂','😊','❤️','😮','😢','😡','👍','👎','🎉'];

export default function ReactionPicker({ onPick }: { onPick: (emoji: string) => void }){
  return (
    <div className="bg-white shadow rounded px-2 py-1 flex gap-2">
      {EMOJIS.map(e => (
        <button key={e} onClick={() => onPick(e)} className="text-lg">{e}</button>
      ))}
    </div>
  );
}
