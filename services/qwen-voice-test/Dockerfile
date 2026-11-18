FROM pytorch/pytorch:2.5.1-cuda12.1-cudnn9-runtime
RUN apt-get update && apt-get install -y --no-install-recommends sox libsox-fmt-all && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu121 \
 && pip install --no-cache-dir qwen-tts==0.1.1 google-cloud-storage==2.19.0
WORKDIR /app
COPY test.py lines.json ./
CMD ["python", "test.py"]
