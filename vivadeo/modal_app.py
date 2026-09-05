"""Modal deployment for Vivadeo remote inference.

Includes:
- Qwen/Qwen3-VL-Embedding-2B embeddings
- Gemma answer generation

Deploy all:
  modal deploy vivadeo/modal_app.py
"""

import os
import subprocess
import tempfile
from pathlib import Path

import modal

MODEL_ID = "Qwen/Qwen3-VL-Embedding-2B"
GEMMA_MODEL_ID = "google/gemma-4-E4B-it"
DIMENSIONS = 768

app = modal.App("vivadeo-qwen3-vl-embedding-2b")
model_volume = modal.Volume.from_name("qwen3-vl-embedding-2b-cache", create_if_missing=True)
gemma_volume = modal.Volume.from_name("vivadeo-gemma-e4b-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .uv_pip_install(
        "accelerate",
        "huggingface_hub",
        "qwen-vl-utils",
        "torch>=2.0",
        "torchvision>=0.15,<0.22",
        "opencv-python-headless>=4.10,<5",
        "transformers>=5.3",
    )
)


@app.cls(
    image=image,
    gpu="L40S",
    memory=32768,
    timeout=900,
    scaledown_window=300,
    volumes={"/models": model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class QwenEmbedder:
    @modal.enter()
    def load(self):
        import torch
        import torch.nn.functional as F  # noqa: F401
        from transformers.cache_utils import Cache
        from transformers.models.qwen3_vl.modeling_qwen3_vl import (
            Qwen3VLConfig,
            Qwen3VLModel,
            Qwen3VLPreTrainedModel,
        )
        from transformers.models.qwen3_vl.processing_qwen3_vl import Qwen3VLProcessor
        from transformers.processing_utils import Unpack
        from transformers.utils import TransformersKwargs

        os.environ["HF_HOME"] = "/models/huggingface"

        class Qwen3VLForEmbedding(Qwen3VLPreTrainedModel):
            config: Qwen3VLConfig

            def __init__(self, config):
                super().__init__(config)
                self.model = Qwen3VLModel(config)
                self.post_init()

            def get_input_embeddings(self):
                return self.model.get_input_embeddings()

            def set_input_embeddings(self, value):
                self.model.set_input_embeddings(value)

            def forward(
                self,
                input_ids=None,
                attention_mask=None,
                position_ids=None,
                past_key_values=None,
                inputs_embeds=None,
                pixel_values=None,
                pixel_values_videos=None,
                image_grid_thw=None,
                video_grid_thw=None,
                cache_position=None,
                **kwargs,
            ):
                return self.model(
                    input_ids=input_ids,
                    pixel_values=pixel_values,
                    pixel_values_videos=pixel_values_videos,
                    image_grid_thw=image_grid_thw,
                    video_grid_thw=video_grid_thw,
                    position_ids=position_ids,
                    attention_mask=attention_mask,
                    past_key_values=past_key_values,
                    inputs_embeds=inputs_embeds,
                    cache_position=cache_position,
                    **kwargs,
                )

        self._torch = torch
        self._F = torch.nn.functional
        self._processor = Qwen3VLProcessor.from_pretrained(
            MODEL_ID,
            padding_side="right",
            cache_dir="/models/huggingface",
        )
        self._model = Qwen3VLForEmbedding.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
            cache_dir="/models/huggingface",
        ).to("cuda")
        self._model.eval()

    @staticmethod
    def _pooling_last(hidden_state, attention_mask):
        import torch

        flipped = attention_mask.flip(dims=[1])
        last_pos = flipped.argmax(dim=1)
        col = attention_mask.shape[1] - last_pos - 1
        row = torch.arange(hidden_state.shape[0], device=hidden_state.device)
        return hidden_state[row, col]

    @staticmethod
    def _truncate_and_normalize(embedding, target_dims):
        import torch

        truncated = embedding[:target_dims]
        norm = torch.linalg.norm(truncated)
        if norm > 0:
            truncated = truncated / norm
        return truncated.cpu().float().tolist()

    def _embed_conversation(self, conversation):
        import torch
        import torch.nn.functional as F
        from qwen_vl_utils import process_vision_info

        text = self._processor.apply_chat_template(
            conversation,
            tokenize=False,
            add_generation_prompt=True,
        )
        images, video_inputs, video_kwargs = process_vision_info(
            conversation,
            return_video_metadata=True,
            return_video_kwargs=True,
        )

        if video_inputs is not None:
            videos, video_metadata = zip(*video_inputs)
            videos = list(videos)
            video_metadata = list(video_metadata)
        else:
            videos, video_metadata = None, None

        inputs = self._processor(
            text=[text],
            images=images,
            videos=videos,
            video_metadata=video_metadata,
            return_tensors="pt",
            padding=True,
            **video_kwargs,
        )
        inputs = {k: v.to(self._model.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self._model(**inputs)
            embeddings = self._pooling_last(
                outputs.last_hidden_state,
                inputs["attention_mask"],
            )
            embeddings = F.normalize(embeddings, p=2, dim=-1)

        return self._truncate_and_normalize(embeddings[0], DIMENSIONS)

    @modal.method()
    def embed_text(self, text: str) -> list[float]:
        return self._embed_conversation([
            {
                "role": "system",
                "content": [{"type": "text", "text": "Retrieve videos relevant to the query."}],
            },
            {"role": "user", "content": [{"type": "text", "text": text}]},
        ])

    @modal.method()
    def embed_image(self, image_bytes: bytes, filename: str = "query.jpg") -> list[float]:
        suffix = Path(filename).suffix or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(image_bytes)
            path = tmp.name
        try:
            return self._embed_conversation([
                {
                    "role": "system",
                    "content": [{"type": "text", "text": "Retrieve videos relevant to the query."}],
                },
                {
                    "role": "user",
                    "content": [{"type": "image", "image": "file://" + path}],
                },
            ])
        finally:
            os.unlink(path)

    def _embed_video_bytes(self, video_bytes: bytes, filename: str = "chunk.mp4") -> list[float]:
        suffix = Path(filename).suffix or ".mp4"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(video_bytes)
            source_path = tmp.name
        frame_path = source_path + ".jpg"
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i", source_path,
                    "-frames:v", "1",
                    "-vf", "scale=-2:336",
                    "-q:v", "4",
                    frame_path,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            print("vivadeo: embedding video chunk as single extracted frame", flush=True)
            return self._embed_conversation([
                {
                    "role": "system",
                    "content": [{"type": "text", "text": "Represent the video for retrieval."}],
                },
                {
                    "role": "user",
                    "content": [{"type": "image", "image": "file://" + frame_path}],
                },
            ])
        finally:
            for path in (source_path, frame_path):
                try:
                    os.unlink(path)
                except FileNotFoundError:
                    pass

    @modal.method()
    def embed_video(self, video_bytes: bytes, filename: str = "chunk.mp4") -> list[float]:
        return self._embed_video_bytes(video_bytes, filename)

    @modal.method()
    def embed_videos(self, items: list[tuple[bytes, str]]) -> list[list[float]]:
        print(
            f"vivadeo: embedding video batch of {len(items)} chunks as extracted frames",
            flush=True,
        )
        return [
            self._embed_video_bytes(video_bytes, filename)
            for video_bytes, filename in items
        ]

    @modal.method()
    def detect_head_poses(self, items: list[tuple[bytes, str]]) -> list[dict]:
        """Detect frontal/profile faces on the GPU-backed visual worker."""
        import cv2
        import numpy as np

        frontal = cv2.CascadeClassifier(
            str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml")
        )
        profile = cv2.CascadeClassifier(
            str(Path(cv2.data.haarcascades) / "haarcascade_profileface.xml")
        )
        results = []
        for image_bytes, _filename in items:
            image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                results.append({"pose": "unknown", "facing_camera": None, "confidence": 0.0, "reason": "image-unreadable"})
                continue
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            front_faces = frontal.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(32, 32))
            profile_faces = profile.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(32, 32))
            if len(front_faces):
                largest = max(width * height for _x, _y, width, height in front_faces)
                confidence = min(0.99, 0.65 + (largest / max(1, image.shape[0] * image.shape[1])))
                results.append({"pose": "front", "facing_camera": True, "confidence": round(float(confidence), 3), "faces": len(front_faces)})
            elif len(profile_faces):
                results.append({"pose": "profile", "facing_camera": False, "confidence": 0.7, "faces": len(profile_faces)})
            else:
                results.append({"pose": "unknown", "facing_camera": None, "confidence": 0.0, "faces": 0})
        return results


gemma_image = (
    modal.Image.debian_slim(python_version="3.11")
    .uv_pip_install("accelerate", "torch>=2.0", "transformers>=4.53", "huggingface_hub")
)


def _format_context(context: list[dict]) -> str:
    lines = []
    for index, item in enumerate(context, 1):
        lines.append(
            f"[{index}] {item.get('filename')} "
            f"{item.get('start_time'):.1f}-{item.get('end_time'):.1f}s: "
            f"{item.get('text')}"
        )
    return "\n".join(lines)


@app.cls(
    image=gemma_image,
    gpu="L40S",
    memory=32768,
    timeout=900,
    scaledown_window=1800,
    volumes={"/models": gemma_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class GemmaAnswerer:
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        os.environ["HF_HOME"] = "/models/huggingface"
        self._torch = torch
        self._tokenizer = AutoTokenizer.from_pretrained(GEMMA_MODEL_ID, cache_dir="/models/huggingface")
        self._model = AutoModelForCausalLM.from_pretrained(
            GEMMA_MODEL_ID,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            cache_dir="/models/huggingface",
        )
        self._model.eval()

    @modal.method()
    def answer(self, messages: list[dict], context: list[dict]) -> dict:
        return {"answer": "".join(self._answer_tokens(messages, context)).strip()}

    @modal.method(is_generator=True)
    def stream_answer(self, messages: list[dict], context: list[dict]):
        yield from self._answer_tokens(messages, context)

    def _answer_tokens(self, messages: list[dict], context: list[dict]):
        from threading import Event, Thread
        from transformers import TextIteratorStreamer, StoppingCriteria, StoppingCriteriaList

        history = [
            {"role": msg.get("role", "user"), "content": str(msg.get("content", ""))}
            for msg in messages[-6:]
            if msg.get("content")
        ]
        system = (
            "You are a helpful assistant. Respond naturally and do not claim to have searched video evidence."
            if not context
            else (
                "You are Vivadeo, a transcript-grounded video archive assistant. "
                "Answer only from the transcript evidence. If evidence is insufficient, say so. "
                "Cite evidence with bracket numbers like [1]. Be concise and specific."
            )
        )
        prompt_messages = [
            {"role": "system", "content": system},
            *history[:-1],
            {
                "role": "user",
                "content": (
                    f"Transcript evidence:\n{_format_context(context)}\n\nQuestion: {history[-1]['content'] if history else ''}"
                    if context
                    else (history[-1]["content"] if history else "")
                ),
            },
        ]
        prompt = self._tokenizer.apply_chat_template(prompt_messages, tokenize=False, add_generation_prompt=True)
        inputs = self._tokenizer(prompt, return_tensors="pt").to(self._model.device)
        stopped = Event()
        errors = []
        streamer = TextIteratorStreamer(self._tokenizer, skip_prompt=True, skip_special_tokens=True, timeout=120)

        class StopRequested(StoppingCriteria):
            def __call__(self, input_ids, scores, **kwargs):
                return stopped.is_set()

        def generate():
            try:
                with self._torch.no_grad():
                    self._model.generate(
                        **inputs, max_new_tokens=512, do_sample=False,
                        repetition_penalty=1.05, streamer=streamer,
                        stopping_criteria=StoppingCriteriaList([StopRequested()]),
                    )
            except Exception as exc:
                errors.append(exc)
                streamer.end()

        thread = Thread(target=generate, daemon=True)
        thread.start()
        try:
            yield from streamer
            if errors:
                raise errors[0]
        finally:
            stopped.set()
            thread.join(timeout=10)
