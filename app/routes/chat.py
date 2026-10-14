import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Soli"])

# Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = (
    OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )
    if GROQ_API_KEY
    else None
)

MODEL_NAME = "openai/gpt-oss-120b"


SYSTEM_PROMPT = """
You are Soli, a friendly AI study companion for S.U.N.D.A.Y.

Focus on NCERT Class 6 Mathematics, especially Ganita Prakash,
Chapter 7: Fractions.

Response rules:
- Keep each answer around 60–100 words, with a hard target
  of 120 words maximum.
- Start with the direct answer.
- Explain one idea at a time using simple language.
- Include at most one short example.
- Use short paragraphs or up to 3 bullet points.
- Avoid large headings, long introductions, and tables
  unless the student explicitly requests them.
- End with one brief question only when useful.
- If the student asks for more detail, expand gradually.
- Stay focused on learning and educational topics.
- Never invent textbook content, student scores, or progress.
"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
def chat_with_soli(request: ChatRequest):
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is missing from the backend .env file.",
        )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    # Include recent conversation history.
    for item in request.history[-10:]:
        messages.append({
            "role": item.role,
            "content": item.content,
        })

    # Add the current message only if it isn't
    # already the last message in the history.
    if (
        not request.history
        or request.history[-1].role != "user"
        or request.history[-1].content != request.message
    ):
        messages.append({
            "role": "user",
            "content": request.message,
        })

    try:
        response = client.chat.completions.create(
         model=MODEL_NAME,
         messages=messages, # type: ignore
         max_tokens=220,
         temperature=0.4,
        )


        reply = response.choices[0].message.content

        if not reply or not reply.strip():
            raise HTTPException(
                status_code=502,
                detail="Soli received an empty response. Please try again.",
            )

        return ChatResponse(reply=reply.strip())

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Soli Groq request failed")

        raise HTTPException(
            status_code=502,
            detail=(
                f"Soli could not generate a response "
                f"({type(exc).__name__}). "
                "Check the backend terminal for details."
            ),
        ) from exc