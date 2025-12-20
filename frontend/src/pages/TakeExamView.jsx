import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchExamQuestions, getExamSummary, submitExam } from '../services/api';

// --- No Mock Data - Fetch from Backend ---

// --- Helper Components ---

const QuestionStatusItem = ({ id, status, onClick, isCurrent }) => {
  let bgColor;
  let borderColor = 'border-gray-300';
  let ringClass = '';

  switch (status) {
    case 'Answered': bgColor = 'bg-green-500 hover:bg-green-600'; break;
    case 'Marked for Review': bgColor = 'bg-yellow-500 hover:bg-yellow-600'; break;
    default: bgColor = 'bg-gray-400 hover:bg-gray-500';
  }

  if (isCurrent) {
    ringClass = 'ring-4 ring-blue-400 ring-opacity-75 shadow-lg transform scale-110';
    borderColor = 'border-blue-700';
  }

  return (
    <button
      onClick={() => onClick(id)}
      className={`${bgColor} ${ringClass} text-white font-bold w-10 h-10 rounded flex items-center justify-center transition duration-200 ${borderColor} border-2`}
    >
      {id}
    </button>
  );
};

const MultimediaDisplay = ({ multimedia }) => {
  if (!multimedia || typeof multimedia !== 'object') return null;

  // Handle both formats: old format (type + url) and new format (imageUrl/fileUrl)
  let displayUrl = null;
  let displayType = null;

  // New format from backend (imageUrl, fileUrl)
  if (multimedia.imageUrl) {
    displayUrl = multimedia.imageUrl;
    displayType = 'image';
  } else if (multimedia.fileUrl) {
    displayUrl = multimedia.fileUrl;
    displayType = 'video';
  }
  // Old format (type + url)
  else if (multimedia.url && multimedia.type) {
    displayUrl = multimedia.url;
    displayType = multimedia.type;
  }

  if (!displayUrl || !displayType) return null;

  const aspectClass = displayType === 'video' ? 'aspect-video' : '';
  return (
    <div className="my-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <p className="text-sm font-semibold text-gray-600 mb-2">{String(displayType).toUpperCase()} Context:</p>
      {displayType === 'image' || displayType === 'graph' ? (
        <img src={displayUrl} alt={`${displayType} context`} className="max-w-full h-auto rounded-md shadow-sm mx-auto" />
      ) : (
        <div className={`${aspectClass}`}>
          <iframe
            src={displayUrl}
            title="Video Context"
            className="w-full h-full rounded-md"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
const TakeExamView = () => {
  const { examId } = useParams() || {};
  const location = useLocation() || {};
  const navigate = useNavigate();

  // State for loading and questions
  const [questions, setQuestions] = useState([]);
  const [examSummary, setExamSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [examStatus, setExamStatus] = useState([]);
  const [remainingTime, setRemainingTime] = useState(3600);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState('pending');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [minimizeAttempts, setMinimizeAttempts] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMinimizeWarning, setShowMinimizeWarning] = useState(false);

  // REMOVED: [isSpeaking] state for Text-to-Speech

  // Refs for media and focus
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const questionContentRef = useRef(null);
  const audioStreamRef = useRef(null);

  // --- Load exam questions from backend ---
  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);
        const [summary, questionsData] = await Promise.all([
          getExamSummary(examId),
          fetchExamQuestions(examId)
        ]);
        setExamSummary(summary);
        const loadedQuestions = questionsData.questions || [];
        setQuestions(loadedQuestions);

        // Initialize exam status for all questions
        const initialStatus = loadedQuestions.map(q => ({
          id: q.id,
          status: 'Not Answered',
          answer: q.type === 'mcq'
            ? null
            : (q.type === 'viva' || q.type === 'interview')
              ? { recordings: [], activeIndex: null }
              : { text: '' }
        }));
        setExamStatus(initialStatus);

        // Set exam duration
        if (summary?.durationMin) {
          setRemainingTime(summary.durationMin * 60);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading exam:', err);
        setError(err.message || 'Failed to load exam');
        setLoading(false);
      }
    };

    if (examId) {
      loadExam();
    }
  }, [examId]);

  // Derived state - use questions from state instead of mockExamData
  const currentQuestion = questions[currentQIndex];
  const currentQState = examStatus[currentQIndex];
  const totalQuestions = questions.length;
  const progressPercent = examStatus.length > 0
    ? Math.round((examStatus.filter(q => q.status !== 'Not Answered').length / totalQuestions) * 100)
    : 0;

  // --- Derived State for Audio Question ---
  const isAudioQuestion = currentQuestion && (currentQuestion.type === 'viva' || currentQuestion.type === 'interview');
  const currentRecordings = isAudioQuestion && currentQState ? currentQState.answer.recordings : [];
  const activeAudioIndex = isAudioQuestion && currentQState ? currentQState.answer.activeIndex : null;
  const activeAudioURL = activeAudioIndex !== null && currentRecordings[activeAudioIndex] ? currentRecordings[activeAudioIndex] : null;


  // --- Timer & Security Effects ---
  useEffect(() => {
    if (remainingTime <= 0) {
      alert("Time is up! The exam will now be submitted automatically.");
      // REMOVED: SpeechSynthesis cleanup
      return;
    }
    const timer = setInterval(() => {
      setRemainingTime(prevTime => prevTime - 1);
    }, 1000);
    return () => {
      clearInterval(timer);
      // REMOVED: SpeechSynthesis cleanup
    };
  }, [remainingTime]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      alert("WARNING: Attempting to leave the exam window. This action may be logged as a violation.");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // --- Fullscreen & Minimize Detection ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check if we exited fullscreen while exam is running
      if (isExamStarted && !document.fullscreenElement) {
        const newAttempts = minimizeAttempts + 1;
        setMinimizeAttempts(newAttempts);
        setShowMinimizeWarning(true);

        if (newAttempts >= 2) {
          // Auto-submit the exam after 2 minimize attempts
          alert("⚠️ You have minimized the exam window 2 times. The exam will now be automatically submitted.");
          finalSubmitExam();
        } else {
          // Show warning and re-enter fullscreen
          setTimeout(() => {
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(err => console.log("Could not enter fullscreen:", err));
            }
            setShowMinimizeWarning(false);
          }, 3000);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isExamStarted, minimizeAttempts]);

  // --- Start Exam Handler ---
  const startExam = async () => {
    setIsExamStarted(true);
    setMinimizeAttempts(0);

    // Request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
    } catch (error) {
      alert("Could not enter fullscreen mode. Please try again.");
      setIsExamStarted(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // REMOVED: handleReadQuestion function

  // --- Standard Handlers ---

  const handleMCQSelect = (optionIndex) => {
    const currentAnswer = examStatus[currentQIndex].answer;
    let newAnswer = null;
    let newStatus = 'Not Answered';

    if (currentAnswer !== null && currentAnswer === optionIndex) {
      newAnswer = null;
      newStatus = 'Not Answered';
    } else {
      newAnswer = optionIndex;
      newStatus = 'Answered';
    }

    setExamStatus(prevStatus => prevStatus.map((q, index) =>
      index === currentQIndex ? { ...q, answer: newAnswer, status: newStatus } : q
    ));
  };

  const stopMediaStream = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecording(false);
    setIsStreamActive(false);
  }, []);

  const handleNavigation = (index) => {
    stopMediaStream();
    // REMOVED: SpeechSynthesis cleanup

    setCurrentQIndex(index);

    if (questionContentRef.current) {
      questionContentRef.current.focus();
    }
  };

  const handleStatusChange = (newStatus) => {
    const isAnswered = currentQState.answer !== null &&
      (currentQState.answer.activeIndex !== null || currentQuestion.type === 'MCQ');

    let statusToSet = newStatus;

    if (newStatus === 'Answered' && !isAnswered) {
      statusToSet = 'Not Answered';
    }

    setExamStatus(prevStatus => prevStatus.map((q, index) =>
      index === currentQIndex ? { ...q, status: statusToSet } : q
    ));
  };


  // --- Audio Recording Logic (Same as before) ---

  const startRecording = async () => {
    if (mediaPermissionStatus === 'denied') {
      alert("Microphone access was previously denied. Please check your browser settings and try again. NOTE: This feature requires a secure context (HTTPS or localhost).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setMediaPermissionStatus('granted');
      audioStreamRef.current = stream;

      recordedChunks.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm; codecs=opus') ? 'audio/webm; codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        const audioURL = URL.createObjectURL(blob);

        setExamStatus(prevStatus => prevStatus.map((q, index) => {
          if (index === currentQIndex) {
            const newRecordings = [...q.answer.recordings, audioURL];
            return {
              ...q,
              answer: {
                recordings: newRecordings,
                activeIndex: newRecordings.length - 1
              },
              status: 'Answered'
            };
          }
          return q;
        }));

        stopMediaStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      setIsRecording(true);
      setIsStreamActive(true);

    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaPermissionStatus('denied');
        alert("Mic access denied. You must grant permission to record the answer. Please check your browser settings.");
      } else {
        alert(`Error accessing audio media: ${err.name}. Check if your microphone is in use or if you are on a secure (HTTPS) connection.`);
      }
      console.error('Error accessing media devices:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const setActiveAudio = (index) => {
    setExamStatus(prevStatus => prevStatus.map((q, qIndex) => {
      if (qIndex === currentQIndex) {
        return {
          ...q,
          answer: {
            ...q.answer,
            activeIndex: index
          }
        };
      }
      return q;
    }));
  };

  const removeSpecificRecording = (indexToRemove) => {
    setExamStatus(prevStatus => prevStatus.map((q, qIndex) => {
      if (qIndex === currentQIndex) {
        const newRecordings = q.answer.recordings.filter((_, i) => i !== indexToRemove);

        URL.revokeObjectURL(q.answer.recordings[indexToRemove]);

        let newActiveIndex = null;
        let newStatus = 'Not Answered';

        if (newRecordings.length > 0) {
          newActiveIndex = q.answer.activeIndex >= newRecordings.length ? newRecordings.length - 1 : q.answer.activeIndex;
          if (indexToRemove < q.answer.activeIndex) {
            newActiveIndex = q.answer.activeIndex - 1;
          }
          if (newActiveIndex === -1) newActiveIndex = 0;
          newStatus = 'Answered';
        }

        return {
          ...q,
          answer: {
            recordings: newRecordings,
            activeIndex: newActiveIndex
          },
          status: newStatus
        };
      }
      return q;
    }));
  };


  const finalSubmitExam = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true);

    try {
      // Build the answers in the correct format for backend
      const answers = await Promise.all(examStatus.map(async (status, index) => {
        const question = questions[index];
        if (!question) return null;

        // MCQ: send selectedOptionIndex
        if (question.type === 'mcq' && status.answer !== null) {
          return {
            questionId: question._id,
            selectedOptionIndex: status.answer
          };
        }
        // Descriptive: send answerText
        else if (question.type !== 'mcq' && status.answer?.text) {
          return {
            questionId: question._id,
            answerText: status.answer.text
          };
        }
        // Audio/Interview/Viva: upload recordings and send URLs
        else if ((question.type === 'viva' || question.type === 'interview') && status.answer?.recordings?.length > 0) {
          const { uploadMedia } = await import('../services/api');

          // Upload all recordings to Cloudinary
          const audioUrls = await Promise.all(
            status.answer.recordings.map(async (recordingUrl, recordIndex) => {
              try {
                // Convert blob URL to blob
                const response = await fetch(recordingUrl);
                const blob = await response.blob();

                // Create file from blob
                const file = new File([blob], `answer_${question._id}_${recordIndex}.webm`, { type: 'audio/webm' });

                // Upload to Cloudinary
                const uploadResult = await uploadMedia(file);
                console.log(`Audio ${recordIndex} uploaded:`, uploadResult.url);

                return uploadResult.url;
              } catch (uploadError) {
                console.error(`Error uploading audio ${recordIndex}:`, uploadError);
                throw uploadError;
              }
            })
          );

          return {
            questionId: question._id,
            recordingUrls: audioUrls
          };
        }

        return null;
      }));

      const validAnswers = answers.filter(Boolean);

      // Call backend API to submit exam
      const result = await submitExam(examId, {
        answers: validAnswers,
        attemptId: location.state?.attemptId || `ATT-${Date.now()}`,
        startedAt: new Date().toISOString(),
        timeSpent: Math.round((3600 - remainingTime) / 60), // in minutes
        studentId: localStorage.getItem('user_id') || 'unknown'
      });

      // Show success message
      alert("Exam successfully submitted!");

      // Redirect to student dashboard after 1 second
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Error submitting exam: ' + (error.message || 'Please try again'));
      setIsSubmitting(false);
    }
  };

  // --- Conditional Question Renderer (Modified UI for Soft Audio Recording) ---

  const renderQuestionBody = () => {
    if (!currentQuestion) {
      return <div className="text-gray-500">No question data</div>;
    }

    if (currentQuestion.type === 'mcq') {
      const currentAnswer = examStatus[currentQIndex]?.answer;
      const options = currentQuestion.options || [];
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg cursor-pointer transition duration-150 ${currentAnswer === index
                ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 font-semibold'
                : 'bg-white hover:bg-gray-50 border-gray-300'
                }`}
              onClick={() => handleMCQSelect(index)}
            >
              <span className="font-mono text-sm mr-3 text-blue-600">{String.fromCharCode(65 + index)}.</span>
              <span className="text-gray-800">{option.text}</span>
              {currentAnswer === index && <span className="float-right text-blue-600">Selected</span>}
            </div>
          ))}
        </div>
      );
    }

    if (isAudioQuestion) {
      return (
        <div className="space-y-4">
          {mediaPermissionStatus === 'denied' && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
              <p className="font-bold">Permission Denied</p>
              <p>Microphone access is blocked. Please grant permission in your browser settings to record your answer.</p>
            </div>
          )}

          {/* UPDATED UI: Soft Recording Indicator */}
          <div className={`flex justify-center items-center h-48 rounded-lg overflow-hidden relative border-4 border-dashed transition duration-500
              ${isStreamActive
              ? 'bg-red-50 border-red-400'
              : 'bg-gray-200 border-gray-400'}`
          }>

            {isStreamActive && (
              <div className="text-center p-4">
                {/* Animated Mic/Waveform */}
                <div className="flex items-center justify-center space-x-1 h-16">
                  {/* Soft Waveform bars - pulsing when recording */}
                  <div className="w-2 h-8 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-12 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-16 bg-red-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-12 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <div className="w-2 h-8 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>
                <p className="mt-2 text-lg font-bold text-red-700">Recording Audio...</p>
                <p className="text-sm text-red-500">Click 'Stop Recording' below to save the clip.</p>
              </div>
            )}

            {activeAudioURL && !isStreamActive && (
              <div className="p-4 bg-white rounded-lg shadow-xl w-full max-w-sm">
                <p className="text-center font-semibold text-blue-700 mb-2">Active Recording for Review:</p>
                <audio
                  controls
                  key={activeAudioURL}
                  src={activeAudioURL}
                  className="w-full"
                />
              </div>
            )}

            {!isStreamActive && currentRecordings.length === 0 && mediaPermissionStatus !== 'denied' && (
              <div className="text-gray-600 text-lg absolute inset-0 flex items-center justify-center">
                Click 'Record Audio Answer' to begin.
              </div>
            )}
            {isRecording && (
              <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-full flex items-center shadow-lg">
                LIVE
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-4 pt-2">
            {!isRecording && (
              <button
                onClick={startRecording}
                disabled={mediaPermissionStatus === 'denied'}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" clipRule="evenodd" /><path d="M5.586 15H4a1 1 0 01-1-1v-2.414A1 1 0 013.293 11l2.586 2.586A1 1 0 015.586 15zM14 12.586V14a1 1 0 01-1 1h-1.586a1 1 0 01-.707-.293l-2.586-2.586A1 1 0 0111 10.707V9a1 1 0 012 0v1a1 1 0 002 0v-1a1 1 0 012 0v2.414a1 1 0 01-.293.707l-2.586 2.586A1 1 0 0114 15.414z" clipRule="evenodd" /></svg>
                {currentRecordings.length > 0 ? 'Record Another Clip' : 'Record Audio Answer'}
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" /></svg>
                Stop Recording
              </button>
            )}
          </div>

          {currentRecordings.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <p className="font-semibold text-gray-700 mb-3">Review and Select Your Final Answer:</p>
              <div className="flex flex-wrap gap-3">
                {currentRecordings.map((_, index) => (
                  <div key={index} className="relative">
                    <button
                      onClick={() => setActiveAudio(index)}
                      className={`py-2 px-4 rounded-lg font-medium transition duration-200 border-2 ${activeAudioIndex === index
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'
                        }`}
                    >
                      Recording {index + 1} {activeAudioIndex === index && '(Active)'}
                    </button>
                    <button
                      onClick={() => removeSpecificRecording(index)}
                      title="Remove Clip"
                      className="absolute top-[-8px] right-[-8px] bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-700 transition"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (currentQuestion.type === 'short_answer' || currentQuestion.type === 'long_answer') {
      const currentAnswer = examStatus[currentQIndex]?.answer?.text || '';
      return (
        <div>
          <textarea
            value={currentAnswer}
            onChange={(e) => {
              const newStatus = [...examStatus];
              newStatus[currentQIndex].answer = { text: e.target.value };
              setExamStatus(newStatus);
            }}
            placeholder={`Enter your ${currentQuestion.type === 'short_answer' ? 'brief' : 'detailed'} answer here...`}
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="mt-2 text-sm text-gray-500">
            {currentQuestion.type === 'short_answer' ? 'Brief Answer Expected' : 'Detailed Answer Expected'}
          </p>
        </div>
      );
    }

    return <p className="text-red-500">Error: Unknown question type.</p>;
  };

  // --- Minimize Warning Modal Component ---
  const MinimizeWarningModal = ({ isVisible, attempts }) => {
    if (!isVisible) return null;

    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 transform transition-all animate-pulse">
          <h3 className="text-2xl font-bold text-red-600 mb-4 border-b pb-2">⚠️ Exam Window Minimized</h3>
          <div className="space-y-3 text-lg mb-6">
            <p className="text-gray-800">You have exited fullscreen mode.</p>
            <p className="text-red-600 font-bold">
              Minimize Attempts: <span className="text-2xl">{attempts}/2</span>
            </p>
            <p className="text-gray-700 text-sm">
              {attempts === 1
                ? 'You have 1 more chance to exit fullscreen. The next attempt will auto-submit your exam.'
                : 'Your exam will be automatically submitted in 3 seconds...'}
            </p>
          </div>
          <p className="text-sm text-gray-500 text-center">Re-entering fullscreen...</p>
        </div>
      </div>
    );
  };

  // --- Submission Modal Component (Same as before) ---
  const SubmissionModal = ({ isVisible, onClose, onConfirm, isSubmitting }) => {
    if (!isVisible) return null;

    const answeredCount = examStatus.filter(q => q.status === 'Answered').length;
    const reviewCount = examStatus.filter(q => q.status === 'Marked for Review').length;
    const unansweredCount = totalQuestions - answeredCount - reviewCount;

    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 transform transition-all">
          <h3 className="text-2xl font-bold text-blue-700 mb-4 border-b pb-2">Confirm Exam Submission</h3>

          <div className="space-y-3 text-lg mb-6">
            <p className="font-semibold">Total Questions: <span className="float-right">{totalQuestions}</span></p>
            <p className="text-green-600">✅ Answered: <span className="float-right font-bold">{answeredCount}</span></p>
            <p className="text-yellow-600">🚩 Marked for Review: <span className="float-right font-bold">{reviewCount}</span></p>
            <p className="text-red-600">❌ Not Answered: <span className="float-right font-bold">{unansweredCount}</span></p>
          </div>

          {unansweredCount > 0 && (
            <p className="text-sm bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-6 font-medium">
              Warning: You have **{unansweredCount}** questions not yet answered. Do you still wish to proceed with the submission?
            </p>
          )}

          {isSubmitting && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-blue-700 font-semibold">Uploading and submitting exam...</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review & Go Back
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                'Final Submit'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      {/* Loading or Error State */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading exam...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg mx-auto mt-10">
          <p className="text-red-800 font-semibold">Error Loading Exam</p>
          <p className="text-red-700 text-sm mt-2">{error}</p>
        </div>
      )}

      {!loading && !error && questions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-lg mx-auto mt-10">
          <p className="text-yellow-800 font-semibold">No Questions Found</p>
          <p className="text-yellow-700 text-sm mt-2">This exam does not have any questions yet.</p>
        </div>
      )}

      {/* --- Submission Modal Rendering --- */}
      <SubmissionModal
        isVisible={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={finalSubmitExam}
        isSubmitting={isSubmitting}
      />

      {/* --- Start Exam Screen --- */}
      {!isExamStarted && !loading && !error && questions.length > 0 && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 sm:p-12">
            <h1 className="text-4xl font-bold text-blue-700 mb-6 text-center">Ready to Start?</h1>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-blue-800 mb-4">⚠️ Important Instructions:</h2>
              <ul className="space-y-3 text-gray-800">
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">1.</span>
                  <span>Your exam will automatically enter <strong>FULLSCREEN MODE</strong> when you start.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">2.</span>
                  <span>You are allowed <strong>ONLY 2 CHANCES</strong> to minimize or exit fullscreen.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">3.</span>
                  <span>After the <strong>2nd minimize attempt</strong>, your exam will be <strong>AUTOMATICALLY SUBMITTED</strong>.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">4.</span>
                  <span>Keep your exam window in fullscreen to avoid accidental submission.</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
              <p className="text-yellow-800 font-semibold text-center">
                📋 Total Questions: <span className="text-2xl font-bold text-yellow-600">{totalQuestions}</span>
              </p>
              <p className="text-yellow-700 text-center mt-2">
                Total Marks: <span className="font-bold">{questions.reduce((sum, q) => sum + (q.marks || 0), 0)}</span>
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="px-8 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition transform hover:scale-105"
              >
                Go Back
              </button>
              <button
                onClick={startExam}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition transform hover:scale-105 shadow-lg"
              >
                🚀 Start Exam in Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Top Bar: Timer and Progress --- */}
      {isExamStarted && (
        <div className="sticky top-0 z-20 bg-white shadow-lg rounded-xl p-4 mb-6 flex justify-between items-center border-t-4 border-blue-600">
          <h1 className="text-2xl font-extrabold text-blue-700">Exam Viewer</h1>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Remaining Time</p>
              <p className={`text-2xl font-bold ${remainingTime <= 300 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                {formatTime(remainingTime)}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-500">Progress</p>
              <div className="w-32 bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-gray-600 mt-1">{progressPercent}% Completed</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && questions.length > 0 && isExamStarted && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* --- Main Content Area: Question Display --- */}
          <div
            className="lg:w-3/4 w-full bg-white p-6 rounded-xl shadow-xl"
            ref={questionContentRef}
            tabIndex="-1"
          >
            {currentQuestion && (
              <>
                <header className="mb-6 pb-4 border-b">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-lg font-semibold text-gray-700">
                        Question {currentQIndex + 1} of {totalQuestions}
                      </h2>
                      {/* REMOVED: Text-to-Speech Button */}
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      Marks: {currentQuestion?.marks}
                    </span>
                  </div>
                </header>

                <div className="text-xl font-medium text-gray-900 mb-4 leading-relaxed">
                  {currentQuestion?.text}
                </div>

                <MultimediaDisplay multimedia={currentQuestion?.media} />

                <div className="mt-8 p-4 border-t pt-6">
                  {renderQuestionBody()}
                </div>

                {/* --- Bottom Navigation --- */}
                <div className="mt-10 pt-6 border-t flex justify-between">
                  <button
                    onClick={() => handleNavigation(currentQIndex - 1)}
                    disabled={currentQIndex === 0}
                    className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 disabled:opacity-50 transition"
                  >
                    &larr; Previous
                  </button>

                  <div className="space-x-4">
                    <button
                      onClick={() => handleStatusChange(currentQState.status === 'Marked for Review' ? 'Answered' : 'Marked for Review')}
                      className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${currentQState.status === 'Marked for Review'
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                        }`}
                    >
                      {currentQState.status === 'Marked for Review' ? 'Unmark for Review' : '🚩 Mark for Review'}
                    </button>
                  </div>

                  <button
                    onClick={() => currentQIndex === totalQuestions - 1 ? setShowSubmitModal(true) : handleNavigation(currentQIndex + 1)}
                    className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${currentQIndex === totalQuestions - 1
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {currentQIndex === totalQuestions - 1 ? 'Submit Exam' : 'Next Question \u2192'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* --- Sidebar: Question Status Tracking --- */}
          <div className="lg:w-1/4 w-full">
            <div className="sticky top-[100px] bg-white p-6 rounded-xl shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Question Panel</h3>
              <div className="grid grid-cols-5 gap-3">
                {questions.map((q, index) => (
                  <QuestionStatusItem
                    key={q.id}
                    id={index + 1}
                    status={examStatus[index]?.status || 'Not Answered'}
                    onClick={id => handleNavigation(id - 1)}
                    isCurrent={index === currentQIndex}
                  />
                ))}
              </div>

              <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                <p className="flex items-center">
                  <span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                  Answered: <span className="font-bold ml-auto">{examStatus.filter(q => q.status === 'Answered').length}</span>
                </p>
                <p className="flex items-center">
                  <span className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></span>
                  Review: <span className="font-bold ml-auto">{examStatus.filter(q => q.status === 'Marked for Review').length}</span>
                </p>
                <p className="flex items-center">
                  <span className="w-4 h-4 bg-gray-400 rounded-full mr-2"></span>
                  Not Answered: <span className="font-bold ml-auto">{examStatus.filter(q => q.status === 'Not Answered').length}</span>
                </p>
              </div>

              <button
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    startExam();
                  }
                }}
                className="mt-6 w-full py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition"
              >
                {document.fullscreenElement ? 'Exit Full-Screen Mode' : 'Enter Full-Screen Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeExamView;