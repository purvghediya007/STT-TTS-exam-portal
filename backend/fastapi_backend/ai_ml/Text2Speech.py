from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Union

from gtts import gTTS

from ai_ml.AIExceptions import *

@dataclass
class TTSConfig:
    language: str = "en"
    slow: bool = False
    output_file: Optional[Path] = None
    return_bytes: bool = False


class TextSource(ABC):
    @abstractmethod
    def get_text(self) -> str:
        raise NotImplementedError


class FileTextSource(TextSource):
    def __init__(self, path: Path) -> None:
        self.path = path.resolve()

    def get_text(self) -> str:
        if not self.path.exists():
            raise TextSourceException(f"File not found: {self.path}")
        try:
            text = self.path.read_text(encoding="utf-8").strip()
        except Exception as e:
            raise TextSourceException(f"Read error: {e}") from e
        if not text:
            raise TextSourceException("File is empty.")
        return text


class DirectTextSource(TextSource):
    def __init__(self, text: str):
        self.text = text.strip()

    def get_text(self) -> str:
        if not self.text:
            raise TextSourceException("Text is empty.")
        return self.text


class TTSEngine(ABC):
    @abstractmethod
    def synthesize(self, text: str, config: TTSConfig) -> Union[bytes, Path]:
        raise NotImplementedError


class GTTSBasedEngine(TTSEngine):
    def synthesize(self, text: str, config: TTSConfig) -> Union[bytes, Path]:
        if not text:
            raise EngineException("Empty text.")

        try:
            tts = gTTS(text=text, lang=config.language, slow=config.slow)
        except Exception as e:
            raise EngineException(f"gTTS init failed: {e}") from e

        if config.return_bytes:
            from io import BytesIO
            buf = BytesIO()
            try:
                tts.write_to_fp(buf)
            except Exception as e:
                raise EngineException(f"gTTS write failed: {e}") from e
            return buf.getvalue()

        if not config.output_file:
            raise EngineException("output_file missing.")

        output = config.output_file.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)

        try:
            tts.save(str(output))
        except Exception as e:
            raise EngineException(f"Save failed: {e}") from e

        return output


class TTSPipeline:
    def __init__(self, source: TextSource, engine: TTSEngine, config: TTSConfig):
        self.source = source
        self.engine = engine
        self.config = config

    def run(self) -> Union[bytes, Path]:
        try:
            text = self.source.get_text()
            return self.engine.synthesize(text, self.config)
        except TTSException:
            raise
        except Exception as e:
            raise TTSException(f"TTS pipeline error: {e}") from e
