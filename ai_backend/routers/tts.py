import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

logger = logging.getLogger(__name__)

router = APIRouter()

# --- vLLM swap point ---
# Replace the Gemini TTS call below with your TTS service (e.g. Kokoro, Coqui, F5-TTS).
# The endpoint contract stays the same: return {"audio": <base64 pcm/wav>}


class TTSRequest(BaseModel):
    text: str = Field(..., max_length=500)
    voiceName: str = "Puck"
    isSlow: bool = False


@router.post("/tts")
async def tts(body: TTSRequest):
    prompt = (
        f"Please speak the following Chinese text very slowly, clearly and naturally, "
        f"emphasizing the tones: {body.text}"
        if body.isSlow
        else f"Please speak the following Chinese text clearly and naturally: {body.text}"
    )

    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash-preview-tts",
            messages=[{"role": "user", "content": prompt}],
            modalities=["audio"],
            audio={"voice": body.voiceName, "format": "pcm16"},
        )
    except litellm.RateLimitError as e:
        logger.warning("TTS rate limit exceeded: %s", e)
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded: {e}")
    except Exception as e:
        logger.error("TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")

    if not response.choices:
        raise HTTPException(status_code=500, detail="No audio generated (empty response)")

    audio_resp = getattr(response.choices[0].message, "audio", None)
    if audio_resp and getattr(audio_resp, "data", None):
        return {"audio": audio_resp.data}

    raise HTTPException(status_code=500, detail="No audio generated")
