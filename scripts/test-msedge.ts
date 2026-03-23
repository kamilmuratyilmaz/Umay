import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';

async function test() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("zh-CN-XiaoxiaoNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream("你好，世界！");
  const writeStream = fs.createWriteStream('./test-msedge.mp3');
  audioStream.pipe(writeStream);
  
  audioStream.on('end', () => {
    console.log("SUCCESS");
  });
}
test();