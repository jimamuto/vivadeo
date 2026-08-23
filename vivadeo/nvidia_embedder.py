"""NVIDIA NeMo Retriever text embeddings for Pro workspaces."""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .base_embedder import BaseEmbedder


class NvidiaEmbedderError(RuntimeError):
    pass


class NvidiaEmbedder(BaseEmbedder):
    def __init__(self, *, api_key: str, base_url: str, model: str, timeout: int = 120):
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def embed_texts(self, texts: list[str], *, input_type: str) -> list[list[float]]:
        if not texts:
            return []
        payload = json.dumps({
            "input": texts,
            "model": self.model,
            "input_type": input_type,
            "modality": "text",
            "embedding_type": "float",
            "encoding_format": "float",
        }).encode("utf-8")
        request = Request(
            f"{self.base_url}/embeddings",
            data=payload,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                result = json.load(response)
            embeddings = [item["embedding"] for item in sorted(result["data"], key=lambda item: item["index"])]
        except (HTTPError, URLError, TimeoutError, OSError, KeyError, TypeError, ValueError) as exc:
            raise NvidiaEmbedderError("NVIDIA embedding generation failed.") from exc
        if not embeddings or any(len(vector) != 2048 for vector in embeddings):
            raise NvidiaEmbedderError("NVIDIA embedding endpoint returned an unexpected vector size.")
        return embeddings

    def embed_query(self, query_text: str, verbose: bool = False) -> list[float]:
        return self.embed_texts([query_text], input_type="query")[0]

    def embed_video_chunk(self, chunk_path: str, verbose: bool = False) -> list[float]:
        raise NvidiaEmbedderError("NVIDIA Pro embeddings are transcript-based, not video-frame based.")

    def embed_image(self, image_path: str, verbose: bool = False) -> list[float]:
        raise NvidiaEmbedderError("NVIDIA Pro embeddings use transcript text only.")

    def dimensions(self) -> int:
        return 2048
