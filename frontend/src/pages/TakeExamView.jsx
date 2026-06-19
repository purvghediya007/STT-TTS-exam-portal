import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchExamQuestions, getExamSummary, submitExam, startExam as apiStartExam, saveExamProgress, getSavedAnswers } from '../services/api';
import { uploadAudioToS3Complete } from '../services/s3AudioUpload';

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
  const audioRef = useRef(null);
  const hasAutoSubmittedRef = useRef(false);
  const [attemptId, setAttemptId] = useState(location.state?.attemptId || null);

  // State for loading and questions
  const [questions, setQuestions] = useState([]);
  const [examSummary, setExamSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [examStatus, setExamStatus] = useState([]);

  const [remainingTime, setRemainingTime] = useState(3600);
  const [deadlineAt, setDeadlineAt] = useState(null);
  const [startedAt, setStartedAt] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState('pending');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [minimizeAttempts, setMinimizeAttempts] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMinimizeWarning, setShowMinimizeWarning] = useState(false);
  const [reRecordUsed, setReRecordUsed] = useState(0); // Track re-records used globally
  const [isUploadingAudio, setIsUploadingAudio] = useState(false); // Track audio upload status during navigation

  // Ref to keep track of the latest examStatus without triggering dependency loops
  const examStatusRef = useRef([]);
  useEffect(() => {
    examStatusRef.current = examStatus;
  }, [examStatus]);

  // Refs to avoid stale closures in effects and event listeners
  const questionsRef = useRef([]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const attemptIdRef = useRef(attemptId);
  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  const remainingTimeRef = useRef(remainingTime);
  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  // REMOVED: [isSpeaking] state for Text-to-Speech

  // Refs for media and focus
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const questionContentRef = useRef(null);
  const audioStreamRef = useRef(null);
  const lastMinimizeRef = useRef(0);
  const permissionRequestRef = useRef(0);
  const awayStartRef = useRef(0);
  const awayTimerRef = useRef(null);
  const bannerDismissRef = useRef(0);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [topWarning, setTopWarning] = useState('');
  const [showTopWarning, setShowTopWarning] = useState(false);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false);
  const [autoSubmitInProgress, setAutoSubmitInProgress] = useState(false);
  const [autoSubmitDone, setAutoSubmitDone] = useState(false);
  const lastAlertRef = useRef({ msg: '', ts: 0 });

  const showAlertOnce = (msg) => {
    try {
      const now = Date.now();
      if (lastAlertRef.current.msg === msg && now - lastAlertRef.current.ts < 3000) return;
      lastAlertRef.current = { msg, ts: now };
      alert(msg);
    } catch (e) {
      // fallback to console
      console.warn('Alert fallback:', msg);
    }
  };

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

        // Do NOT set remaining time from exam window duration here
        // It will be set based on student's personal deadline when exam starts
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

  // --- Start Exam Handler ---
  const startExam = useCallback(async () => {
    hasAutoSubmittedRef.current = false; // Reset auto-submit flag
    setReRecordUsed(0); // Reset re-record count when starting exam
    setIsExamStarted(true);
    setMinimizeAttempts(0);

    // Request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
      // Try to request microphone permission proactively (may prompt the user)
      try { await requestMicrophonePermission(); } catch (e) { /* ignore */ }
    } catch (error) {
      showAlertOnce("Could not enter fullscreen mode. Please try again.");
      setIsExamStarted(false);
    }
  }, []);

  // Request microphone permission helper
  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaPermissionStatus('unsupported');
      return;
    }
    // mark permission request start time so visibility/blur handlers can ignore resulting focus changes
    permissionRequestRef.current = Date.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop tracks - we only wanted permission
      stream.getTracks().forEach(t => t.stop());
      setMediaPermissionStatus('granted');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaPermissionStatus('denied');
        showAlertOnce('Microphone permission denied. Please enable it in your browser settings to record audio answers.');
      } else {
        console.error('Microphone permission error:', err);
        setMediaPermissionStatus('error');
      }
      throw err;
    } finally {
      // keep a short grace window, then clear
      setTimeout(() => { permissionRequestRef.current = 0 }, 3500);
    }
  };

  // Auto-start exam and enter fullscreen when questions are loaded
  useEffect(() => {
    if (!loading && !error && questions.length > 0 && !isExamStarted) {
      // show start prompt asking for microphone permission before starting
      setShowStartPrompt(true);
    }
  }, [loading, error, questions.length, isExamStarted, startExam]);

  // If the user reached this page directly without an attemptId, request one from the backend
  // Fetch exam deadline on component mount and whenever examId changes
  useEffect(() => {
    if (!examId) return;

    const fetchDeadline = async () => {
      try {
        const res = await apiStartExam(examId);
        console.log('🕐 API Response from startExam:', res);
        const newAttempt = res?.attemptId || res?.attempt_id;
        if (newAttempt && !attemptId) {
          setAttemptId(newAttempt);
        }

        // Extract deadline from expiresAt field
        const expiresAtStr = res?.expiresAt;

        if (expiresAtStr) {
          const deadline = new Date(expiresAtStr);
          console.log('📅 Setting deadline to:', deadline.toISOString());
          console.log('⏰ Current time:', new Date().toISOString());
          setDeadlineAt(deadline);
          setStartedAt(new Date());

          // Calculate remaining seconds from deadline
          const secondsRemaining = Math.floor((deadline - new Date()) / 1000);
          console.log('⏱️ Initial remaining seconds:', secondsRemaining, `(${Math.floor(secondsRemaining / 60)} minutes)`);
          setRemainingTime(Math.max(0, secondsRemaining));
        } else {
          console.warn('⚠️ No expiresAt field in API response:', res);
        }
      } catch (err) {
        console.warn('Could not fetch exam deadline:', err);
      }
    };

    fetchDeadline();
  }, [examId, attemptId]);

  // Derived state - use questions from state instead of mockExamData
  const currentQuestion = questions[currentQIndex];
  const currentQState = examStatus[currentQIndex];
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const progressPercent = examStatus.length > 0
    ? Math.round((examStatus.filter(q => q.status !== 'Not Answered').length / totalQuestions) * 100)
    : 0;

  // --- Derived State for Audio Question ---
  const isAudioQuestion = currentQuestion && (currentQuestion.type === 'viva' || currentQuestion.type === 'interview');
  const currentRecordings = isAudioQuestion && currentQState ? currentQState.answer.recordings : [];
  const activeAudioIndex = isAudioQuestion && currentQState ? currentQState.answer.activeIndex : null;
  const activeAudioURL = activeAudioIndex !== null && currentRecordings[activeAudioIndex] ? currentRecordings[activeAudioIndex] : null;

  // Helper function to check if URL is already uploaded to S3
  const isS3Url = (url) => {
    if (!url) return false;
    return url.startsWith('https://') && (url.includes('.s3') || url.includes('amazonaws.com'));
  };

  // Helper to save answers progress to backend
  const saveAnswerProgress = async (updatedStatus = examStatusRef.current) => {
    const usedAttemptId = attemptIdRef.current || location.state?.attemptId;
    const currentQuestions = questionsRef.current;
    if (!examId || !usedAttemptId || currentQuestions.length === 0 || updatedStatus.length === 0) return;

    try {
      const answers = [];
      for (let index = 0; index < currentQuestions.length; index++) {
        const question = currentQuestions[index];
        const status = updatedStatus[index];

        if (!question || !status || status.answer === null || status.answer === undefined) continue;

        if (question.type === 'mcq' && status.answer !== null) {
          answers.push({
            questionId: question._id || question.id,
            selectedOptionIndex: status.answer
          });
        } else if (question.type !== 'mcq' && question.type !== 'viva' && question.type !== 'interview' && status.answer?.text) {
          answers.push({
            questionId: question._id || question.id,
            answerText: status.answer.text
          });
        } else if ((question.type === 'viva' || question.type === 'interview') && status.answer?.recordings?.length > 0) {
          const s3Urls = status.answer.recordings.filter(url => isS3Url(url));
          if (s3Urls.length > 0) {
            answers.push({
              questionId: question._id || question.id,
              recordingUrls: s3Urls
            });
          }
        }
      }

      if (answers.length > 0) {
        console.log(`💾 Saving progress for ${answers.length} answers...`);
        await saveExamProgress(examId, {
          attemptId: usedAttemptId,
          answers
        });
      }
    } catch (err) {
      console.warn('⚠️ Progress save failed:', err);
    }
  };

  // Load saved progress if attemptId and questions are available
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!attemptId || questions.length === 0 || examStatus.length === 0) return;
      try {
        console.log('📂 Fetching saved progress for attempt:', attemptId);
        const progressRes = await getSavedAnswers(attemptId);
        if (progressRes && Array.isArray(progressRes.answers)) {
          const savedAnswersMap = new Map();
          progressRes.answers.forEach(ans => {
            savedAnswersMap.set(ans.questionId, ans);
          });

          console.log(`✅ Loaded ${progressRes.answers.length} saved answers from DB.`);

          setExamStatus(prevStatus => {
            return prevStatus.map((qState, index) => {
              const question = questions[index];
              if (!question) return qState;
              const savedAns = savedAnswersMap.get(question._id || question.id);

              if (savedAns) {
                let statusVal = 'Not Answered';
                let answerVal = null;

                if (question.type === 'mcq') {
                  if (savedAns.selectedOptionIndex !== undefined && savedAns.selectedOptionIndex !== null) {
                    answerVal = savedAns.selectedOptionIndex;
                    statusVal = 'Answered';
                  }
                } else if (question.type === 'viva' || question.type === 'interview') {
                  if (savedAns.recordingUrls && savedAns.recordingUrls.length > 0) {
                    answerVal = {
                      recordings: savedAns.recordingUrls,
                      activeIndex: savedAns.recordingUrls.length - 1
                    };
                    statusVal = 'Answered';
                  } else {
                    answerVal = { recordings: [], activeIndex: null };
                  }
                } else {
                  if (savedAns.answerText) {
                    answerVal = { text: savedAns.answerText };
                    statusVal = 'Answered';
                  } else {
                    answerVal = { text: '' };
                  }
                }

                return {
                  ...qState,
                  status: statusVal,
                  answer: answerVal
                };
              }
              return qState;
            });
          });
        }
      } catch (err) {
        console.warn('⚠️ Could not load saved progress:', err);
      }
    };

    loadSavedProgress();
  }, [attemptId, questions, examStatus.length]);

  // Auto-save descriptive answers every 15 seconds
  useEffect(() => {
    if (!isExamStarted || questions.length === 0) return;

    const autoSaveInterval = setInterval(() => {
      console.log('⏰ 15s Auto-save interval triggered');
      saveAnswerProgress(examStatusRef.current);
    }, 15000);

    return () => clearInterval(autoSaveInterval);
  }, [isExamStarted, questions.length]);


  // --- Timer & Security Effects ---
  useEffect(() => {
    // If no deadline is set yet, don't start the timer
    if (!deadlineAt) {
      console.log('⏰ Timer waiting for deadline...');
      return;
    }

    if (remainingTime <= 0) {
      showAlertOnce("Time is up! The exam will now be submitted automatically.");
      // REMOVED: SpeechSynthesis cleanup
      return;
    }

    console.log('⏰ Timer started with deadline:', deadlineAt.toISOString());
    const timer = setInterval(() => {
      if (!deadlineAt) return;
      const now = new Date();
      const secondsRemaining = Math.floor((deadlineAt - now) / 1000);
      const timeToDisplay = Math.max(0, secondsRemaining);

      if (timeToDisplay <= 0) {
        clearInterval(timer);
        setRemainingTime(0);
        // Auto-submit the exam when time runs out
        if (!hasAutoSubmittedRef.current) {
          hasAutoSubmittedRef.current = true;
          console.log('⏰ Time is up! Auto-submitting exam...');
          triggerAutoSubmitFlow();
        }
        return;
      }

      setRemainingTime(timeToDisplay);
    }, 1000);

    return () => {
      clearInterval(timer);
      // REMOVED: SpeechSynthesis cleanup
    };
  }, [deadlineAt]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      // Auto-submit on navigation attempt
      if (isExamStarted && !isSubmitting) {
        finalSubmitExam();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamStarted, isSubmitting]);

  // --- Tab/Window Switch Detection - Auto Submit ---
  useEffect(() => {
    if (!isExamStarted || isSubmitting || hasAutoSubmittedRef.current) return;

    // Detect tab/window visibility changes
    const handleVisibilityChange = () => {
      // ignore visibility changes triggered by microphone permission prompt or banner dismiss
      if (permissionRequestRef.current && Date.now() - permissionRequestRef.current < 3500) return;
      if (bannerDismissRef.current && Date.now() - bannerDismissRef.current < 1500) return;
      if (!isExamStarted || isSubmitting) return;
      // only start counting after mic permission granted
      if (mediaPermissionStatus !== 'granted') return;

      if (document.hidden) {
        const now = Date.now();
        if (now - lastMinimizeRef.current < 1500) return; // debounce
        lastMinimizeRef.current = now;

        // record away start and start 10s timer
        awayStartRef.current = Date.now();
        if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
        awayTimerRef.current = setTimeout(() => {
          if (document.hidden) {
            if (!hasAutoSubmittedRef.current) {
              hasAutoSubmittedRef.current = true;
              triggerAutoSubmitFlow();
            }
          }
        }, 10000);

        setMinimizeAttempts(prev => {
          const next = prev + 1;
          setShowMinimizeWarning(true);
          if (next >= 2) {
            if (!hasAutoSubmittedRef.current) {
              hasAutoSubmittedRef.current = true;
              // start auto-submit flow and show a single modal to the user
              triggerAutoSubmitFlow();
            }
          } else {
            // show dismissible top warning instead of alert so granting permission or clicking it won't count as another switch
            setTopWarning('⚠️ You switched/minimized the exam window. This is warning 1 of 2. Return to the exam.');
            setShowTopWarning(true);
            // Do NOT force re-entering fullscreen automatically; leave fullscreen state as-is
            setTimeout(() => {
              setShowMinimizeWarning(false);
            }, 2500);
          }
          return next;
        });
      } else {
        // returned to page
        if (awayTimerRef.current) { clearTimeout(awayTimerRef.current); awayTimerRef.current = null; }
        if (awayStartRef.current && (Date.now() - awayStartRef.current) > 10000) {
          if (!hasAutoSubmittedRef.current) {
            hasAutoSubmittedRef.current = true;
            triggerAutoSubmitFlow();
          }
        }
        awayStartRef.current = 0;
      }
    };

    // Detect window blur (user switched to another window/app)
    const handleBlur = () => {
      // ignore blur events caused by microphone permission prompt or banner dismiss
      if (permissionRequestRef.current && Date.now() - permissionRequestRef.current < 3500) return;
      if (bannerDismissRef.current && Date.now() - bannerDismissRef.current < 1500) return;
      if (!isExamStarted || isSubmitting) return;
      if (mediaPermissionStatus !== 'granted') return;

      const now = Date.now();
      if (now - lastMinimizeRef.current < 1500) return;
      lastMinimizeRef.current = now;

      awayStartRef.current = Date.now();
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
      awayTimerRef.current = setTimeout(() => {
        if (document.hidden || document.visibilityState !== 'visible') {
          if (!hasAutoSubmittedRef.current) {
            hasAutoSubmittedRef.current = true;
            triggerAutoSubmitFlow();
          }
        }
      }, 10000);

      setMinimizeAttempts(prev => {
        const next = prev + 1;
        setShowMinimizeWarning(true);
        if (next >= 2) {
          if (!hasAutoSubmittedRef.current) {
            hasAutoSubmittedRef.current = true;
            triggerAutoSubmitFlow();
          }
        } else {
          setTopWarning('⚠️ You switched/minimized the exam window. This is warning 1 of 2. Return to the exam.');
          setShowTopWarning(true);
          // Do NOT force re-entering fullscreen automatically; leave fullscreen state as-is
          setTimeout(() => {
            setShowMinimizeWarning(false);
          }, 2500);
        }
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isExamStarted, isSubmitting]);

  // --- Fullscreen & Minimize Detection ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check if we exited fullscreen while exam is running
      // ignore fullscreen changes triggered shortly after permission prompt or banner dismiss
      if (permissionRequestRef.current && Date.now() - permissionRequestRef.current < 3500) return;
      if (bannerDismissRef.current && Date.now() - bannerDismissRef.current < 1500) return;
      if (!isExamStarted || isSubmitting) return;
      if (mediaPermissionStatus !== 'granted') return;
      if (isExamStarted && !document.fullscreenElement) {
        const now = Date.now();
        if (now - lastMinimizeRef.current < 1500) return; // avoid double-counting nearby events
        lastMinimizeRef.current = now;

        awayStartRef.current = Date.now();
        if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
        awayTimerRef.current = setTimeout(() => {
          if (!document.fullscreenElement) {
            if (!hasAutoSubmittedRef.current) {
              hasAutoSubmittedRef.current = true;
              triggerAutoSubmitFlow();
            }
          }
        }, 10000);

        setMinimizeAttempts(prev => {
          const next = prev + 1;
          setShowMinimizeWarning(true);
          if (next >= 2) {
            if (!hasAutoSubmittedRef.current) {
              hasAutoSubmittedRef.current = true;
              triggerAutoSubmitFlow();
            }
          } else {
            setTopWarning('⚠️ You minimized the exam window. This is warning 1 of 2. Return to the exam.');
            setShowTopWarning(true);
            // Do NOT force re-entering fullscreen automatically; leave fullscreen state as-is
            setTimeout(() => {
              setShowMinimizeWarning(false);
            }, 3000);
          }
          return next;
        });
      } else {
        if (awayTimerRef.current) { clearTimeout(awayTimerRef.current); awayTimerRef.current = null; }
        if (awayStartRef.current && (Date.now() - awayStartRef.current) > 10000) {
          hasAutoSubmittedRef.current = true;
          showAlertOnce('⚠️ You were away from the exam for more than 10 seconds. The exam will be submitted.');
          finalSubmitExam();
        }
        awayStartRef.current = 0;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isExamStarted, minimizeAttempts]);

  // Dismiss top warning without counting as a switch
  const dismissTopWarning = () => {
    setShowTopWarning(false);
    bannerDismissRef.current = Date.now();
    setTimeout(() => { bannerDismissRef.current = 0; }, 1500);
  };

  // Trigger auto-submit flow: start submission (no redirect) and show modal
  const triggerAutoSubmitFlow = async () => {
    if (autoSubmitInProgress || autoSubmitDone) return;
    setShowAutoSubmitModal(true);
    setAutoSubmitInProgress(true);
    try {
      await finalSubmitExam({ redirect: false });
      setAutoSubmitDone(true);
    } catch (e) {
      console.error('Auto-submit failed', e);
    } finally {
      setAutoSubmitInProgress(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // REMOVED: handleReadQuestion function

  // Auto-speak question after navigating to it (2s delay)
  useEffect(() => {
    if (!currentQuestion) return;

    const playTimer = setTimeout(async () => {
      try {
        // stop any existing speech/audio
        if (audioRef.current) {
          try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (e) { }
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();

        if (currentQuestion.ttsAudioUrl) {
          const src = currentQuestion.ttsAudioUrl.startsWith('http') ? currentQuestion.ttsAudioUrl : `http://localhost:3001${currentQuestion.ttsAudioUrl}`;
          if (audioRef.current) {
            audioRef.current.src = src;
            audioRef.current.onended = () => setIsPlaying(false);
            await audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { });
          }
        } else if (window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(currentQuestion.text || '');
          utter.rate = 1;
          utter.pitch = 1;
          utter.onend = () => setIsPlaying(false);
          window.speechSynthesis.speak(utter);
          setIsPlaying(true);
        }
      } catch (err) {
        console.log('TTS play failed', err);
      }
    }, 2000);

    return () => {
      clearTimeout(playTimer);
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (e) { }
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
    };
  }, [currentQIndex]);

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

    const nextStatus = examStatus.map((q, index) =>
      index === currentQIndex ? { ...q, answer: newAnswer, status: newStatus } : q
    );
    setExamStatus(nextStatus);
    saveAnswerProgress(nextStatus);
  };

  const stopMediaStream = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecording(false);
    setIsStreamActive(false);
  }, []);

  // --- Upload Audio Before Navigation ---
  const uploadCurrentQuestionAudio = async (questionIndex) => {
    const qState = examStatus[questionIndex];
    if (!qState) return true; // Invalid index, proceed with navigation

    const currentQuestions = questionsRef.current;
    const question = currentQuestions[questionIndex];
    const isAudio = question && (question.type === 'viva' || question.type === 'interview');

    // If not an audio question or no recordings, proceed immediately
    if (!isAudio || !qState.answer || qState.answer.recordings.length === 0) {
      return true;
    }

    setIsUploadingAudio(true);
    console.log(`\n📤 Uploading audio for question ${questionIndex + 1}...`);
    let uploadSuccessful = true;
    const uploadedUrls = [];

    try {
      // Upload all recordings for this question
      for (let i = 0; i < qState.answer.recordings.length; i++) {
        const recordingUrl = qState.answer.recordings[i];

        // Skip if already an S3 URL (already uploaded)
        if (isS3Url(recordingUrl)) {
          uploadedUrls.push(recordingUrl);
          continue;
        }

        try {
          console.log(`   Recording ${i + 1}/${qState.answer.recordings.length}...`);

          // Convert blob URL to file
          const response = await fetch(recordingUrl);
          const blob = await response.blob();
          console.log(`   ✅ Blob fetched. Size: ${blob.size} bytes`);

          // Upload directly to S3 using the complete workflow
          const uploadResult = await uploadAudioToS3Complete(
            examId,
            attemptIdRef.current,
            question._id || question.id,
            blob
          );

          console.log(`   ✅ Recording ${i + 1} uploaded successfully`);
          uploadedUrls.push(uploadResult.url);
        } catch (error) {
          console.error(`   ❌ Error uploading recording ${i + 1}:`, error.message);
          uploadSuccessful = false;
          // Keep the blob URL if upload fails, will retry on next navigation or at submission
          uploadedUrls.push(recordingUrl);
        }
      }

      // Update examStatus with uploaded S3 URLs
      if (uploadedUrls.length > 0) {
        const nextStatus = examStatus.map((q, idx) => {
          if (idx === questionIndex) {
            return {
              ...q,
              answer: {
                ...q.answer,
                recordings: uploadedUrls
              }
            };
          }
          return q;
        });
        setExamStatus(nextStatus);
        console.log(`✅ Audio upload complete for question ${questionIndex + 1}`);
        // Save progress with the newly uploaded S3 URLs
        await saveAnswerProgress(nextStatus);
      }
    } catch (error) {
      console.error(`❌ Unexpected error during audio upload:`, error);
      uploadSuccessful = false;
    } finally {
      setIsUploadingAudio(false);
    }

    // Return true to allow navigation even if upload fails (with warning)
    if (!uploadSuccessful) {
      console.warn(`⚠️ Some audio files failed to upload. They will be retried at submission.`);
    }
    return true; // Always allow navigation
  };

  const handleNavigation = async (index) => {
    // Prevent navigation while uploading
    if (isUploadingAudio) {
      console.log('⏳ Upload in progress, please wait...');
      return;
    }

    // Upload audio from current question before navigating
    if (currentQIndex !== index) {
      const canProceed = await uploadCurrentQuestionAudio(currentQIndex);
      if (!canProceed) return; // Should not happen but safety check

      // Save progress for text/MCQ/non-audio questions since they don't trigger upload
      const question = questions[currentQIndex];
      const isAudio = question && (question.type === 'viva' || question.type === 'interview');
      if (!isAudio || !examStatus[currentQIndex]?.answer || examStatus[currentQIndex]?.answer?.recordings?.length === 0) {
        saveAnswerProgress(examStatus);
      }
    }

    stopMediaStream();
    // REMOVED: SpeechSynthesis cleanup

    setCurrentQIndex(index);
    // Reset re-record count when switching questions (re-records are per question)
    setReRecordUsed(0);

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
      showAlertOnce("Microphone access was previously denied. Please check your browser settings and try again. NOTE: This feature requires a secure context (HTTPS or localhost).");
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
        showAlertOnce("Mic access denied. You must grant permission to record the answer. Please check your browser settings.");
      } else {
        showAlertOnce(`Error accessing audio media: ${err.name}. Check if your microphone is in use or if you are on a secure (HTTPS) connection.`);
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
    // Check re-record limit
    const allowedReRecords = examSummary?.allowedReRecords || 0;
    if (allowedReRecords > 0 && reRecordUsed >= allowedReRecords) {
      showAlertOnce(`You have reached the maximum re-record limit (${allowedReRecords}). You cannot discard any more recordings.`);
      return;
    }

    // Increment re-record count if discarding an existing recording
    if (currentRecordings.length > 0) {
      setReRecordUsed(prev => prev + 1);
    }

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


  const finalSubmitExam = async (opts = { redirect: true }) => {
    if (hasAutoSubmittedRef.current && isSubmitting) return; // Prevent duplicate submissions
    hasAutoSubmittedRef.current = true;
    setShowSubmitModal(false);
    setIsSubmitting(true);

    try {
      // Use existing attemptId or fail if missing
      const usedAttemptId = attemptIdRef.current || location.state?.attemptId;
      if (!usedAttemptId) {
        showAlertOnce('No valid exam attempt found. Please join the exam via the Join button.');
        setIsSubmitting(false);
        return;
      }

      // Build answers (MCQ and text only)
      const answers = [];
      const audioAnswers = []; // Collect audio answers separately

      const currentQuestions = questionsRef.current;
      const currentStatus = examStatusRef.current;

      for (let index = 0; index < currentQuestions.length; index++) {
        const question = currentQuestions[index];
        const status = currentStatus[index];

        if (!question || status.answer === null || status.answer === undefined) continue;

        // MCQ: send selectedOptionIndex
        if (question.type === 'mcq' && status.answer !== null) {
          answers.push({
            questionId: question._id || question.id,
            selectedOptionIndex: status.answer
          });
        }
        // Descriptive: send answerText
        else if (question.type !== 'mcq' && status.answer?.text) {
          answers.push({
            questionId: question._id || question.id,
            answerText: status.answer.text
          });
        }
        // Audio/Interview/Viva: save for separate upload
        else if ((question.type === 'viva' || question.type === 'interview') && status.answer?.recordings?.length > 0) {
          audioAnswers.push({
            questionId: question._id || question.id,
            recordings: status.answer.recordings
          });
        }
      }

      console.log(`📝 Submitting exam with ${answers.length} text/MCQ answers and ${audioAnswers.length} audio answers`);
      if (audioAnswers.length === 0) {
        console.warn(`⚠️ No audio answers collected. Check question types and recordings.`);
        console.log(`Debug info:`, currentStatus);
      }

      // Submit exam (text/MCQ answers only)
      const result = await submitExam(examId, {
        answers,
        attemptId: usedAttemptId,
        timeSpent: Math.round((3600 - remainingTimeRef.current) / 60), // in minutes
      });

      console.log(`✅ Exam submitted successfully. Attempt ID: ${result.submissionId}`);

      // Now upload audio files if any - DIRECT TO S3
      if (audioAnswers.length > 0) {
        console.log(`📤 Uploading ${audioAnswers.length} audio files directly to S3...`);
        let audioUploadCount = 0;

        for (const audioAnswer of audioAnswers) {
          console.log(`📤 Processing audio answer for question: ${audioAnswer.questionId}`);
          console.log(`   Recordings count: ${audioAnswer.recordings.length}`);

          for (let i = 0; i < audioAnswer.recordings.length; i++) {
            const recordingUrl = audioAnswer.recordings[i];
            console.log(`   🎙️ Recording ${i + 1}: ${recordingUrl.substring(0, 50)}...`);

            // Skip if already an S3 URL (already uploaded during navigation)
            if (isS3Url(recordingUrl)) {
              audioUploadCount++;
              continue;
            }

            try {
              // Convert blob URL to file
              const response = await fetch(recordingUrl);
              const blob = await response.blob();
              console.log(`   ✅ Blob fetched. Size: ${blob.size} bytes, Type: ${blob.type}`);

              // Upload directly to S3 using the complete workflow
              const uploadResult = await uploadAudioToS3Complete(
                examId,
                result.submissionId,
                audioAnswer.questionId,
                blob
              );

              audioUploadCount++;
              console.log(
                `   ✅ Uploaded audio for question ${audioAnswer.questionId}:`,
                uploadResult
              );
            } catch (error) {
              console.error(
                `❌ Error uploading audio for question ${audioAnswer.questionId}:`,
                error
              );
            }
          }
        }

        console.log(
          `✅ Audio upload complete: ${audioUploadCount}/${audioAnswers.length} uploaded`
        );
      }

      // Show success message
      showAlertOnce("Exam successfully submitted!");

      // Clear submitting state then redirect (unless caller opted out)
      setIsSubmitting(false);
      if (opts.redirect !== false) {
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      // Normalize error message (fetchAPI may throw plain objects)
      const errMsg = (error && (error.message || error.error || error.detail)) || JSON.stringify(error) || 'Please try again';
      showAlertOnce('Error submitting exam: ' + errMsg);
      setIsSubmitting(false);
      // After user-initiated final submit, still redirect out of exam page to avoid stuck state
      try { navigate('/student/dashboard'); } catch (e) { /* ignore */ }
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

          {/* Re-record limit display */}
          {examSummary?.allowedReRecords > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-700">
                Re-records: {reRecordUsed} / {examSummary.allowedReRecords} used
                {reRecordUsed >= examSummary.allowedReRecords && (
                  <span className="ml-2 text-red-600">(Limit reached)</span>
                )}
              </p>
            </div>
          )}

          {currentRecordings.length > 0 && (
            <div className="mt-6 border-t pt-4">
              {/* Separate view for uploaded S3 URLs vs blob URLs */}
              {(() => {
                const uploadedUrls = currentRecordings.filter(url => isS3Url(url));
                const pendingUrls = currentRecordings.filter(url => !isS3Url(url));

                return (
                  <>
                    {/* Already Uploaded Audio Section */}
                    {uploadedUrls.length > 0 && (
                      <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                        <div className="flex items-center mb-3">
                          <span className="text-2xl mr-2">✅</span>
                          <p className="font-bold text-green-700">Uploaded Audio ({uploadedUrls.length})</p>
                        </div>
                        <div className="space-y-2">
                          {uploadedUrls.map((url, idx) => (
                            <div key={`uploaded-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm font-semibold text-gray-600 min-w-24">Upload #{idx + 1}</span>
                                <audio
                                  controls
                                  src={url}
                                  className="flex-1 h-8"
                                  controlsList="nodownload"
                                  crossOrigin="anonymous"
                                  onError={() => console.error('Audio load error for:', url)}
                                  onLoadedMetadata={() => console.log('Audio loaded:', url)}
                                />
                              </div>
                              <span className="ml-2 text-xs text-green-600 font-semibold whitespace-nowrap">Uploaded</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Audio (Not yet uploaded) Section */}
                    {pendingUrls.length > 0 && (
                      <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <div className="flex items-center mb-3">
                          <span className="text-2xl mr-2">⏳</span>
                          <p className="font-bold text-yellow-700">Recording (Not Yet Uploaded) ({pendingUrls.length})</p>
                        </div>
                        <p className="text-sm text-yellow-600 mb-3">These will be uploaded when you move to the next question or submit the exam.</p>
                        <div className="space-y-2">
                          {pendingUrls.map((url, idx) => (
                            <div key={`pending-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-100">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm font-semibold text-gray-600 min-w-24">Record #{uploadedUrls.length + idx + 1}</span>
                                <audio
                                  controls
                                  src={url}
                                  className="flex-1 h-8"
                                  controlsList="nodownload"
                                  crossOrigin="anonymous"
                                  onError={() => console.error('Audio load error for:', url)}
                                  onLoadedMetadata={() => console.log('Audio loaded:', url)}
                                />
                              </div>
                              <span className="ml-2 text-xs text-yellow-600 font-semibold whitespace-nowrap animate-pulse">Pending...</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Section for Recording Management */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold text-gray-700 mb-3 text-sm">Manage Recordings:</p>
                      <div className="flex flex-wrap gap-3">
                        {currentRecordings.map((url, index) => {
                          const allowedReRecords = examSummary?.allowedReRecords || 0;
                          const canReRecord = allowedReRecords === 0 || reRecordUsed < allowedReRecords;
                          const isUploaded = isS3Url(url);

                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => setActiveAudio(index)}
                                className={`py-2 px-3 rounded-lg font-medium transition duration-200 border-2 text-sm ${activeAudioIndex === index
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                  : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'
                                  }`}
                              >
                                {isUploaded ? '✅' : '⏳'} #{index + 1} {activeAudioIndex === index && '(Active)'}
                              </button>
                              <button
                                onClick={() => removeSpecificRecording(index)}
                                disabled={!canReRecord}
                                title={canReRecord ? 'Remove Clip' : 'Re-record limit reached'}
                                className={`absolute top-[-8px] right-[-8px] ${canReRecord
                                  ? 'bg-red-500 hover:bg-red-700'
                                  : 'bg-gray-400 cursor-not-allowed'
                                  } text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center transition`}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
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
              newStatus[currentQIndex].status = e.target.value.trim() !== '' ? 'Answered' : 'Not Answered';
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
              Warning: You have <strong className="font-bold">{unansweredCount}</strong> questions not yet answered. Do you still wish to proceed with the submission?
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
    <div className="min-h-screen bg-gray-100 p-0 w-full">
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

      {/* --- Auto Submit Modal (shown when user switches away twice) --- */}
      {showAutoSubmitModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-red-600 mb-3">⚠️ Exam Auto-Submission</h3>
            <p className="mb-4 text-gray-700">You have switched away from the exam twice. Your answers are being submitted automatically.</p>
            {autoSubmitInProgress ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                <div className="text-sm text-gray-600">Submitting...</div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 mb-4">Submission complete. Click OK to return to your dashboard.</div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowAutoSubmitModal(false);
                  try { navigate('/student/dashboard'); } catch (e) { }
                }}
                disabled={autoSubmitInProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Start Exam Screen - Prompt for mic permission before starting --- */}
      {!isExamStarted && !loading && !error && questions.length > 0 && showStartPrompt && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 sm:p-10 text-center">
            <h1 className="text-2xl font-bold text-blue-700 mb-4">Ready to Start Your Exam</h1>
            <p className="text-gray-700 mb-4">This exam requires access to your microphone for audio answers. Please grant microphone permission before starting. You will be allowed to switch away from the exam only twice; being away for more than 10 seconds will auto-submit.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
              <button
                onClick={async () => {
                  try {
                    await requestMicrophonePermission();
                    if (mediaPermissionStatus === 'granted' || permissionRequestRef.current === 0) {
                      // permission granted (or request completed) - start exam
                      setShowStartPrompt(false);
                      startExam();
                    }
                  } catch (e) {
                    // permission was not granted - do not start
                  }
                }}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Grant Mic & Start
              </button>

              <button
                onClick={() => {
                  showAlertOnce('Microphone permission is required to take this exam. Please grant permission to proceed.');
                }}
                className="px-5 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-200"
              >
                I need help
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">If the permission prompt appears behind other windows, please bring it to front and allow microphone access.</p>
          </div>
        </div>
      )}

      {/* --- Top Bar: Timer and Progress --- */}
      {isExamStarted && (
        <div className="sticky top-0 z-20 bg-white shadow-md rounded-lg p-3 lg:p-4 mb-4 flex flex-col sm:flex-row justify-between items-center border-b-2 border-blue-500">
          <h1 className="text-lg lg:text-xl font-bold text-blue-700 mb-2 sm:mb-0">Exam Viewer</h1>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="text-center">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Remaining Time</p>
              <p className={`text-lg lg:text-2xl font-bold ${remainingTime <= 300 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                {formatTime(remainingTime)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Total Marks</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">
                {totalMarks}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Progress</p>
              <div className="w-24 lg:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] lg:text-xs text-center text-gray-600 mt-0.5">{progressPercent}% Completed</p>
            </div>
            <div className="flex items-center gap-2">
              {mediaPermissionStatus === 'granted' ? (
                <div className="text-xs text-green-600 font-semibold">Mic: Enabled</div>
              ) : mediaPermissionStatus === 'denied' ? (
                <button onClick={() => requestMicrophonePermission()} className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-md border border-red-100 hover:bg-red-100">Enable Mic</button>
              ) : (
                <button onClick={() => requestMicrophonePermission()} className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100 hover:bg-blue-100">Enable Mic</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showTopWarning && (
        <div className="fixed top-20 left-0 right-0 z-30 flex justify-center pointer-events-auto">
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-3 rounded-md shadow-md max-w-3xl mx-4 flex items-center justify-between">
            <div className="text-sm">{topWarning}</div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissTopWarning(); }}
              aria-label="Dismiss warning"
              className="ml-4 text-yellow-800 font-bold px-3 py-1 rounded hover:bg-yellow-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!loading && !error && questions.length > 0 && isExamStarted && (
        <div className="flex flex-col lg:flex-row gap-4 p-4 lg:p-6 min-h-screen">
          {/* --- Main Content Area: Question Display --- */}
          <div
            className="lg:w-3/4 w-full bg-white p-5 lg:p-8 rounded-xl shadow-lg border border-blue-100"
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

                <div className="mb-6 p-6 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
                  {/* Question Text */}
                  <div className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <span className="flex-1">{currentQuestion?.text}</span>

                    <div className="flex-shrink-0 flex gap-2">
                      {isPlaying ? (
                        <button
                          onClick={() => {
                            if (audioRef.current) {
                              try {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                              } catch (e) { }
                            }
                            if (window.speechSynthesis) {
                              window.speechSynthesis.cancel();
                            }
                            setIsPlaying(false);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-bold rounded-full shadow-md shadow-red-200 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
                          </svg>
                          Stop Listening
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              // If a generated TTS audio URL exists, play it via the shared audio element
                              if (currentQuestion?.ttsAudioUrl) {
                                const src = currentQuestion.ttsAudioUrl.startsWith('http')
                                  ? currentQuestion.ttsAudioUrl
                                  : `http://localhost:3001${currentQuestion.ttsAudioUrl}`;
                                if (audioRef.current) {
                                  audioRef.current.src = src;
                                  audioRef.current.onended = () => setIsPlaying(false);
                                  await audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { });
                                }
                              }
                              // Otherwise fallback to Web Speech API (browser TTS)
                              else if (window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                                const utter = new SpeechSynthesisUtterance(currentQuestion?.text || '');
                                utter.rate = 1;
                                utter.pitch = 1;
                                utter.onend = () => setIsPlaying(false);
                                window.speechSynthesis.speak(utter);
                                setIsPlaying(true);
                              }
                            } catch (err) {
                              console.warn('TTS play failed', err);
                            }
                          }}
                          disabled={!(currentQuestion?.ttsAudioUrl || (typeof window !== 'undefined' && window.speechSynthesis))}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-full shadow-md shadow-blue-200 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5"
                          >
                            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                            <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 4.5 4.5 0 0 1 0 6.364.75.75 0 0 1-1.06-1.06 3 3 0 0 0 0-4.242.75.75 0 0 1 0-1.062Z" />
                          </svg>
                          Listen Question
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <MultimediaDisplay multimedia={currentQuestion?.media} />

                <div className="mt-8 p-4 border-t pt-6">
                  {renderQuestionBody()}
                </div>

                {/* --- Bottom Navigation --- */}
                <div className="mt-10 pt-6 border-t flex justify-between">
                  <button
                    onClick={() => handleNavigation(currentQIndex - 1)}
                    disabled={currentQIndex === 0 || isUploadingAudio}
                    className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {isUploadingAudio && currentQIndex > 0 ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                        Uploading...
                      </>
                    ) : (
                      <>&larr; Previous</>
                    )}
                  </button>

                  <div className="space-x-4">
                    <button
                      onClick={() => handleStatusChange(currentQState.status === 'Marked for Review' ? 'Answered' : 'Marked for Review')}
                      disabled={isUploadingAudio}
                      className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${currentQState.status === 'Marked for Review'
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {currentQState.status === 'Marked for Review' ? 'Unmark for Review' : '🚩 Mark for Review'}
                    </button>
                  </div>

                  <button
                    onClick={() => currentQIndex === totalQuestions - 1 ? setShowSubmitModal(true) : handleNavigation(currentQIndex + 1)}
                    disabled={isUploadingAudio}
                    className={`px-6 py-2 font-semibold rounded-lg shadow-md transition flex items-center gap-2 ${currentQIndex === totalQuestions - 1
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isUploadingAudio ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Uploading...
                      </>
                    ) : (
                      currentQIndex === totalQuestions - 1 ? 'Submit Exam' : 'Next Question →'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* --- Sidebar: Question Status Tracking --- */}
          <div className="lg:w-1/4 w-full">
            <div className="sticky top-4 bg-white p-5 lg:p-6 rounded-xl shadow-lg border border-blue-100">
              <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-4 border-b border-blue-100 pb-2">Question Panel</h3>
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

            </div>
          </div>
        </div>
      )}
      <audio ref={audioRef} preload="auto" />

    </div>
  );
};

export default TakeExamView;

// make question asker batter ?
