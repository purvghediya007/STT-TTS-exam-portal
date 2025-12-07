FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install CPU PyTorch correctly
RUN pip install --no-cache-dir torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu

# Remove problematic packages before installing the rest
RUN grep -v "sentence-transformers" requirements.txt | \
    grep -v "ffmpeg-python" > req_tmp.txt

RUN pip install --no-cache-dir -r req_tmp.txt

# Install sentence-transformers without dependencies
RUN pip install --no-cache-dir sentence-transformers==3.0.1 --no-deps

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
