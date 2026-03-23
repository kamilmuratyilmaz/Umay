from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

router = APIRouter()

# --- vLLM swap point ---
# Replace with a local reasoning model served via vLLM (e.g. Qwen2.5-72B-Instruct).
# Set openai_api_base to your vLLM endpoint and use the OpenAI-compatible API.

SYSTEM_INSTRUCTION = (
    "You are an expert Chinese language teacher for Turkish speakers. "
    "Explain complex Chinese grammar concepts clearly in Turkish. "
    "Provide examples in Chinese characters, Pinyin, and Turkish translation."
)


class GrammarRequest(BaseModel):
    query: str = Field(..., max_length=1000)


@router.post("/grammar")
async def grammar(body: GrammarRequest):
    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": body.query},
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grammar explanation failed: {e}")

    return {"text": response.choices[0].message.content}
