class IllegalModelSelectionException(Exception):
    def __init__(self, message):
        super().__init__(message)

class AudioProcessingError(Exception):
    pass

class TTSException(Exception):
    pass


class TextSourceException(TTSException):
    pass


class EngineException(TTSException):
    pass
