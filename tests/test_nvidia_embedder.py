import json

from vivadeo import nvidia_embedder
from vivadeo.nvidia_embedder import NvidiaEmbedder


class _Response:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return b""


def test_embed_image_sends_nvidia_multimodal_input(tmp_path, monkeypatch):
    image_path = tmp_path / "frame.jpg"
    image_path.write_bytes(b"jpeg-bytes")
    captured = {}

    def fake_urlopen(request, timeout):
        captured["payload"] = json.loads(request.data)
        return _ResponseWithJson({"data": [{"index": 0, "embedding": [0.0] * 2048}]})

    monkeypatch.setattr(nvidia_embedder, "urlopen", fake_urlopen)
    embedder = NvidiaEmbedder(api_key="key", base_url="https://example.test/v1", model="vl-model")

    vector = embedder.embed_image(str(image_path))

    assert len(vector) == 2048
    assert captured["payload"]["input"][0].startswith("data:image/jpeg;base64,")
    assert captured["payload"]["input_type"] == "passage"
    assert captured["payload"]["modality"] == "image"


def test_embed_video_chunk_extracts_a_frame(tmp_path, monkeypatch):
    video_path = tmp_path / "chunk.mp4"
    video_path.write_bytes(b"video")
    frame_calls = []

    def fake_extract_frame(source, timestamp, output):
        frame_calls.append((source, timestamp, output))
        with open(output, "wb") as frame:
            frame.write(b"jpeg")
        return output

    monkeypatch.setattr(nvidia_embedder, "extract_frame", fake_extract_frame)
    monkeypatch.setattr(nvidia_embedder.NvidiaEmbedder, "embed_image", lambda self, path, verbose=False: [0.0] * 2048)
    vector = NvidiaEmbedder(api_key="key", base_url="https://example.test/v1", model="vl-model").embed_video_chunk(str(video_path))

    assert len(vector) == 2048
    assert frame_calls and frame_calls[0][0] == str(video_path) and frame_calls[0][1] == 0.0


class _ResponseWithJson(_Response):
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode()
