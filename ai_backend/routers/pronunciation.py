import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

router = APIRouter()

# --- vLLM swap point ---
# Replace with a local multimodal model (e.g. Qwen-Audio via vLLM) that accepts
# audio + text and returns JSON pronunciation feedback.


class PronunciationRequest(BaseModel):
    base64Audio: str
    mimeType: str
    targetWord: str = Field(..., max_length=50)
    pinyin: str


@router.post("/evaluate-pronunciation")
async def evaluate_pronunciation(body: PronunciationRequest):
    prompt = (
        f'The user is trying to say the Chinese word "{body.targetWord}" ({body.pinyin}). '
        "Listen to the audio and evaluate their pronunciation. "
        'Return a JSON object with: {"score": number (0-100), '
        '"feedback": string (in Turkish, explain what was good and what needs improvement, '
        'especially regarding tones), "transcription": string (what you heard in Hanzi and Pinyin)}'
    )

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
                    {"type": "text", "text": prompt},
                ],
            }],
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

    try:
        return json.loads(response.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON from model")
