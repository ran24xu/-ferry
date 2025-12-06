
import React, { useState, useRef, useEffect } from 'react';
import { QuestionItem, MockRoundResult } from '../types';
import { evaluateMockResponse } from '../services/geminiService';
import { MicrophoneIcon, KeyboardIcon, XIcon, ChevronDownIcon } from './Icons';

interface MockInterviewViewProps {
  questions: QuestionItem[];
  onComplete: (results: MockRoundResult[]) => void;
  onCancel: () => void;
}

const MockInterviewView: React.FC<MockInterviewViewProps> = ({ questions, onComplete, onCancel }) => {
  // Session State
  const [selectedQuestions, setSelectedQuestions] = useState<{item: QuestionItem, isEnglish: boolean}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<MockRoundResult[]>([]);
  const [viewState, setViewState] = useState<'READY' | 'QUESTION' | 'RECORDING' | 'PROCESSING' | 'DONE'>('READY');
  const [inputMode, setInputMode] = useState<'AUDIO' | 'TEXT'>('AUDIO');
  const [textAnswer, setTextAnswer] = useState('');
  
  // Recording State
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  // Initialize random questions
  useEffect(() => {
    if (questions.length < 3) {
      alert("题目库中至少需要3个问题才能开始模拟。");
      onCancel();
      return;
    }
    
    // Shuffle and pick 3
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, 3);
    
    // Structure: 2 Normal (Chinese), 1 English
    // Force English question to be the last one
    const structured = [
        { item: picked[0], isEnglish: false },
        { item: picked[1], isEnglish: false },
        { item: picked[2], isEnglish: true }, // The 3rd one is forced English
    ];
    
    setSelectedQuestions(structured);
  }, [questions]);

  const startSession = () => {
    setViewState('QUESTION');
  };

  const handleExit = () => {
      // Save current progress and exit
      if (results.length > 0) {
          if (confirm("确定结束练习吗？目前的进度将会被保存。")) {
              onComplete(results);
          }
      } else {
          onCancel();
      }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); 
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAnswer(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setViewState('RECORDING');
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      alert("无法访问麦克风，请允许权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && viewState === 'RECORDING') {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setViewState('PROCESSING');
    }
  };

  const submitTextAnswer = () => {
      if (!textAnswer.trim()) return;
      setViewState('PROCESSING');
      processAnswer(textAnswer);
  };

  const handleSkip = () => {
      // Record as skipped? Or just move on. Let's record as skipped so user knows.
      const currentQ = selectedQuestions[currentIndex];
      const resultItem: MockRoundResult = {
        questionId: currentQ.item.id,
        questionText: currentQ.isEnglish && currentQ.item.questionEN ? currentQ.item.questionEN : currentQ.item.question,
        isEnglishRound: currentQ.isEnglish,
        transcription: "Skipped",
        feedback: "Question skipped.",
        skipped: true
      };
      
      setResults(prev => [...prev, resultItem]);
      moveToNext();
  };

  const processAnswer = async (input: Blob | string) => {
    const currentQ = selectedQuestions[currentIndex];
    const qText = currentQ.isEnglish && currentQ.item.questionEN ? currentQ.item.questionEN : currentQ.item.question;

    try {
      const aiResult = await evaluateMockResponse(input, qText, currentQ.isEnglish);
      
      const resultItem: MockRoundResult = {
        questionId: currentQ.item.id,
        questionText: qText,
        isEnglishRound: currentQ.isEnglish,
        audioBlob: input instanceof Blob ? input : undefined,
        textAnswer: typeof input === 'string' ? input : undefined,
        transcription: aiResult.transcription,
        feedback: aiResult.feedback
      };

      setResults(prev => [...prev, resultItem]);
      moveToNext();

    } catch (error) {
      console.error(error);
      alert("Error processing answer. Skipping evaluation.");
      moveToNext();
    }
  };

  const moveToNext = () => {
      setTextAnswer(''); // Clear text
      if (currentIndex < 2) {
        setCurrentIndex(prev => prev + 1);
        setViewState('QUESTION');
      } else {
        setViewState('DONE');
      }
  };

  // --- RENDERERS ---

  if (viewState === 'READY') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
         <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in relative">
             <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6"/></button>
             <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-4xl">🎙️</div>
             <h2 className="text-2xl font-bold text-gray-800">准备好开始了吗?</h2>
             <p className="text-gray-500">
               即将开始3轮随机抽问 (2中 + 1英)。<br/>
               支持语音或文字回答。请确保环境安静。
             </p>
             <button onClick={startSession} className="w-full py-4 rounded-xl font-bold bg-brand-blue text-white hover:bg-blue-700 shadow-lg text-lg">开始练习</button>
         </div>
      </div>
    );
  }

  if (viewState === 'DONE') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-3xl p-6 py-12 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-brand-blue">🎉 恭喜你，完成练习!</h2>
                <p className="text-gray-500">以下是你的回答记录与AI改进建议</p>
            </div>

            <div className="space-y-6">
                {results.map((res, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <span className={`text-xs font-bold px-2 py-1 rounded mr-2 ${res.isEnglishRound ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                    {res.isEnglishRound ? 'English Question' : `问题 ${idx + 1}`}
                                </span>
                                {res.skipped && <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-500">已跳过</span>}
                                <h3 className="text-lg font-bold text-gray-800 mt-1">{res.questionText}</h3>
                            </div>
                        </div>
                        {!res.skipped && (
                            <div className="p-6 grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">你的回答 (文字记录)</label>
                                    <p className="text-gray-700 text-sm leading-relaxed bg-yellow-50/50 p-3 rounded-lg border border-yellow-100">
                                        "{res.transcription}"
                                    </p>
                                    {res.audioBlob && (
                                        <audio controls src={URL.createObjectURL(res.audioBlob)} className="w-full h-8 mt-2" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-brand-blue uppercase">AI 点评 & 建议</label>
                                    <div className="text-gray-700 text-sm leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100 whitespace-pre-wrap">
                                        {res.feedback}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button 
               onClick={() => onComplete(results)}
               className="w-full py-4 rounded-xl font-bold bg-brand-blue text-white shadow-lg hover:bg-blue-700 text-lg"
            >
                保存记录并返回
            </button>
        </div>
      </div>
    );
  }

  // QUESTION & RECORDING VIEW
  const currentQ = selectedQuestions[currentIndex];
  // Determine Text to display: If it's English round and we have EN text, use it.
  const displayQuestion = (currentQ.isEnglish && currentQ.item.questionEN) ? currentQ.item.questionEN : currentQ.item.question;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
       {/* Header Actions */}
       <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
           <button 
             onClick={handleExit} 
             className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold text-gray-600 transition-colors"
           >
             暂时不练了
           </button>
           <button 
             onClick={handleSkip} 
             className="px-4 py-2 text-gray-400 hover:text-gray-600 font-bold text-sm"
           >
             跳过 &rarr;
           </button>
       </div>

       <div className="max-w-2xl w-full space-y-8 text-center mt-10">
           
           {/* Progress Dots */}
           <div className="flex justify-center gap-2">
               {[0, 1, 2].map(i => (
                   <div key={i} className={`w-3 h-3 rounded-full transition-all ${i === currentIndex ? 'bg-brand-blue scale-125' : i < currentIndex ? 'bg-blue-300' : 'bg-gray-200'}`} />
               ))}
           </div>

           <div className="space-y-6">
                <div className="inline-block">
                    {currentQ.isEnglish ? (
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold tracking-wide animate-pulse shadow-blue-200 shadow-lg">
                            🇺🇸 Please Answer in English
                        </span>
                    ) : (
                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm font-bold tracking-wide">
                            请用中文回答
                        </span>
                    )}
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                    {displayQuestion}
                </h2>
           </div>

           <div className="min-h-[200px] flex flex-col items-center justify-center">
               {viewState === 'PROCESSING' ? (
                   <div className="space-y-4">
                       <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-blue border-t-transparent mx-auto"></div>
                       <p className="text-gray-400 font-medium">AI 正在分析你的回答...</p>
                   </div>
               ) : (
                   <>
                       {/* Toggle Mode */}
                       <div className="flex bg-gray-100 p-1 rounded-full mb-8">
                           <button 
                             onClick={() => setInputMode('AUDIO')}
                             className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${inputMode === 'AUDIO' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'}`}
                           >
                               <MicrophoneIcon className="w-4 h-4"/> 语音
                           </button>
                           <button 
                             onClick={() => setInputMode('TEXT')}
                             className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${inputMode === 'TEXT' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'}`}
                           >
                               <KeyboardIcon className="w-4 h-4"/> 文字
                           </button>
                       </div>

                       {inputMode === 'AUDIO' ? (
                           viewState === 'RECORDING' ? (
                                <div className="flex flex-col items-center gap-4 animate-fade-in">
                                    <div className="text-5xl font-mono font-bold text-red-500 animate-pulse">
                                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                    </div>
                                    <button 
                                        onClick={stopRecording}
                                        className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-xl flex items-center justify-center transition-all transform hover:scale-105 border-4 border-red-200"
                                    >
                                        <div className="w-8 h-8 bg-white rounded-md" />
                                    </button>
                                    <p className="text-gray-400 text-sm">点击停止录音</p>
                                </div>
                           ) : (
                                <div className="flex flex-col items-center gap-4 animate-fade-in">
                                        <button 
                                            onClick={startRecording}
                                            className="w-20 h-20 rounded-full bg-brand-blue hover:bg-blue-700 shadow-xl flex items-center justify-center transition-all transform hover:scale-105 border-4 border-blue-200"
                                        >
                                            <div className="w-8 h-8 bg-white rounded-full" />
                                        </button>
                                        <p className="text-gray-400 text-sm">点击开始回答</p>
                                </div>
                           )
                       ) : (
                           <div className="w-full max-w-lg space-y-4 animate-fade-in">
                               <textarea 
                                  className="w-full h-32 p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-blue outline-none resize-none"
                                  placeholder="在此输入你的回答..."
                                  value={textAnswer}
                                  onChange={(e) => setTextAnswer(e.target.value)}
                               />
                               <button 
                                 onClick={submitTextAnswer}
                                 disabled={!textAnswer.trim()}
                                 className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
                               >
                                   提交回答
                               </button>
                           </div>
                       )}
                   </>
               )}
           </div>

       </div>
    </div>
  );
};

export default MockInterviewView;
