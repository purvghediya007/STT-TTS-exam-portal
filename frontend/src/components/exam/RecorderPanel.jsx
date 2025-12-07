import React from 'react'

export default function RecorderPanel({ stream, recording, hasRecording, startCamera, startRecording, stopRecording, discardRecording, reRecordUsed, reRecordLimit, previewSrc }) {
  return (
    <div className="mb-6">
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Record your answer with camera and microphone:</label>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border-2 border-pink-200 rounded-lg p-3 bg-pink-50/30">
            <div className="aspect-video bg-black rounded overflow-hidden">
              <video
                autoPlay
                muted
                playsInline
                ref={(el) => {
                  if (el && stream) {
                    el.srcObject = stream
                  }
                }}
                className="w-full h-full"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              {!stream ? (
                <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Open Camera</button>
              ) : !recording ? (
                <button onClick={startRecording} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Start Recording</button>
              ) : (
                <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Stop Recording</button>
              )}
              {hasRecording && (
                <button onClick={discardRecording} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Re-record</button>
              )}
              {reRecordLimit > 0 && (
                <span className="text-xs text-gray-600">Re-records used: {reRecordUsed}/{reRecordLimit}</span>
              )}
            </div>
          </div>
          <div className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="text-sm font-semibold text-gray-700 mb-2">Preview</div>
            {previewSrc ? (
              <video src={previewSrc} controls className="w-full rounded" />
            ) : (
              <div className="h-full min-h-[200px] flex items-center justify-center text-gray-500">No recording yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
