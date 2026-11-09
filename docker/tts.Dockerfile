FROM python:3.12-slim

RUN pip install --no-cache-dir 'piper-tts==1.8.0' 'PyYAML>=6,<7'

RUN apt-get update \
    && apt-get install --yes --no-install-recommends opus-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/generate_audio.py scripts/generate_audio.py

ENTRYPOINT ["python3", "/app/scripts/generate_audio.py"]
