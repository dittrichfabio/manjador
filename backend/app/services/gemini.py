import io
import json
import logging
import re
from pathlib import Path
from PIL import Image
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent / "prompts"

# Max pixel dimension before the image is downscaled (keeps token usage low)
_MAX_PX = 1024


# ── Helpers ────────────────────────────────────────────────────────────────────

def _load_prompt(mode: str) -> str:
    """Load prompt text from prompts/<mode>.txt at import time."""
    path = _PROMPTS_DIR / f"{mode}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


def _get_client() -> genai.Client:
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set. Add it to your .env file.")
    return genai.Client(api_key=settings.gemini_api_key)


def _resize_image(path: str) -> tuple[bytes, str]:
    """
    Resize so neither dimension exceeds _MAX_PX, encode as JPEG.
    Returns (jpeg_bytes, "image/jpeg").
    """
    with Image.open(path) as img:
        img = img.convert("RGB")  # normalise (handles RGBA, palette, HEIC, etc.)
        w, h = img.size
        if max(w, h) > _MAX_PX:
            ratio = _MAX_PX / max(w, h)
            img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
            logger.debug("Resized image from %dx%d to %dx%d", w, h, img.size[0], img.size[1])
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85, optimize=True)
        return buf.getvalue(), "image/jpeg"


def _parse_response(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned unparseable JSON: {raw!r}") from e


# ── Public API ─────────────────────────────────────────────────────────────────

async def extract_nutrition_from_image(image_path: str, mode: str = "label") -> dict:
    """
    mode="label"  (default) – photo of a nutrition facts label; reads exact values.
    mode="food"              – photo of food/dish; estimates typical values.

    Prompts are loaded from app/services/prompts/<mode>.txt so you can edit them
    without touching the Python code.
    """
    client = _get_client()
    prompt = _load_prompt(mode)

    image_data, mime_type = _resize_image(image_path)
    logger.info("Sending %d bytes to Gemini (model=%s, mode=%s)", len(image_data), settings.gemini_model, mode)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            types.Part.from_bytes(data=image_data, mime_type=mime_type),
            prompt,
        ],
    )

    return _parse_response(response.text)
