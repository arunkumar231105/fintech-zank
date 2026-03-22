FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y gcc libpq-dev && \
    python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runner

WORKDIR /app
ENV PATH="/opt/venv/bin:$PATH"

RUN apt-get update && \
    apt-get install -y libpq5 && \
    addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
COPY ./app ./app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
