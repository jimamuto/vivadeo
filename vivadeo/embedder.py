"""Embedder factory for Modal-hosted Qwen3-VL-Embedding."""

from .base_embedder import BaseEmbedder

_current_embedder: BaseEmbedder | None = None


def get_embedder(backend: str = "modal", **kwargs) -> BaseEmbedder:
    """Factory to get or create the active embedder."""
    global _current_embedder
    if backend == "modal":
        if _current_embedder is None:
            from .modal_embedder import ModalEmbedder

            _current_embedder = ModalEmbedder(
                app_name=kwargs.get("app_name", "vivadeo-qwen3-vl-embedding-2b"),
                cls_name=kwargs.get("cls_name", "QwenEmbedder"),
                timeout=kwargs.get("timeout", 600),
            )
        return _current_embedder
    if backend == "nvidia":
        if _current_embedder is None:
            from .nvidia_embedder import NvidiaEmbedder

            _current_embedder = NvidiaEmbedder(
                api_key=kwargs["api_key"],
                base_url=kwargs.get("base_url", "https://integrate.api.nvidia.com/v1"),
                model=kwargs.get("model", "nvidia/nemotron-3-embed-1b"),
                timeout=kwargs.get("timeout", 120),
            )
        return _current_embedder
    raise ValueError(f"Unknown backend: {backend}")


def reset_embedder():
    """Reset the cached embedder."""
    global _current_embedder
    _current_embedder = None


def embed_video_chunk(chunk_path: str, verbose: bool = False) -> list[float]:
    return get_embedder().embed_video_chunk(chunk_path, verbose=verbose)


def embed_query(query_text: str, verbose: bool = False) -> list[float]:
    return get_embedder().embed_query(query_text, verbose=verbose)


def embed_image(image_path: str, verbose: bool = False) -> list[float]:
    return get_embedder().embed_image(image_path, verbose=verbose)
