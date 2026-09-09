"""NVIDIA NeMo Retriever text and multimodal embeddings for Pro workspaces."""

import base64
import json
import mimetypes
import tempfile
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .base_embedder import BaseEmbedder
from .frame_extractor import extract_frame


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
        """Embed a representative frame from a video chunk with the VL model."""
        with tempfile.TemporaryDirectory(prefix="vivadeo_nvidia_frame_") as tmp_dir:
            frame_path = extract_frame(chunk_path, 0.0, f"{tmp_dir}/frame.jpg")
            return self.embed_image(frame_path, verbose=verbose)

    def embed_image(self, image_path: str, verbose: bool = False) -> list[float]:
        """Embed one image using NVIDIA's multimodal passage endpoint."""
        try:
            with open(image_path, "rb") as image_file:
                image_bytes = image_file.read()
        except OSError as exc:
            raise NvidiaEmbedderError("Unable to read the video frame for embedding.") from exc
        media_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"
        image_url = f"data:{media_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"
        payload = json.dumps({
            "input": [image_url],
            "model": self.model,
            "input_type": "passage",
            "modality": "image",
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
            raise NvidiaEmbedderError("NVIDIA visual embedding generation failed.") from exc
        if not embeddings or len(embeddings[0]) != 2048:
            raise NvidiaEmbedderError("NVIDIA visual embedding endpoint returned an unexpected vector size.")
        return embeddings[0]

    def dimensions(self) -> int:
        return 2048
