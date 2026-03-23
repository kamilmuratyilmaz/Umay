import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import { VOCABULARY } from '../src/data/vocabulary.js';

function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

const voiceName = 'zh-CN-XiaoxiaoNeural';

async function downloadWord(word: any, tts: MsEdgeTTS): Promise<boolean> {
  const safeCategory = word.category.replace(/[^a-zA-Z0-9_-]/g, '');
  const hash = simpleHash(word.hanzi);
  const filenameNormal = `tts-Puck-${hash}.mp3`;
  const filenameSlow = `tts-Puck-${hash}-slow.mp3`;
  const dirPath = path.join(process.cwd(), 'data', 'audio', safeCategory);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const filePathNormal = path.join(dirPath, filenameNormal);
  const filePathSlow = path.join(dirPath, filenameSlow);
  
  // Download normal version
  if (!fs.existsSync(filePathNormal)) {
    await new Promise((resolve, reject) => {
      try {
        const { audioStream } = tts.toStream(word.hanzi);
        const writeStream = fs.createWriteStream(filePathNormal);
        audioStream.pipe(writeStream);
        audioStream.on('end', () => resolve(true));
        audioStream.on('error', (err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  // Download slow version
  if (!fs.existsSync(filePathSlow) || fs.statSync(filePathSlow).size === 0) {
    await new Promise((resolve, reject) => {
      try {
        const { audioStream } = tts.toStream(word.hanzi, { rate: "-50%" });
        const writeStream = fs.createWriteStream(filePathSlow);
        audioStream.pipe(writeStream);
        audioStream.on('end', () => resolve(true));
        audioStream.on('error', (err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }
  
  return true;
}

async function downloadAll() {
  console.log(`Starting high-quality download for ${VOCABULARY.length} words using Azure Neural TTS...`);
  
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  
  for (let i = 0; i < VOCABULARY.length; i++) {
    const word = VOCABULARY[i];
    try {
      await downloadWord(word, tts);
      if (i % 50 === 0) {
        process.stdout.write(`\rProgress: ${i}/${VOCABULARY.length} (${Math.round(i/VOCABULARY.length*100)}%)`);
      }
    } catch (e) {
      console.error(`\nFailed to download ${word.hanzi}:`, e);
      // Try to reconnect if it fails
      try {
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      } catch (err) {}
    }
  }
  
  console.log('\nFinished downloading all high-quality audio files!');
  process.exit(0);
}

downloadAll();