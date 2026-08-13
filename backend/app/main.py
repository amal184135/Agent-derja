from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)




from app.routers import auth,chat, tts, stt, voice, conversation
from app.services.tts_service import engine as tts_engine
from app.services.stt_service import engine as stt_engine
from app.services.diacritizer_service import diacritizer




@asynccontextmanager
async def lifespan(app: FastAPI):
    tts_engine.load()
    diacritizer.load()
    print(f"TTS device: {tts_engine.device}")

    stt_engine.load()
    print(f"STT device: {stt_engine.device}")

    yield

app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id", "X-User-Text", "X-Response-Text"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(tts.router)
app.include_router(stt.router)
app.include_router(voice.router)
app.include_router(conversation.router)

@app.get("/")
def root():
    return {"status": "ok"} 
