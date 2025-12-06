
import React, { useState } from 'react';
import { AppState, AppView, UserProfile, AnalysisResult, QuestionItem, MockRoundResult, MockSession } from './types';
import InputSection from './components/InputSection';
import AnalysisView from './components/AnalysisView';
import QuestionBank from './components/QuestionBank';
import FavoritesView from './components/FavoritesView';
import MockInterviewView from './components/MockInterviewView';
import MockHistoryList from './components/MockHistoryList';
import { generateAnalysis, generateQuestions } from './services/geminiService';
import { SparklesIcon, BookIcon, HeartIcon, ClockIcon, FerryIcon } from './components/Icons';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: AppView.INPUT,
    profile: { targetMajor: '', targetUni: '', resumeText: '', resumeFile: null },
    analysis: null,
    questions: [],
    isAnalyzing: false,
    isGeneratingQuestions: false,
    mockHistory: []
  });

  const handleStartAnalysis = async (profile: UserProfile) => {
    setState(prev => ({ ...prev, isAnalyzing: true, profile }));
    
    // Create the input object for the service
    const resumeInput = {
        text: profile.resumeText,
        file: profile.resumeFile
    };

    try {
      // 1. Generate Analysis & Intros
      const analysisData = await generateAnalysis(resumeInput, profile.targetMajor, profile.targetUni);
      
      setState(prev => ({ 
        ...prev, 
        analysis: analysisData, 
        view: AppView.ANALYSIS,
        isAnalyzing: false,
        isGeneratingQuestions: true // Start questions in background
      }));

      // 2. Generate Questions (Lazy load or immediately after)
      const qData = await generateQuestions(resumeInput, profile.targetMajor, profile.targetUni);
      setState(prev => ({ 
        ...prev, 
        questions: qData,
        isGeneratingQuestions: false
      }));

    } catch (error) {
      console.error(error);
      alert("AI 服务暂时繁忙或遇到错误，请稍后重试。");
      setState(prev => ({ ...prev, isAnalyzing: false, isGeneratingQuestions: false }));
    }
  };

  const toggleFavorite = (id: string) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
      )
    }));
  };

  const updateNote = (id: string, note: string) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === id ? { ...q, userNotes: note } : q
      )
    }));
  };

  const handleUpdateIntro = (style: string, lang: 'CN' | 'EN', value: string) => {
    if (!state.analysis) return;

    const newIntros = state.analysis.intros.map(intro => {
      if (intro.style === style) {
        return {
          ...intro,
          [lang === 'CN' ? 'contentCN' : 'contentEN']: value
        };
      }
      return intro;
    });

    setState(prev => ({
      ...prev,
      analysis: {
        ...prev.analysis!,
        intros: newIntros
      }
    }));
  };

  const handleMockComplete = (results: MockRoundResult[]) => {
      // Increment practice counts for questions
      const questionIdsPracticed = new Set(results.map(r => r.questionId));
      
      const newSession: MockSession = {
          id: `session-${Date.now()}`,
          timestamp: Date.now(),
          rounds: results
      };
      
      setState(prev => ({
          ...prev,
          view: AppView.MOCK_HISTORY, // Go to history view to see results
          mockHistory: [...prev.mockHistory, newSession],
          questions: prev.questions.map(q => 
            questionIdsPracticed.has(q.id) 
                ? { ...q, practiceCount: (q.practiceCount || 0) + 1 }
                : q
          )
      }));
  };

  const renderContent = () => {
    switch (state.view) {
      case AppView.INPUT:
        return <InputSection onStartAnalysis={handleStartAnalysis} isLoading={state.isAnalyzing} />;
      case AppView.ANALYSIS:
        return state.analysis ? <AnalysisView data={state.analysis} onUpdateIntro={handleUpdateIntro} /> : <div>Error loading analysis</div>;
      case AppView.QUESTIONS:
        return (
            <QuestionBank 
                questions={state.questions} 
                onToggleFavorite={toggleFavorite} 
                onStartMock={() => setState(prev => ({ ...prev, view: AppView.MOCK_SESSION }))}
                isLoading={state.isGeneratingQuestions} 
            />
        );
      case AppView.FAVORITES:
        return <FavoritesView questions={state.questions} onUpdateNote={updateNote} onRemoveFavorite={toggleFavorite} />;
      case AppView.MOCK_SESSION:
        return (
            <MockInterviewView 
                questions={state.questions}
                onComplete={handleMockComplete}
                onCancel={() => setState(prev => ({ ...prev, view: AppView.QUESTIONS }))}
            />
        );
      case AppView.MOCK_HISTORY:
        return <MockHistoryList history={state.mockHistory} />;
      default:
        return <InputSection onStartAnalysis={handleStartAnalysis} isLoading={state.isAnalyzing} />;
    }
  };

  const navItems = [
    { id: AppView.ANALYSIS, label: '复试分析', icon: SparklesIcon },
    { id: AppView.QUESTIONS, label: '预测问答库', icon: BookIcon },
    { id: AppView.FAVORITES, label: '收藏笔记', icon: HeartIcon },
    { id: AppView.MOCK_HISTORY, label: '模拟记录', icon: ClockIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 font-black text-xl text-brand-blue cursor-pointer"
            onClick={() => setState(prev => ({ ...prev, view: AppView.INPUT }))}
          >
            <span className="bg-brand-blue text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-md p-1.5">
                <FerryIcon filled />
            </span>
            <span>见岸 Ferry</span>
          </div>

          {state.analysis && state.view !== AppView.MOCK_SESSION && (
            <nav className="flex space-x-1 md:space-x-4 overflow-x-auto no-scrollbar">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setState(prev => ({ ...prev, view: item.id }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                    ${state.view === item.id 
                      ? 'bg-brand-blue text-white shadow-brand-blue/30 shadow-lg' 
                      : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <item.icon className={`w-4 h-4 ${state.view === item.id ? 'text-white' : 'text-gray-400'}`} filled={item.id === AppView.FAVORITES && state.view === item.id} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full pt-8">
        {renderContent()}
      </main>

      {/* Footer */}
      {state.view !== AppView.MOCK_SESSION && (
        <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
            <div className="max-w-5xl mx-auto px-4 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} 见岸 Ferry AI. 助力你的上岸之路.</p>
            </div>
        </footer>
      )}
    </div>
  );
};

export default App;
