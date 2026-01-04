export type Sentiment = { emotion: string; score: number };

const KEYWORDS: Record<string, string> = {
  happy: 'joy',
  love: 'love',
  trust: 'trust',
  wow: 'surprise',
  angry: 'anger',
  afraid: 'fear',
  sad: 'sadness',
  disgust: 'disgust',
  wait: 'anticipation',
  meh: 'neutral',
  party: 'excitement',
  confused: 'confusion',
};

export async function classifyText(text: string): Promise<Sentiment> {
  text = (text || '').trim();
  // If GEMINI_ENDPOINT is configured, try calling it.
  const endpoint = process.env.GEMINI_ENDPOINT;
  const apiKey = process.env.GEMINI_API_KEY;

  if (endpoint && apiKey) {
    try {
      // We expect the upstream to return JSON like { emotion: string, score: number }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (data && data.emotion) {
          return { emotion: String(data.emotion), score: Number(data.score ?? 0.5) };
        }
        // If the remote returns a string classification, try to parse it
        if (typeof data === 'string') {
          return { emotion: data, score: 0.6 };
        }
      } else {
        console.warn('Gemini endpoint returned non-OK status:', resp.status);
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError') console.warn('Gemini call timed out, falling back to heuristic');
      else console.warn('Gemini call failed, falling back to heuristic', err);
    }
  }

  // Fallback heuristic (fast, deterministic)
  const lower = text.toLowerCase();
  let chosen = 'neutral';
  for (const k of Object.keys(KEYWORDS)) if (lower.includes(k)) chosen = KEYWORDS[k];

  const score = Math.min(0.99, 0.5 + (lower.length % 10) * 0.05);
  return { emotion: chosen, score };
}
