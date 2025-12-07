import React from 'react'
import { Image, Video, FileText, Award } from 'lucide-react'

export default function QuestionCard({ question, index, total }) {
  const isInterview = question.type === 'interview'
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1 text-sm font-semibold rounded flex items-center gap-1 ${isInterview ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
              <Video className="w-4 h-4" />
              {isInterview ? 'Interview' : 'Viva'}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded flex items-center gap-1">
              <Award className="w-4 h-4" />
              {question.points || 1} point{question.points !== 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Question {index + 1} of {total}
          </h2>
          <div className={`bg-gray-50 ${isInterview ? 'border-l-4 border-indigo-500' : 'border-l-4 border-blue-500'} p-4 rounded-r-lg mb-4`}>
            <p className="text-base text-gray-800 leading-relaxed">{question.question}</p>
          </div>
        </div>
      </div>

      {(question.media?.image || question.media?.video || question.media?.graph) && (
        <div className="mb-6 space-y-3">
          {question.media.image && (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Image</span>
              </div>
              <img src={question.media.image.url} alt="Question image" className="max-w-full h-auto rounded" />
            </div>
          )}
          {question.media.video && (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Video</span>
              </div>
              <video src={question.media.video.url} controls className="max-w-full rounded" />
            </div>
          )}
          {question.media.graph && (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Graph/Chart</span>
              </div>
              <img src={question.media.graph.url} alt="Question graph" className="max-w-full h-auto rounded" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
