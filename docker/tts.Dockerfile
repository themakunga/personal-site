FROM python:3.12-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends lame \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir 'piper-tts==1.8.0' 'PyYAML>=6,<7'

WORKDIR /app
COPY scripts/generate_audio.py scripts/generate_audio.py

ENTRYPOINT ["python3", "/app/scripts/generate_audio.py"]
