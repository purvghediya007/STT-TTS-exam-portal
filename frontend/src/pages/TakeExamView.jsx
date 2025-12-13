// // import React, { useState, useEffect } from 'react'
// // import { useParams, useNavigate, useLocation } from 'react-router-dom'
// // import { AlertCircle } from 'lucide-react'
// // import TakeExamHeader from '../components/exam/TakeExamHeader'
// // import QuestionCard from '../components/exam/QuestionCard'
// // import RecorderPanel from '../components/exam/RecorderPanel'
// // import QuestionNavigator from '../components/exam/QuestionNavigator'
// // import ActionBar from '../components/exam/ActionBar'
// // import { getExamSummary, fetchExamQuestions, submitExam } from '../services/api'
// // import { useCountdown } from '../hooks/useCountdown'

// // /**
// //  * TakeExamView - Page for students to take an exam
// //  */
// // export default function TakeExamView() {
// //   const { examId } = useParams()
// //   const navigate = useNavigate()
// //   const location = useLocation()
// //   const [examSummary, setExamSummary] = useState(null)
// //   const [questions, setQuestions] = useState([])
  
// //   const [mediaAnswers, setMediaAnswers] = useState({})
// //   const [recording, setRecording] = useState(false)
// //   const [recorder, setRecorder] = useState(null)
// //   const [stream, setStream] = useState(null)
// //   const [chunks, setChunks] = useState([])
// //   const [reRecords, setReRecords] = useState({})
// //   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
// //   const [loading, setLoading] = useState(true)
// //   const [submitting, setSubmitting] = useState(false)
// //   const [error, setError] = useState(null)
// //   const [startTime] = useState(new Date())
// //   const [attemptId] = useState(location.state?.attemptId || `ATT-${Date.now()}`)

// //   // Load exam data
// //   useEffect(() => {
// //     const loadExam = async () => {
// //       try {
// //         const [summary, questionsData] = await Promise.all([
// //           getExamSummary(examId),
// //           fetchExamQuestions(examId)
// //         ])
// //         setExamSummary(summary)
// //         const loadedQuestions = questionsData.questions || []
// //         console.log('Loaded questions:', loadedQuestions.length, 'questions')
// //         console.log('Question types:', loadedQuestions.map(q => ({ id: q.id, type: q.type, hasOptions: !!q.options })))
        
// //         // Ensure all questions are properly formatted
// //         const formattedQuestions = loadedQuestions.map((q, index) => ({
// //           id: q.id || `Q${index + 1}`,
// //           type: q.type || 'viva',
// //           question: q.question || '',
// //           points: q.points || 1,
// //           media: q.media || null
// //         }))
        
// //         setQuestions(formattedQuestions)
// //       } catch (err) {
// //         console.error('Error loading exam:', err)
// //         setError(err?.message || 'Failed to load exam')
// //       } finally {
// //         setLoading(false)
// //       }
// //     }
// //     loadExam()
// //   }, [examId])

// //   // Timer for exam duration
// //   const examEndTime = examSummary 
// //     ? new Date(new Date(startTime).getTime() + (examSummary.durationMin * 60 * 1000))
// //     : null

// //   const { formatted: timeRemaining, expired: timeExpired } = useCountdown(
// //     examEndTime?.toISOString(),
// //     () => {
// //       // Auto-submit when time expires
// //       if (!submitting) {
// //         handleSubmit()
// //       }
// //     }
// //   )

  

// //   const startCamera = async () => {
// //     try {
// //       const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
// //       setStream(media)
// //       const mr = new MediaRecorder(media)
// //       mr.ondataavailable = (e) => {
// //         if (e.data && e.data.size > 0) {
// //           setChunks(prev => [...prev, e.data])
// //         }
// //       }
// //       mr.onstop = async () => {
// //         const blob = new Blob(chunks, { type: 'video/webm' })
// //         const reader = new FileReader()
// //         reader.onloadend = () => {
// //           const qid = questions[currentQuestionIndex]?.id
// //           if (qid) {
// //             setMediaAnswers(prev => ({ ...prev, [qid]: reader.result }))
// //           }
// //           setChunks([])
// //         }
// //         reader.readAsDataURL(blob)
// //       }
// //       setRecorder(mr)
// //     } catch (err) {
// //       setError(err?.message || 'Failed to access camera/microphone')
// //     }
// //   }

// //   const startRecording = () => {
// //     if (!recorder) return
// //     setRecording(true)
// //     recorder.start()
// //     const seconds = examSummary?.timePerQuestionSec
// //     if (seconds && seconds > 0) {
// //       setTimeout(() => {
// //         stopRecording()
// //       }, seconds * 1000)
// //     }
// //   }

// //   const stopRecording = () => {
// //     if (!recorder) return
// //     setRecording(false)
// //     recorder.stop()
// //   }

