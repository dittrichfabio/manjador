FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Install dependencies (cached layer)
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

# Copy app source
COPY app/ ./app/

# Ensure data dir exists
RUN mkdir -p /app/data/uploads

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
