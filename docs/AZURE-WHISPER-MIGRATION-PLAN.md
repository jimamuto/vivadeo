# Azure Whisper Migration

Status: implemented and validated.

## Architecture

Ingest transcription uses Azure OpenAI Whisper. Modal continues to host Qwen embeddings and Gemma answer generation. The ingest API, transcript JSON, database rows, retries, cancellation, and timestamp citation contracts are unchanged.

Audio is converted with ffmpeg to mono 16 kHz, 48 kbps MP3 in 30-minute parts. This keeps each request below Azure OpenAI Whisper's 25 MB limit. Azure segment timestamps are offset and normalized to:

```json
{"start_time": 0.0, "end_time": 1.0, "text": "..."}
```

## Configuration

The worker requires:

```dotenv
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper
AZURE_OPENAI_WHISPER_TIMEOUT=900
```

Keep credentials in deployment secrets or the ignored local `.env`; never expose them to the browser.

## Implemented Changes

- `vivadeo/azure_whisper.py` owns audio preparation, Azure requests, and response normalization.
- `vivadeo/worker.py` routes the shared transcription stage through Azure.
- Modal Whisper code, configuration, image, dependency, and cache volume were removed.
- Compose passes Azure transcription settings to the worker.
- Focused tests cover configuration, request shape, normalization, invalid payloads, and split-audio timestamp offsets.

## Validation

- Backend suite: `137 passed`.
- Live Azure request from the host: passed.
- Live Azure request from the development worker container: passed.
- Reduced Modal app deployment: passed; only Qwen and Gemma functions were published.