// //   const discardRecording = () => {
// //     const qid = questions[currentQuestionIndex]?.id
// //     if (!qid) return
// //     const used = reRecords[qid] || 0
// //     const limit = examSummary?.allowedReRecords || 0
// //     if (used >= limit) {
// //       alert('Re-record limit reached')
// //       return
// //     }
// //     setMediaAnswers(prev => ({ ...prev, [qid]: undefined }))
// //     setReRecords(prev => ({ ...prev, [qid]: used + 1 }))
// //   }

// //   const handleNext = () => {
// //     if (currentQuestionIndex < questions.length - 1) {
// //       setCurrentQuestionIndex(currentQuestionIndex + 1)
// //     }
// //   }

// //   const handlePrevious = () => {
// //     if (currentQuestionIndex > 0) {
// //       setCurrentQuestionIndex(currentQuestionIndex - 1)
// //     }
// //   }

// //   const handleSubmit = async () => {
// //     if (submitting) return

// //     const unanswered = questions.filter(q => {
// //       const v = mediaAnswers[q.id]
// //       return v == null || v === ''
// //     })
// //     if (unanswered.length > 0 && !confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
// //       return
// //     }

// //     setSubmitting(true)
// //     try {
// //       const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000 / 60) // minutes
// //       const result = await submitExam(examId, {
// //         answers: {},
// //         attemptId,
// //         startedAt: startTime.toISOString(),
// //         timeSpent,
// //         studentId: 'STU001',
// //         mediaAnswers
// //       })

// //       // Navigate to results
// //       navigate(`/student/exams/${examId}/results`, {
// //         state: {
// //           score: result.score,
// //           maxScore: result.maxScore,
// //           percentage: result.percentage,
// //           submissionId: result.submissionId
// //         }
// //       })
// //     } catch (err) {
// //       setError(err?.message || 'Failed to submit exam')
// //       setSubmitting(false)
// //     }
// //   }

// //   if (loading) {
// //     return (
// //       <div className="flex items-center justify-center h-screen">
// //         <div className="text-gray-500">Loading exam...</div>
// //       </div>
// //     )
// //   }

// //   if (error || !examSummary) {
// //     return (
// //       <div className="flex items-center justify-center h-screen">
// //         <div className="text-center">
// //           <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
// //           <p className="text-red-600">{error || 'Exam not found'}</p>
// //           <button
// //             onClick={() => navigate('/student/dashboard')}
// //             className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
// //           >
// //             Go Back
// //           </button>
// //         </div>
// //       </div>
// //     )
// //   }

// //   const currentQuestion = questions[currentQuestionIndex]
// //   const answeredCount = Object.keys(mediaAnswers).filter(key => {
// //     const v = mediaAnswers[key]
// //     return v != null && v !== ''
// //   }).length

// //   return (
// //     <div className="min-h-screen bg-gray-50">
// //       {/* Header */}
// //       <TakeExamHeader
// //         title={examSummary.title}
// //         currentIndex={currentQuestionIndex}
// //         totalQuestions={questions.length}
// //         timeRemaining={timeRemaining}
// //         timeExpired={timeExpired}
// //         answeredCount={answeredCount}
// //         totalPoints={questions.reduce((sum, q) => sum + (q.points || 1), 0)}
// //         onBack={() => navigate('/student/available')}
// //       />

// //       {/* Main Content */}
// //       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
// //         {questions.length === 0 ? (
// //           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
// //             <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
// //             <p className="text-gray-600">No questions available for this exam.</p>
// //           </div>
// //         ) : currentQuestion ? (
// //           <>
// //             <QuestionCard question={currentQuestion} index={currentQuestionIndex} total={questions.length} />
// //             <RecorderPanel
// //               stream={stream}
// //               recording={recording}
// //               hasRecording={Boolean(mediaAnswers[currentQuestion.id])}
// //               startCamera={startCamera}
// //               startRecording={startRecording}
// //               stopRecording={stopRecording}
// //               discardRecording={discardRecording}
// //               reRecordUsed={reRecords[currentQuestion.id] || 0}
// //               reRecordLimit={examSummary?.allowedReRecords || 0}
// //               previewSrc={mediaAnswers[currentQuestion.id]}
// //             />
// //           </>
// //         ) : (
// //           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
// //             <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
// //             <p className="text-gray-600">Question not found.</p>
// //           </div>
// //         )}

// //         {/* Navigation */}
// //         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
// //           <QuestionNavigator
// //             questions={questions}
// //             currentIndex={currentQuestionIndex}
// //             mediaAnswers={mediaAnswers}
// //             onSelect={setCurrentQuestionIndex}
// //             answeredCount={answeredCount}
// //           />

