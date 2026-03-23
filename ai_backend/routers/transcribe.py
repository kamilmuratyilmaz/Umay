from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import litellm

router = APIRouter()

# --- vLLM swap point ---
# Replace with a local ASR model (e.g. Whisper-large via faster-whisper or
# a vLLM-served multimodal model that handles audio transcription).


class TranscribeRequest(BaseModel):
    base64Audio: str
    mimeType: str


@router.post("/transcribe")
async def transcribe(body: TranscribeRequest):
    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "file",
                        "file": {"file_data": f"data:{body.mimeType};base64,{body.base64Audio}"},
                    },
                    {
                        "type": "text",
                        "text": "Please transcribe this Chinese audio accurately. "
                        "Only output the Chinese characters and Pinyin.",
                    },
                ],
            }],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    return {"text": response.choices[0].message.content}
