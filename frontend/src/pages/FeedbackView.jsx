import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Star, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Laptop,
  Users,
  Compass,
  Mic,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { submitFeedback } from '../services/api';

export default function FeedbackView() {
  const [role, setRole] = useState('student');
  const [profile, setProfile] = useState({ name: '', email: '', username: '', department: '' });
  
  const [feedbackType, setFeedbackType] = useState('');
  const [rating1, setRating1] = useState(0);
  const [rating2, setRating2] = useState(0);
  const [rating1Hover, setRating1Hover] = useState(0);
  const [rating2Hover, setRating2Hover] = useState(0);
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setRole(userData.role === 'teacher' ? 'faculty' : 'student');
        setProfile({
          name: userData.username || '',
          username: userData.username || '',
          email: userData.email || '',
          department: userData.department || userData.branch || ''
        });
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const isStudent = role === 'student';

  // Customize categories and labels depending on User Role
  const categories = isStudent 
    ? [
        { value: 'Technical Issue', label: '💻 Technical Issue (Mic, Audio, or page errors)' },
        { value: 'Exam Experience', label: '📝 Exam Experience (Timer, questions structure)' },
        { value: 'Feature Suggestion', label: '💡 Feature Suggestion (Practice modes, etc.)' },
        { value: 'General Feedback', label: '❓ General Feedback' }
      ]
    : [
        { value: 'System Interface', label: '⚙️ System Interface & Tools (Scheduling, student list)' },
        { value: 'AI Evaluation Accuracy', label: '🤖 AI Grading Accuracy (Grading / Rubric quality)' },
        { value: 'Technical Issue', label: '💻 Technical Issue (Page glitches, media uploading)' },
        { value: 'Feature Suggestion', label: '💡 Feature Suggestion (Reports, imports)' },
        { value: 'General Feedback', label: '❓ General Feedback' }
      ];

  const rating1Label = isStudent ? 'Portal Ease of Use' : 'Exam Management Interface';
  const rating2Label = isStudent ? 'Audio & Transcription Quality' : 'AI Evaluation & Rubric Accuracy';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackType) {
      setErrorMessage('Please select a feedback category.');
      return;
    }
    if (rating1 === 0 || rating2 === 0) {
      setErrorMessage('Please provide ratings for both criteria.');
      return;
    }
    if (message.trim().length < 10) {
      setErrorMessage('Please write a message with at least 10 characters.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await submitFeedback({
        name: profile.name,
        role: isStudent ? 'Student' : 'Faculty',
        email: profile.email,
        feedbackType,
        rating1,
        rating2,
        rating1Label,
        rating2Label,
        message: message.trim()
      });

      setSubmitSuccess(true);
      // Reset form
      setFeedbackType('');
      setRating1(0);
      setRating2(0);
      setMessage('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setErrorMessage(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ rating, setRating, hoverRating, setHoverRating, label }) => (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none transition-transform hover:scale-125"
          >
            <Star 
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                star <= (hoverRating || rating) 
                  ? 'fill-amber-400 text-amber-400' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs font-bold text-gray-400 ml-2">
            ({rating}/5)
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header card with blue/violet gradient */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-6 md:p-8 shadow-md text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Share Your Feedback</h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-lg">
              Help us improve ExamEcho! Tell us about your experience, report glitches, or request new features.
            </p>
          </div>
        </div>
      </div>

      {submitSuccess ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
            <CheckCircle className="w-10 h-10 text-green-600 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Feedback Submitted Successfully!</h2>
          <p className="text-sm text-gray-500 max-w-md">
            Thank you for helping us make the ExamEcho examination portal better. Your comments have been sent directly to the development team at examecho22@gmail.com.
          </p>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold text-sm shadow-sm"
          >
            Submit More Feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-gray-100 space-y-6">
          
          {/* User profile preview info */}
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border border-gray-100 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              {isStudent ? <GraduationCap className="w-4 h-4 text-blue-500" /> : <Briefcase className="w-4 h-4 text-blue-500" />}
              <div>
                <span className="font-semibold text-gray-800">User:</span> {profile.username}
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="font-semibold text-gray-800">Role:</span> 
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                {isStudent ? 'Student' : 'Faculty'}
              </span>
            </div>
            {profile.department && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-semibold text-gray-800">Dept/Branch:</span> {profile.department}
              </div>
            )}
          </div>

          {/* Feedback Type Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-800">Category</label>
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 font-medium"
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Dual Ratings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 p-4 sm:p-6 rounded-2xl border border-gray-100/50">
            <StarRating 
              rating={rating1} 
              setRating={setRating1} 
              hoverRating={rating1Hover} 
              setHoverRating={setRating1Hover} 
              label={rating1Label} 
            />
            <StarRating 
              rating={rating2} 
              setRating={setRating2} 
              hoverRating={rating2Hover} 
              setHoverRating={setRating2Hover} 
              label={rating2Label} 
            />
          </div>

          {/* Detailed Message Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-800">Detailed Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What went well? What went wrong? What can we do better?..."
              rows={5}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 resize-none"
            />
            <div className="flex justify-between text-[11px] text-gray-400 font-semibold px-1">
              <span>Must be at least 10 characters.</span>
              <span className={message.length >= 10 ? 'text-green-600' : 'text-amber-500'}>
                {message.length} characters
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm font-medium">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl transition-all font-semibold text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending Feedback...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>

        </form>
      )}

    </div>
  );
}