// //           <ActionBar
// //             onPrevious={handlePrevious}
// //             onNext={handleNext}
// //             onSubmit={handleSubmit}
// //             disablePrevious={currentQuestionIndex === 0}
// //             isLast={currentQuestionIndex === questions.length - 1}
// //             submitting={submitting}
// //             timeExpired={timeExpired}
// //             currentIndex={currentQuestionIndex}
// //             total={questions.length}
// //           />
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// import React, { useState, useEffect, useRef } from 'react';
// // Assuming you have access to Tailwind CSS classes globally

// // --- Mock Data Structure (Same as before) ---
// const mockExamData = [
//   { id: 1, type: 'MCQ', questionText: 'Which of the following elements is a noble gas?', marks: 2, options: ['Oxygen', 'Nitrogen', 'Argon', 'Chlorine'], multimedia: null },
//   { id: 2, type: 'VIVA', questionText: 'Explain the principle of operation for a four-stroke engine.', marks: 10, multimedia: { type: 'image', url: 'https://via.placeholder.com/400x200?text=Engine+Diagram' } },
//   { id: 3, type: 'MCQ', questionText: 'The graph below shows the relationship between tension and extension in a spring. What law does it demonstrate?', marks: 3, options: ['Newton\'s Second Law', 'Hooke\'s Law', 'Ohm\'s Law', 'Boyle\'s Law'], multimedia: { type: 'graph', url: 'https://via.placeholder.com/400x200?text=Spring+Graph' } },
//   { id: 4, type: 'INTERVIEW', questionText: 'Describe a complex project you managed and how you handled a major challenge.', marks: 15, multimedia: { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' } },
// ];

// const initialExamState = mockExamData.map(q => ({
//   id: q.id,
//   status: 'Not Answered', 
//   answer: q.type === 'MCQ' ? null : null, // For Viva/Interview, this will store the Blob URL
// }));

// // --- Helper Components (Same as before) ---
// const QuestionStatusItem = ({ id, status, onClick }) => {
//   let bgColor;
//   let text;
//   switch (status) {
//     case 'Answered':
//       bgColor = 'bg-green-500 hover:bg-green-600';
//       text = '✅';
//       break;
//     case 'Marked for Review':
//       bgColor = 'bg-yellow-500 hover:bg-yellow-600';
//       text = '🚩';
//       break;
//     default:
//       bgColor = 'bg-gray-400 hover:bg-gray-500';
//       text = '❌';
//   }
//   return (
//     <button
//       onClick={() => onClick(id)}
//       className={`${bgColor} text-white font-bold w-10 h-10 rounded flex items-center justify-center transition duration-200 shadow-md`}
//       title={`${status} (Q${id})`}
//     >
//       {id}
//     </button>
//   );
// };

// const MultimediaDisplay = ({ multimedia }) => {
//   if (!multimedia) return null;
//   const { type, url } = multimedia;
//   return (
//     <div className="my-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//       <p className="text-sm font-semibold text-gray-600 mb-2">{type.toUpperCase()} Context:</p>
//       {type === 'image' || type === 'graph' ? (
//         <img src={url} alt={`${type} context`} className="max-w-full h-auto rounded-md shadow-sm mx-auto" />
//       ) : (
//         <div className="aspect-video">
//           <iframe
//             src={url}
//             title="Video Context"
//             className="w-full h-full rounded-md"
//             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//             allowFullScreen
//           ></iframe>
//         </div>
//       )}
//     </div>
//   );
// };


// // --- Main Component ---
// const TakeExamView = () => {
//   const [currentQIndex, setCurrentQIndex] = useState(0);
//   const [examStatus, setExamStatus] = useState(initialExamState);
//   const [remainingTime, setRemainingTime] = useState(3600);
  
//   // New state for recording
//   const [isRecording, setIsRecording] = useState(false);
//   const [videoAnswer, setVideoAnswer] = useState(null); // Stores the Blob URL
//   const [isStreamActive, setIsStreamActive] = useState(false); // Tracks if camera is on

//   // Refs for media
//   const videoRef = useRef(null);
//   const mediaRecorderRef = useRef(null);
//   const recordedChunks = useRef([]);


//   const currentQuestion = mockExamData[currentQIndex];
//   const currentQState = examStatus[currentQIndex];
//   const totalQuestions = mockExamData.length;
//   const progressPercent = Math.round((examStatus.filter(q => q.status !== 'Not Answered').length / totalQuestions) * 100);

//   // --- Timer Effect (Same as before) ---
//   useEffect(() => {
//     if (remainingTime <= 0) return;
//     const timer = setInterval(() => {
//       setRemainingTime(prevTime => prevTime - 1);
//     }, 1000);
//     return () => clearInterval(timer);
//   }, [remainingTime]);

//   const formatTime = (seconds) => {
//     const h = Math.floor(seconds / 3600);
//     const m = Math.floor((seconds % 3600) / 60);
//     const s = seconds % 60;
//     return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
//   };

//   // --- Handlers (Same as before, updated video state management) ---

