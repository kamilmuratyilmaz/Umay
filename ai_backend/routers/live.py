import asyncio
import base64
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from config import GEMINI_API_KEY

router = APIRouter()

# --- vLLM swap point ---
# When a local real-time audio model is available (e.g. via a custom WebSocket
# server wrapping vLLM + a streaming TTS), replace the Gemini session below
# with your own session manager that implements the same send/receive contract.

DEFAULT_MODEL = "gemini-2.5-flash-native-audio-dialog"


async def _client_to_gemini(websocket: WebSocket, session) -> None:
    """Forward audio chunks from the browser to Gemini."""
    async for raw in websocket.iter_text():
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            continue

        if msg.get("type") == "audio":
            audio_bytes = base64.b64decode(msg["data"])
            mime = msg.get("mimeType", "audio/pcm;rate=16000")
            await session.send_realtime_input(
                audio=types.Blob(data=audio_bytes, mime_type=mime)
            )


async def _gemini_to_client(session, websocket: WebSocket) -> None:
    """Forward Gemini audio responses back to the browser."""
    async for response in session.receive():
        sc = getattr(response, "server_content", None)
        if not sc:
            continue

        # Audio turn
        if sc.model_turn and sc.model_turn.parts:
            parts = []
            for part in sc.model_turn.parts:
                if part.inline_data and part.inline_data.data:
                    parts.append(
                        {
                            "inlineData": {
                                "data": base64.b64encode(
                                    part.inline_data.data
                                ).decode(),
                                "mimeType": part.inline_data.mime_type,
                            }
                        }
                    )
            if parts:
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "message",
                            "data": {"serverContent": {"modelTurn": {"parts": parts}}},
                        }
                    )
                )

        # Barge-in / interruption
        if getattr(sc, "interrupted", False):
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "message",
                        "data": {"serverContent": {"interrupted": True}},
                    }
                )
            )


@router.websocket("/live")
async def live_endpoint(websocket: WebSocket):
    await websocket.accept()

    # 1. Expect a config message first
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=10)
        cfg = json.loads(raw)
    except (asyncio.TimeoutError, json.JSONDecodeError):
        await websocket.close(code=1008)
        return

    if cfg.get("type") != "config":
        await websocket.close(code=1008)
        return

    model = cfg.get("model", DEFAULT_MODEL)
    voice_name = cfg.get("voiceName", "Puck")
    system_instruction = cfg.get("systemInstruction", "")

    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name
                )
            )
        ),
        system_instruction=types.Content(
            parts=[types.Part(text=system_instruction)]
        ) if system_instruction else None,
    )

    client = genai.Client(api_key=GEMINI_API_KEY)

    try:
        async with client.aio.live.connect(model=model, config=live_config) as session:
            await websocket.send_text(json.dumps({"type": "connected"}))

            c2g = asyncio.create_task(_client_to_gemini(websocket, session))
            g2c = asyncio.create_task(_gemini_to_client(session, websocket))

            done, pending = await asyncio.wait(
                [c2g, g2c], return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            # Re-raise any exception from completed tasks
            for task in done:
                task.result()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "message": str(e)})
            )
        except Exception:
            pass
