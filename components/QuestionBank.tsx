
import React, { useState } from 'react';
import { QuestionItem, QuestionCategory } from '../types';
import { ChevronDownIcon, ChevronUpIcon, HeartIcon, SparklesIcon } from './Icons';

interface QuestionBankProps {
  questions: QuestionItem[];
  onToggleFavorite: (id: string) => void;
  onStartMock: () => void;
  isLoading: boolean;
}

const CATEGORY_LABELS: Record<QuestionCategory, { label: string, color: string, desc: string }> = {
    'Motivation': { label: '自传题', color: 'bg-orange-100 text-orange-700', desc: 'Why you? Why us? Deep motivation.' },
    'Academic': { label: '考试题', color: 'bg-blue-100 text-blue-700', desc: 'Theory, AI impact, hot topics.' },
    'Behavioral': { label: '求职题', color: 'bg-green-100 text-green-700', desc: 'STAR model, leadership, teamwork.' },
    'Resume': { label: '背调题', color: 'bg-indigo-100 text-indigo-700', desc: 'Deep dive into your specific experiences.' },
    'Personal': { label: '相亲题', color: 'bg-pink-100 text-pink-700', desc: 'Casual but strategic personal questions.' }
};

const QuestionCard: React.FC<{ 
  item: QuestionItem; 
  onToggleFav: () => void; 
}> = ({ item, onToggleFav }) => {
  const [isOpen, setIsOpen] = useState(false);
  const catStyle = CATEGORY_LABELS[item.category] || { label: item.category, color: 'bg-gray-100', desc: '' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden">
      <div 
        className="p-5 flex items-start gap-4 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${catStyle.color}`}>
                {catStyle.label}
            </span>
            {item.practiceCount !== undefined && item.practiceCount > 0 && (
                 <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                    已练习 {item.practiceCount} 次
                 </span>
            )}
          </div>
          <h4 className="text-lg font-bold text-gray-800 leading-tight">{item.question}</h4>
          <p className="text-gray-400 text-sm font-medium mt-1">元问题：<span className="text-brand-blue">{item.intent}</span></p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                className={`p-2 rounded-full transition-colors ${item.isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400'}`}
            >
                <HeartIcon filled={item.isFavorite} className="w-6 h-6" />
            </button>
            <button className="text-gray-400">
                {isOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 pt-0 bg-gray-50/50 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            <div>
               <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded mb-2">推荐回答 (Recommended Answer)</span>
               <p className="text-gray-700 text-sm bg-white p-3 rounded-lg border border-green-100 whitespace-pre-wrap">
                 {item.recommendedAnswer || "暂无推荐回答"}
               </p>
            </div>
            <div>
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded mb-2">回答结构</span>
              <p className="text-gray-700 text-sm bg-white p-3 rounded-lg border border-yellow-100 whitespace-pre-wrap">
                {item.structure}
              </p>
            </div>
            <div>
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded mb-2">融入你的经历</span>
              <p className="text-gray-700 text-sm bg-white p-3 rounded-lg border border-blue-100 whitespace-pre-wrap">
                {item.keyPoints}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionBank: React.FC<QuestionBankProps> = ({ questions, onToggleFavorite, onStartMock, isLoading }) => {
  const [activeCat, setActiveCat] = useState<QuestionCategory | 'All'>('All');

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
        <p className="text-gray-500 font-medium">AI 正在为你的简历生成面试题...</p>
      </div>
    );
  }

  const categories: QuestionCategory[] = ['Motivation', 'Academic', 'Behavioral', 'Resume', 'Personal'];
  const filteredQuestions = activeCat === 'All' ? questions : questions.filter(q => q.category === activeCat);

  return (
    <div className="max-w-3xl mx-auto pb-20 p-4 animate-fade-in space-y-6">
      
      {/* Mock Interview CTA */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
         <div>
            <h3 className="text-xl font-bold mb-1">开始全真模拟抽问</h3>
            <p className="text-blue-100 text-sm">随机抽取3个问题（2中 + 1英），实时录音 + AI 评分</p>
         </div>
         <button 
           onClick={onStartMock}
           className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 shadow-md transition-all active:scale-95 flex items-center gap-2"
         >
            <SparklesIcon className="w-5 h-5" filled />
            开始抽问
         </button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto no-scrollbar gap-2">
          <button 
             onClick={() => setActiveCat('All')}
             className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeCat === 'All' ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
              全部
          </button>
          {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeCat === cat ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                  {CATEGORY_LABELS[cat].label}
              </button>
          ))}
      </div>

      <div className="space-y-4">
        {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
            <QuestionCard 
                key={q.id} 
                item={q} 
                onToggleFav={() => onToggleFavorite(q.id)} 
            />
            ))
        ) : (
            <div className="text-center py-10 text-gray-400">
                暂无相关问题
            </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