//   const handleStatusChange = (status) => {
//     setExamStatus(prevStatus => prevStatus.map((q, index) =>
//       index === currentQIndex ? { ...q, status: status } : q
//     ));
//   };

//   const handleMCQSelect = (optionIndex) => {
//     setExamStatus(prevStatus => prevStatus.map((q, index) =>
//       index === currentQIndex ? { ...q, answer: optionIndex, status: 'Answered' } : q
//     ));
//   };

//   const handleNavigation = (index) => {
//     // Clean up current video stream/recorder before navigating
//     stopMediaStream(); 
    
//     setCurrentQIndex(index);
//     // Load video answer for the new question if it exists
//     setVideoAnswer(examStatus[index].answer);
//   };
  
//   const stopMediaStream = () => {
//     if (videoRef.current && videoRef.current.srcObject) {
//       videoRef.current.srcObject.getTracks().forEach(track => track.stop());
//       videoRef.current.srcObject = null;
//     }
//     setIsRecording(false);
//     setIsStreamActive(false);
//   };

//   // --- Video Recording Logic (WORKING MODE) ---

//   const startRecording = async () => {
//     try {
//       // 1. Get media stream (permission requested here)
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
//       // 2. Attach stream to video element for live preview
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         videoRef.current.play();
//       }
      
//       // 3. Initialize Media Recorder
//       recordedChunks.current = [];
//       const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
//       const recorder = new MediaRecorder(stream, { mimeType });

//       recorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           recordedChunks.current.push(event.data);
//         }
//       };

//       recorder.onstop = () => {
//         // Handle recorded data when recording stops
//         const blob = new Blob(recordedChunks.current, { type: mimeType });
//         const videoURL = URL.createObjectURL(blob);
        
//         setVideoAnswer(videoURL);
        
//         // Update exam status
//         setExamStatus(prevStatus => prevStatus.map((q, index) =>
//             index === currentQIndex ? { ...q, answer: videoURL, status: 'Answered' } : q
//         ));
        
//         // Stop the live camera stream
//         stopMediaStream();
//       };
      
//       mediaRecorderRef.current = recorder;
//       recorder.start();

//       setIsRecording(true);
//       setIsStreamActive(true);
//       setVideoAnswer(null); // Clear previous video while recording
      
//     } catch (err) {
//       alert('Camera/Mic access denied. Please allow permissions to record the answer.');
//       console.error('Error accessing media devices:', err);
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//     }
//   };

//   const removeRecording = () => {
//     if (videoAnswer) {
//       URL.revokeObjectURL(videoAnswer); // Free up memory
//     }
//     setVideoAnswer(null);
//     setExamStatus(prevStatus => prevStatus.map((q, index) =>
//       index === currentQIndex ? { ...q, answer: null, status: 'Not Answered' } : q
//     ));
//     stopMediaStream();
//   };

//   const reRecord = () => {
//     removeRecording();
//     startRecording();
//   }

//   // --- Conditional Question Renderer ---

//   const renderQuestionBody = () => {
//     const currentAnswer = examStatus[currentQIndex].answer;

//     if (currentQuestion.type === 'MCQ') {
//       return (
//         <div className="space-y-3">
//           {currentQuestion.options.map((option, index) => (
//             <div
//               key={index}
//               className={`p-3 border rounded-lg cursor-pointer transition duration-150 ${
//                 currentAnswer === index
//                   ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500'
//                   : 'bg-white hover:bg-gray-50 border-gray-300'
//               }`}
//               onClick={() => handleMCQSelect(index)}
//             >
//               <span className="font-mono text-sm mr-3 text-blue-600">{String.fromCharCode(65 + index)}.</span>
//               <span className="text-gray-800">{option}</span>
//             </div>
//           ))}
//         </div>
//       );
//     }

//     if (currentQuestion.type === 'VIVA' || currentQuestion.type === 'INTERVIEW') {
//       return (
//         <div className="space-y-4">
//           <div className="flex justify-center items-center aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
//             {/* Display the live camera stream during recording */}
//             <video
//               ref={videoRef}
//               className={`w-full h-full object-cover ${!isStreamActive && 'hidden'}`}
//               autoPlay
//               muted // Mute for self-preview
//               playsInline
//             />
            
//             {/* Display the recorded video for playback */}
//             {videoAnswer && !isStreamActive && (
//                 <video
//                     controls
//                     src={videoAnswer}
//                     className="w-full h-full object-contain"
//                 />
//             )}

//             {/* Status overlays */}
//             {!isStreamActive && !videoAnswer && (
//               <div className="text-white text-lg absolute inset-0 flex items-center justify-center">
//                 Click 'Record Video Answer' to begin.
//               </div>
//             )}
//              {isRecording && (
//                 <div className="absolute top-4 left-4 bg-red-600 text-white text-sm font-bold py-1 px-3 rounded-full animate-pulse flex items-center">
//                     <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
//                     RECORDING
//                 </div>
//             )}
//           </div>

