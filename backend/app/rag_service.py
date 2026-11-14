import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models import Chunk, Conversation, Message
from app.vector_store import openai_client, retrieve_top_k

OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
TOP_K_CHUNKS = int(os.getenv("TOP_K_CHUNKS", "5"))


def format_sse(event: str, data: Any) -> str:
    json_data = json.dumps(data) if not isinstance(data, str) else data
    return f"event: {event}\ndata: {json_data}\n\n"


async def stream_rag_response(
    db: Session,
    conversation: Conversation,
    question: str,
) -> AsyncGenerator[str, None]:
    doc_id = conversation.document_id
    now_utc = datetime.now(timezone.utc)

    user_msg_id = f"user-{int(now_utc.timestamp() * 1000)}"
    user_message = Message(
        id=user_msg_id,
        conversation_id=conversation.id,
        role="user",
        text=question,
        timestamp=now_utc,
        citations=None,
    )
    db.add(user_message)
    db.commit()

    scored_chunks = retrieve_top_k(db, doc_id, question, top_k=TOP_K_CHUNKS)
    valid_chunks_map: Dict[str, Chunk] = {
        chunk.id: chunk for chunk, _ in scored_chunks
    }

    assistant_msg_id = f"assistant-{int(datetime.now(timezone.utc).timestamp() * 1000)}"

    is_unanswerable = (
        len(scored_chunks) == 0
        or all(score < 0.05 for _, score in scored_chunks)
    )

    if is_unanswerable:
        fallback_text = (
            "The uploaded document does not contain enough information to answer this question."
        )
        words = fallback_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield format_sse("token", {"token": token})
            await asyncio.sleep(0.02)

        yield format_sse("citations", [])
        yield format_sse(
            "done",
            {"message_id": assistant_msg_id, "full_text": fallback_text},
        )

        asst_msg = Message(
            id=assistant_msg_id,
            conversation_id=conversation.id,
            role="assistant",
            text=fallback_text,
            timestamp=datetime.now(timezone.utc),
            citations=json.dumps([]),
        )
        db.add(asst_msg)
        db.commit()
        return

    passages = []
    for chunk, _ in scored_chunks:
        passages.append(
            f"[CHUNK:{chunk.id}] (Page {chunk.page_number}):\n{chunk.text}"
        )
    context_text = "\n\n---\n\n".join(passages)

    raw_response_text = ""

    if openai_client:
        system_instruction = (
            "You are DocuMind, an assistant strictly answering questions grounded in the provided document passages. "
            "Rules:\n"
            "1. Answer ONLY using information explicitly stated in the passages.\n"
            "2. Whenever you state a fact or point, cite the source chunk with [CHUNK:<id>] right after it.\n"
            "3. If the passages do not contain enough information to answer, state: "
            "'The uploaded document does not contain enough information to answer this question.'\n"
            "4. Do NOT cite any chunk ID that was not provided."
        )

        user_content = (
            f"Passages:\n{context_text}\n\n"
            f"Question: {question}"
        )

        try:
            stream = openai_client.chat.completions.create(
                model=OPENAI_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content},
                ],
                stream=True,
                temperature=0.2,
            )

            for chunk_resp in stream:
                delta = chunk_resp.choices[0].delta.content or ""
                if delta:
                    raw_response_text += delta
                    yield format_sse("token", {"token": delta})
                    await asyncio.sleep(0.005)

        except Exception as exc:
            print(f"[rag_service] OpenAI chat streaming error: {exc}. Using deterministic local synthesis.")
            raw_response_text = ""

    if not raw_response_text:
        top_chunks = [c for c, _ in scored_chunks[:3]]
        parts = []
        for c in top_chunks:
            snippet = c.text.strip().replace("\n", " ")
            if len(snippet) > 220:
                snippet = snippet[:220].rsplit(" ", 1)[0] + "..."
            parts.append(
                f"Based on Page {c.page_number}, {snippet} [CHUNK:{c.id}]"
            )
        raw_response_text = " ".join(parts)

        words = raw_response_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield format_sse("token", {"token": token})
            await asyncio.sleep(0.025)

    cited_ids = re.findall(r"\[CHUNK:([^\]]+)\]", raw_response_text)
    verified_citations: List[Dict] = []
    seen_chunks = set()

    clean_text = raw_response_text
    for cid in cited_ids:
        if cid in valid_chunks_map:
            matched_chunk = valid_chunks_map[cid]
            clean_text = clean_text.replace(
                f"[CHUNK:{cid}]", f"[Page {matched_chunk.page_number}]"
            )
            if cid not in seen_chunks:
                seen_chunks.add(cid)
                verified_citations.append({
                    "chunk_id": matched_chunk.id,
                    "document_id": matched_chunk.document_id,
                    "page_number": matched_chunk.page_number,
                    "excerpt": matched_chunk.text[:280].strip(),
                })
        else:
            clean_text = clean_text.replace(f"[CHUNK:{cid}]", "")

    clean_text = re.sub(r" +", " ", clean_text).strip()

    yield format_sse("citations", verified_citations)
    yield format_sse(
        "done",
        {"message_id": assistant_msg_id, "full_text": clean_text},
    )

    asst_msg = Message(
        id=assistant_msg_id,
        conversation_id=conversation.id,
        role="assistant",
        text=clean_text,
        timestamp=datetime.now(timezone.utc),
        citations=json.dumps(verified_citations),
    )
    db.add(asst_msg)
    db.commit()
