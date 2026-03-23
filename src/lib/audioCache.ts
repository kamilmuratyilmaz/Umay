function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function getCachedAudioUrl(text: string, voiceName: string, category: string, isSlow: boolean = false): Promise<string | null> {
  const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');
  const suffix = isSlow ? '-slow' : '';
  const filename = `tts-${voiceName}-${simpleHash(text)}${suffix}.mp3`;
  const url = `/audio/${safeCategory}/${filename}`;
  
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      // If the server returns HTML, it's the Vite SPA fallback, meaning the file doesn't exist
      if (contentType && contentType.includes('text/html')) {
        return null;
      }
      return url;
    }
  } catch (e) {
    console.warn("Cache check failed", e);
  }
  return null;
}

export async function saveAudioToServer(text: string, voiceName: string, base64Data: string, category: string, isSlow: boolean = false): Promise<void> {
  const suffix = isSlow ? '-slow' : '';
  const filename = `tts-${voiceName}-${simpleHash(text)}${suffix}.mp3`;
  try {
    await fetch('/api/save-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, base64Data, category })
    });
  } catch (e) {
    console.error("Failed to save audio to server", e);
  }
}
