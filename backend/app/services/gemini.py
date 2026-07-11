import json
import re
import base64
from pathlib import Path
from typing import Optional
import google.generativeai as genai
from app.config import settings

_PROMPT = (
    "Analyze this food image and extract nutritional information.\n"
    "Respond ONLY with a valid JSON object (no markdown, no extra text) in this exact format:\n\n"
    '{\n'
    '  "name": "Food name",\n'
    '  "brand": "Brand name or null",\n'
    '  "serving_size": 100,\n'
    '  "serving_unit": "g",\n'
    '  "calories_per_100g": 250.0,\n'
    '  "protein_per_100g": 10.0,\n'
    '  "carbs_per_100g": 30.0,\n'
    '  "fat_per_100g": 8.0,\n'
    '  "fiber_per_100g": 2.0,\n'
    '  "sugar_per_100g": 5.0\n'
    '}\n\n'
    "Rules:\n"
    "- All numeric values must be per 100g (convert if the label shows per serving)\n"
    "- Use null for fields you cannot determine\n"
    '- serving_unit should be "g" or "ml"\n'
    "- Be conservative with estimates; prefer underestimating to overestimating\n"
)


def _get_model():
    if not settings.gemini_api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to your .env file."
        )
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


async def extract_nutrition_from_image(image_path: str) -> dict:
    model = _get_model()

    image_data = Path(image_path).read_bytes()
    b64 = base64.b64encode(image_data).decode()
    mime_type = _detect_mime(image_path)

    response = model.generate_content([
        {"mime_type": mime_type, "data": b64},
        _PROMPT,
    ])

    raw = response.text.strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned unparseable response: {raw!r}") from e

    return data


def _detect_mime(path: str) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".heic": "image/heic",
    }.get(ext, "image/jpeg")