//           <div className="flex justify-center space-x-4 pt-2">
//             {!videoAnswer && !isRecording && (
//               <button
//                 onClick={startRecording}
//                 className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 flex items-center"
//               >
//                 <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
//                 Record Video Answer
//               </button>
//             )}

//             {isRecording && (
//               <button
//                 onClick={stopRecording}
//                 className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 flex items-center"
//               >
//                 <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" /></svg>
//                 Stop Recording
//               </button>
//             )}

//             {videoAnswer && !isRecording && (
//               <>
//                 <button
//                   onClick={reRecord}
//                   className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200"
//                 >
//                   Re-Record
//                 </button>
//                 <button
//                   onClick={removeRecording}
//                   className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200"
//                 >
//                   Remove
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       );
//     }

//     return <p className="text-red-500">Error: Unknown question type.</p>;
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
//       {/* --- Top Bar: Timer and Progress --- */}
//       <div className="sticky top-0 z-20 bg-white shadow-lg rounded-xl p-4 mb-6 flex justify-between items-center border-t-4 border-blue-600">
//         <h1 className="text-2xl font-extrabold text-blue-700">Exam View</h1>
//         <div className="flex items-center space-x-6">
//           <div className="text-center">
//             <p className="text-sm font-medium text-gray-500">Remaining Time</p>
//             <p className={`text-2xl font-bold ${remainingTime <= 300 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
//               {formatTime(remainingTime)}
//             </p>
//           </div>
//           <div className="hidden sm:block">
//             <p className="text-sm font-medium text-gray-500">Progress</p>
//             <div className="w-32 bg-gray-200 rounded-full h-2.5">
//               <div
//                 className="bg-blue-600 h-2.5 rounded-full"
//                 style={{ width: `${progressPercent}%` }}
//               ></div>
//             </div>
//             <p className="text-xs text-center text-gray-600 mt-1">{progressPercent}% Completed</p>
//           </div>
//         </div>
//       </div>
//       {/*  */}

//       <div className="flex flex-col lg:flex-row gap-6">
//         {/* --- Main Content Area: Question Display --- */}
//         <div className="lg:w-3/4 w-full bg-white p-6 rounded-xl shadow-xl">
//           <header className="mb-6 pb-4 border-b">
//             <div className="flex justify-between items-center">
//               <h2 className="text-lg font-semibold text-gray-700">
//                 Question {currentQIndex + 1} of {totalQuestions}
//               </h2>
//               <span className="text-xl font-bold text-green-600">
//                 Marks: {currentQuestion.marks}
//               </span>
//             </div>
//           </header>

//           <div className="text-xl font-medium text-gray-900 mb-4 leading-relaxed">
//             {currentQuestion.questionText}
//           </div>

//           <MultimediaDisplay multimedia={currentQuestion.multimedia} />

//           <div className="mt-8 p-4 border-t pt-6">
//             {renderQuestionBody()}
//           </div>

//           {/* --- Bottom Navigation --- */}
//           <div className="mt-10 pt-6 border-t flex justify-between">
//             <button
//               onClick={() => handleNavigation(currentQIndex - 1)}
//               disabled={currentQIndex === 0}
//               className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 disabled:opacity-50 transition"
//             >
//               &larr; Previous
//             </button>

//             <div className="space-x-4">
//               <button
//                 onClick={() => handleStatusChange(currentQState.status === 'Marked for Review' ? 'Answered' : 'Marked for Review')}
//                 className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${
//                   currentQState.status === 'Marked for Review'
//                     ? 'bg-yellow-600 text-white hover:bg-yellow-700'
//                     : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
//                 }`}
//               >
//                 {currentQState.status === 'Marked for Review' ? 'Unmark for Review' : '🚩 Mark for Review'}
//               </button>
//             </div>

//             <button
//               onClick={() => currentQIndex === totalQuestions - 1 ? alert("Final Submission Modal") : handleNavigation(currentQIndex + 1)}
//               className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${
//                 currentQIndex === totalQuestions - 1
//                   ? 'bg-green-600 text-white hover:bg-green-700'
//                   : 'bg-blue-600 text-white hover:bg-blue-700'
//               }`}
//             >
//               {currentQIndex === totalQuestions - 1 ? 'Submit Exam' : 'Next Question \u2192'}
//             </button>
//           </div>
//         </div>

//         {/* --- Sidebar: Question Status Tracking --- */}
//         <div className="lg:w-1/4 w-full">
//           <div className="sticky top-[100px] bg-white p-6 rounded-xl shadow-xl">
//             <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Question Panel</h3>
//             <div className="grid grid-cols-5 gap-3">
//               {examStatus.map(q => (
//                 <QuestionStatusItem
//                   key={q.id}
//                   id={q.id}
//                   status={q.status}
//                   onClick={id => handleNavigation(id - 1)}
//                 />
//               ))}
//             </div>

