export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export type Reactions = {
  [emoji: string]: string[]; // emoji -> list of usernames who reacted
};

export type Sentiment = {
  emotion: string; // one of 12 emotions
  score: number; // 0..1
};

export type ChatMessage = {
  id: string;
  sender: string;
  ciphertext: string;
  iv?: string;
  senderPublicKey?: string; // base64 raw
  recipient?: string; // username when 1:1
  createdAt: number;
  status?: MessageStatus;
  reactions?: Reactions;
  sentiment?: Sentiment;
};
