class IllegalModelSelectionException(Exception):
    def __init__(self, message):
        super().__init__(message)

class AudioProcessingError(Exception):
    def __init__(self, message):
        super().__init__(message)

class TTSException(Exception):
    def __init__(self, message):
        super().__init__(message)


class TextSourceException(TTSException):
    def __init__(self, message):
        super().__init__(message)


class EngineException(TTSException):
    def __init__(self, message):
        super().__init__(message)