//             <div className="mt-6 pt-4 border-t space-y-2 text-sm">
//               <p className="flex items-center">
//                 <span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span>
//                 Answered: {examStatus.filter(q => q.status === 'Answered').length}
//               </p>
//               <p className="flex items-center">
//                 <span className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></span>
//                 Review: {examStatus.filter(q => q.status === 'Marked for Review').length}
//               </p>
//               <p className="flex items-center">
//                 <span className="w-4 h-4 bg-gray-400 rounded-full mr-2"></span>
//                 Not Answered: {examStatus.filter(q => q.status === 'Not Answered').length}
//               </p>
//             </div>
            
//             <button 
//                 onClick={() => document.documentElement.requestFullscreen()} 
//                 className="mt-6 w-full py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition"
//             >
//                 Enter Full-Screen Mode
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TakeExamView;


import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Mock Data Structure (15 Questions - Same as before) ---
const mockExamData = [
    { id: 1, type: 'MCQ', questionText: 'What is the primary function of the mitochondria in a eukaryotic cell?', marks: 2, options: ['Protein synthesis', 'Energy production', 'Waste disposal', 'Genetic replication'], multimedia: null },
    { id: 2, type: 'VIVA', questionText: 'Explain the concept of polymorphism in Object-Oriented Programming (OOP) with a real-world example.', marks: 8, multimedia: null },
    { id: 3, type: 'MCQ', questionText: 'Which equation represents the relationship between voltage (V), current (I), and resistance (R)?', marks: 3, options: ['P = IV', 'E = mc²', 'V = IR', 'F = ma'], multimedia: { type: 'graph', url: 'https://via.placeholder.com/400x200?text=Circuit+Diagram' } },
    { id: 4, type: 'INTERVIEW', questionText: 'Walk me through your problem-solving process when facing a complex algorithmic challenge.', marks: 12, multimedia: null },
    { id: 5, type: 'MCQ', questionText: 'What is the chemical formula for Methane?', marks: 2, options: ['C₂H₆', 'CH₄', 'CO₂', 'H₂O'], multimedia: null },
    { id: 6, type: 'VIVA', questionText: 'Describe the main components and flow of a typical HTTP request and response cycle.', marks: 7, multimedia: null },
    { id: 7, type: 'MCQ', questionText: 'Who formulated the theory of relativity?', marks: 1, options: ['Isaac Newton', 'Galileo Galilei', 'Albert Einstein', 'Stephen Hawking'], multimedia: null },
    { id: 8, type: 'INTERVIEW', questionText: 'Discuss a time when you received critical feedback and how you acted on it.', marks: 10, multimedia: null },
    { id: 9, type: 'MCQ', questionText: 'The process of a solid turning directly into a gas is called:', marks: 3, options: ['Evaporation', 'Condensation', 'Sublimation', 'Deposition'], multimedia: null },
    { id: 10, type: 'VIVA', questionText: 'Demonstrate the difference between synchronous and asynchronous code execution in JavaScript.', marks: 9, multimedia: { type: 'image', url: 'https://via.placeholder.com/400x200?text=Code+Flow+Example' } },
    { id: 11, type: 'MCQ', questionText: 'Which planet is known as the "Red Planet"?', marks: 2, options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], multimedia: null },
    { id: 12, type: 'INTERVIEW', questionText: 'What are your career goals for the next five years, and how does this subject fit into them?', marks: 15, multimedia: null },
    { id: 13, type: 'MCQ', questionText: 'The concept of "State" in React is primarily used for:', marks: 4, options: ['Styling components', 'Managing internal data changes', 'Server-side rendering', 'Routing'], multimedia: null },
    { id: 14, type: 'VIVA', questionText: 'Explain the function of a firewall in network security and how it works.', marks: 6, multimedia: null },
    { id: 15, type: 'MCQ', questionText: 'What is the capital city of Australia?', marks: 1, options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], multimedia: null },
];

const initialExamState = mockExamData.map(q => ({
    id: q.id,
    status: 'Not Answered', 
    answer: q.type === 'MCQ' ? null : { recordings: [], activeIndex: null }, 
}));

// --- Helper Components ---

