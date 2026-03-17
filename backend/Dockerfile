FROM python:3.11-slim

WORKDIR /app

# Install dependencies needed for psycopg2
RUN apt-get update && \
    apt-get install -y gcc libpq-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy all the FastAPI code
COPY ./app ./app

# Add a healthy check port (FastAPI default)
EXPOSE 8000

# The command to run FastAPI using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
