import os
import re
from typing import Dict, List, Tuple
from pypdf import PdfReader


def validate_pdf_file(
    file_bytes: bytes,
    filename: str,
    max_size_mb: int = 25,
) -> None:
    if not filename.lower().endswith(".pdf"):
        raise ValueError("Invalid file format. Only .pdf files are supported.")

    max_bytes = max_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise ValueError(
            f"File size exceeds the maximum limit of {max_size_mb} MB."
        )

    if not file_bytes.startswith(b"%PDF-"):
        raise ValueError("Corrupted or invalid PDF header. Magic bytes %PDF- not found.")


def split_text_into_chunks(
    text: str,
    page_number: int,
    document_id: str,
    start_order: int,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> Tuple[List[Dict], int]:
    clean_text = re.sub(r"[ \t]+", " ", text).strip()
    if not clean_text:
        return [], start_order

    chunks: List[Dict] = []
    order = start_order
    start = 0
    total_len = len(clean_text)

    while start < total_len:
        end = start + chunk_size

        if end >= total_len:
            chunk_slice = clean_text[start:total_len].strip()
            if chunk_slice:
                chunks.append({
                    "id": f"{document_id}-p{page_number}-c{order}",
                    "document_id": document_id,
                    "text": chunk_slice,
                    "page_number": page_number,
                    "chunk_order": order,
                })
                order += 1
            break

        search_window = clean_text[end - chunk_overlap : end + 50]
        sentence_break = -1
        for match in re.finditer(r"([.!?])\s+", search_window):
            sentence_break = end - chunk_overlap + match.end()

        if sentence_break > start and sentence_break <= end + 50:
            actual_end = sentence_break
        else:
            space_pos = clean_text.rfind(" ", start, end)
            if space_pos > start + (chunk_size // 2):
                actual_end = space_pos
            else:
                actual_end = end

        chunk_slice = clean_text[start:actual_end].strip()
        if chunk_slice:
            chunks.append({
                "id": f"{document_id}-p{page_number}-c{order}",
                "document_id": document_id,
                "text": chunk_slice,
                "page_number": page_number,
                "chunk_order": order,
            })
            order += 1

        start = max(start + 1, actual_end - chunk_overlap)

    return chunks, order


def extract_and_chunk_pdf(
    file_path: str,
    document_id: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> Tuple[int, List[Dict]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    try:
        reader = PdfReader(file_path)
    except Exception as exc:
        raise ValueError(f"Failed to read PDF document: {exc}") from exc

    if reader.is_encrypted:
        raise ValueError(
            "Encrypted or password-protected PDFs are not supported."
        )

    page_count = len(reader.pages)
    if page_count == 0:
        raise ValueError("The uploaded PDF has 0 pages.")

    all_chunks: List[Dict] = []
    total_characters = 0
    current_order = 0

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""

        page_text = page_text.strip()
        total_characters += len(page_text)

        if page_text:
            chunks, current_order = split_text_into_chunks(
                text=page_text,
                page_number=page_num,
                document_id=document_id,
                start_order=current_order,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
            all_chunks.extend(chunks)

    if total_characters < 15 or len(all_chunks) == 0:
        raise ValueError(
            "No extractable text was found in this PDF. Scanned image PDFs "
            "without OCR are not supported in this version."
        )

    return page_count, all_chunks