// UPDATED: Added isCurrent prop
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
    if (!multimedia) return null;
    const { type, url } = multimedia;
    const aspectClass = type === 'video' ? 'aspect-video' : '';
    return (
      <div className="my-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm font-semibold text-gray-600 mb-2">{type.toUpperCase()} Context:</p>
        {type === 'image' || type === 'graph' ? (
          <img src={url} alt={`${type} context`} className="max-w-full h-auto rounded-md shadow-sm mx-auto" />
        ) : (
          <div className={`${aspectClass}`}>
            <iframe
              src={url}
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
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [examStatus, setExamStatus] = useState(initialExamState);
  const [remainingTime, setRemainingTime] = useState(3600);
  
  const [isRecording, setIsRecording] = useState(false);
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState('pending'); 
  const [showSubmitModal, setShowSubmitModal] = useState(false); 
  const [isStreamActive, setIsStreamActive] = useState(false); 
  
  // NEW: State for Text-to-Speech
  const [isSpeaking, setIsSpeaking] = useState(false); 

  // Refs for media and focus
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const questionContentRef = useRef(null);

  const currentQuestion = mockExamData[currentQIndex];
  const currentQState = examStatus[currentQIndex];
  const totalQuestions = mockExamData.length;
  const progressPercent = Math.round((examStatus.filter(q => q.status !== 'Not Answered').length / totalQuestions) * 100);

  // --- Derived State for Video Question ---
  const isVideoQuestion = currentQuestion.type === 'VIVA' || currentQuestion.type === 'INTERVIEW';
  const currentRecordings = isVideoQuestion ? currentQState.answer.recordings : [];
  const activeVideoIndex = isVideoQuestion ? currentQState.answer.activeIndex : null;
  const activeVideoURL = activeVideoIndex !== null ? currentRecordings[activeVideoIndex] : null;
  const currentVideoPreviewURL = isStreamActive ? null : activeVideoURL;


  // --- Timer & Security Effects (Same as before) ---
  useEffect(() => {
    if (remainingTime <= 0) {
      alert("Time is up! The exam will now be submitted automatically.");
      // If time runs out, ensure speech is stopped
      if (window.speechSynthesis) window.speechSynthesis.cancel(); 
      return;
    }
    const timer = setInterval(() => {
      setRemainingTime(prevTime => prevTime - 1);
    }, 1000);
    return () => {
      clearInterval(timer);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
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

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- NEW: Text-to-Speech Handler ---

  const handleReadQuestion = () => {
    const synth = window.speechSynthesis;
    
    if (!synth) {
      alert("Your browser does not support Text-to-Speech.");
      return;
    }

    if (synth.speaking) {
      synth.cancel(); // Stop if already speaking
      setIsSpeaking(false);
      return;
    }
    
    // Construct the full text to read
    const textToRead = `Question number ${currentQuestion.id}. ${currentQuestion.questionText}. Marks: ${currentQuestion.marks}.`;
    
    const utterThis = new SpeechSynthesisUtterance(textToRead);
    
    utterThis.onstart = () => setIsSpeaking(true);
    utterThis.onend = () => setIsSpeaking(false);
    utterThis.onerror = (event) => {
        console.error('SpeechSynthesisError:', event.error);
        setIsSpeaking(false);
    };

    synth.speak(utterThis);
  };
  
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
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
    setIsStreamActive(false);
  }, []);

  const handleNavigation = (index) => {
    stopMediaStream(); 
    // Stop any ongoing speech upon navigation
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    setCurrentQIndex(index);

    if (questionContentRef.current) {
        questionContentRef.current.focus();
    }
  };


  // --- Video Recording Logic (Same as previous step) ---

  const startRecording = async () => {
    if (mediaPermissionStatus === 'denied') {
        alert("Camera and Microphone access was previously denied. Please check your browser settings and try again. NOTE: This feature requires a secure context (HTTPS or localhost).");
        return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaPermissionStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      recordedChunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        const videoURL = URL.createObjectURL(blob);
        
        setExamStatus(prevStatus => prevStatus.map((q, index) => {
            if (index === currentQIndex) {
                const newRecordings = [...q.answer.recordings, videoURL];
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
        alert("Camera/Mic access denied. You must grant permission to record the answer. Please check your browser settings.");
      } else {
        alert(`Error accessing media: ${err.name}. Check if your camera is in use or if you are on a secure (HTTPS) connection.`);
      }
      console.error('Error accessing media devices:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const setActiveVideo = (index) => {
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

  const reRecord = () => {
    startRecording();
  }

  const finalSubmitExam = () => {
      setShowSubmitModal(false);
      alert("Exam successfully submitted!");
  };

  // --- Conditional Question Renderer (TTS Button Added) ---

  const renderQuestionBody = () => {
    // ... (MCQ logic remains the same)
    if (currentQuestion.type === 'MCQ') {
        const currentAnswer = examStatus[currentQIndex].answer;
        return (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition duration-150 ${
                    currentAnswer === index
                      ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 font-semibold'
                      : 'bg-white hover:bg-gray-50 border-gray-300'
                  }`}
                  onClick={() => handleMCQSelect(index)}
                >
                  <span className="font-mono text-sm mr-3 text-blue-600">{String.fromCharCode(65 + index)}.</span>
                  <span className="text-gray-800">{option}</span>
                  {currentAnswer === index && <span className="float-right text-blue-600">Selected</span>}
                </div>
              ))}
            </div>
          );
    }

    // ... (Video logic remains the same)
    if (isVideoQuestion) {
      return (
        <div className="space-y-4">
          {mediaPermissionStatus === 'denied' && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                  <p className="font-bold">Permission Denied</p>
                  <p>Camera/Mic access is blocked. Please grant permission in your browser settings to record your answer.</p>
              </div>
          )}

          <div className="flex justify-center items-center aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
            
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${!isStreamActive && 'hidden'}`}
              autoPlay
              muted 
              playsInline
            />
            
            {currentVideoPreviewURL && !isStreamActive && (
                <video
                    controls
                    key={currentVideoPreviewURL}
                    src={currentVideoPreviewURL}
                    className="w-full h-full object-contain"
                />
            )}

            {!isStreamActive && currentRecordings.length === 0 && mediaPermissionStatus !== 'denied' && (
              <div className="text-white text-lg absolute inset-0 flex items-center justify-center">
                Click 'Record Video Answer' to begin.
              </div>
            )}
             {isRecording && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-sm font-bold py-1 px-3 rounded-full animate-pulse flex items-center">
                    <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                    RECORDING
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
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                {currentRecordings.length > 0 ? 'Re-Record (New Clip)' : 'Record Video Answer'}
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 flex items-center"
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
                      onClick={() => setActiveVideo(index)}
                      className={`py-2 px-4 rounded-lg font-medium transition duration-200 border-2 ${
                        activeVideoIndex === index
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                          : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'
                      }`}
                    >
                      Recording {index + 1} {activeVideoIndex === index && '(Active)'}
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

    return <p className="text-red-500">Error: Unknown question type.</p>;
  };

  // --- Submission Modal Component (Same as before) ---
  const SubmissionModal = ({ isVisible, onClose, onConfirm }) => {
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

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition"
            >
              Review & Go Back
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-lg"
            >
              Final Submit
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      
      {/* --- Submission Modal Rendering --- */}
      <SubmissionModal 
        isVisible={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={finalSubmitExam}
      />

      {/* --- Top Bar: Timer and Progress --- */}
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* --- Main Content Area: Question Display --- */}
        <div 
          className="lg:w-3/4 w-full bg-white p-6 rounded-xl shadow-xl"
          ref={questionContentRef}
          tabIndex="-1"
        >
          <header className="mb-6 pb-4 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  Question {currentQIndex + 1} of {totalQuestions}
                </h2>
                {/* NEW: Text-to-Speech Button */}
                <button
                    onClick={handleReadQuestion}
                    className={`px-4 py-1 text-sm font-semibold rounded-full transition duration-200 flex items-center shadow-md ${
                        isSpeaking 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                >
                    <svg className={`w-4 h-4 mr-1 ${isSpeaking ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.018a1 1 0 01.996 0l7 3A1 1 0 0118 7v6a1 1 0 01-.621.928l-7 3a1 1 0 01-.758 0l-7-3A1 1 0 012 13V7a1 1 0 01.621-.928l7-3zM10 8a1 1 0 011 1v4a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    {isSpeaking ? 'Stop Reading' : 'Read Question'}
                </button>
              </div>
              <span className="text-xl font-bold text-green-600">
                Marks: {currentQuestion.marks}
              </span>
            </div>
          </header>

          <div className="text-xl font-medium text-gray-900 mb-4 leading-relaxed">
            {currentQuestion.questionText}
          </div>

          <MultimediaDisplay multimedia={currentQuestion.multimedia} />

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
                className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${
                  currentQState.status === 'Marked for Review'
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                }`}
              >
                {currentQState.status === 'Marked for Review' ? 'Unmark for Review' : '🚩 Mark for Review'}
              </button>
            </div>

            <button
              onClick={() => currentQIndex === totalQuestions - 1 ? setShowSubmitModal(true) : handleNavigation(currentQIndex + 1)}
              className={`px-6 py-2 font-semibold rounded-lg shadow-md transition ${
                currentQIndex === totalQuestions - 1
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentQIndex === totalQuestions - 1 ? 'Submit Exam' : 'Next Question \u2192'}
            </button>
          </div>
        </div>

        {/* --- Sidebar: Question Status Tracking --- */}
        <div className="lg:w-1/4 w-full">
          <div className="sticky top-[100px] bg-white p-6 rounded-xl shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Question Panel</h3>
            <div className="grid grid-cols-5 gap-3">
              {mockExamData.map(q => (
                <QuestionStatusItem
                  key={q.id}
                  id={q.id}
                  status={examStatus.find(s => s.id === q.id)?.status || 'Not Answered'}
                  onClick={id => handleNavigation(id - 1)}
                  // NEW: Pass the current index to highlight the active question
                  isCurrent={q.id === currentQIndex + 1} 
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
                onClick={() => document.documentElement.requestFullscreen()} 
                className="mt-6 w-full py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition"
            >
                Enter Full-Screen Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeExamView;