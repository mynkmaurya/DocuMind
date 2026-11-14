import hashlib
import json
import math
import os
import re
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models import Chunk

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_EMBEDDING_MODEL = os.getenv(
    "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
)

openai_client = None
if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your-"):
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        openai_client = None


def generate_hashed_ngram_embedding(text: str, dim: int = 256) -> List[float]:
    clean = re.sub(r"\s+", " ", text.lower().strip())
    vector = [0.0] * dim
    if not clean:
        vector[0] = 1.0
        return vector

    for i in range(max(1, len(clean) - 2)):
        tri = clean[i : i + 3]
        h_bytes = hashlib.md5(tri.encode("utf-8")).digest()
        idx = int.from_bytes(h_bytes[:4], "little") % dim
        sign = 1.0 if (h_bytes[4] % 2 == 0) else -1.0
        vector[idx] += sign

    words = re.findall(r"\b[a-z0-9_]{3,}\b", clean)
    for word in words:
        h_bytes = hashlib.sha256(word.encode("utf-8")).digest()
        idx = int.from_bytes(h_bytes[:4], "little") % dim
        sign = 1.0 if (h_bytes[4] % 2 == 0) else -1.0
        vector[idx] += sign * 1.5

    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
    else:
        vector[0] = 1.0

    return vector


def get_embedding(text: str) -> List[float]:
    global openai_client
    if openai_client:
        try:
            resp = openai_client.embeddings.create(
                input=text,
                model=OPENAI_EMBEDDING_MODEL,
            )
            return resp.data[0].embedding
        except Exception as exc:
            print(f"[vector_store] OpenAI embedding failed ({exc}); falling back to local hashing.")

    return generate_hashed_ngram_embedding(text)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b:
        return 0.0

    min_len = min(len(vec_a), len(vec_b))
    dot = sum(vec_a[i] * vec_b[i] for i in range(min_len))
    norm_a = math.sqrt(sum(x * x for x in vec_a[:min_len]))
    norm_b = math.sqrt(sum(y * y for y in vec_b[:min_len]))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot / (norm_a * norm_b)))


def retrieve_top_k(
    db: Session,
    document_id: str,
    query: str,
    top_k: int = 5,
) -> List[Tuple[Chunk, float]]:
    chunks = db.query(Chunk).filter(Chunk.document_id == document_id).all()
    if not chunks:
        return []

    query_vec = get_embedding(query)
    q_words = set(re.findall(r"\b[a-z0-9_]{3,}\b", query.lower()))

    scored_chunks: List[Tuple[Chunk, float]] = []
    for chunk in chunks:
        chunk_vec = chunk.get_embedding_list()
        sim = cosine_similarity(query_vec, chunk_vec) if chunk_vec else 0.0

        chunk_words = set(re.findall(r"\b[a-z0-9_]{3,}\b", chunk.text.lower()))
        overlap = len(q_words & chunk_words)
        lexical_boost = min(0.3, overlap * 0.08)

        total_score = sim + lexical_boost
        scored_chunks.append((chunk, total_score))

    scored_chunks.sort(key=lambda item: item[1], reverse=True)
    return scored_chunks[:top_k]
