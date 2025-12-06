
import React, { useState } from 'react';
import { MockSession } from '../types';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface MockHistoryListProps {
  history: MockSession[];
}

const HistoryItem: React.FC<{ session: MockSession }> = ({ session }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const date = new Date(session.timestamp);
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    const score = session.rounds.filter(r => !r.skipped).length; // Just a simple count of completed

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                        <ClockIcon className="w-5 h-5" filled />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-gray-800">{dateStr} 练习记录</h4>
                        <p className="text-xs text-gray-500">{timeStr} • 完成 {score} 题</p>
                    </div>
                </div>
                <div className="text-gray-400">
                    {isOpen ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                </div>
            </button>

            {isOpen && (
                <div className="bg-gray-50/50 border-t border-gray-100 p-5 space-y-6">
                    {session.rounds.map((round, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${round.isEnglishRound ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {round.isEnglishRound ? '英文' : '中文'}
                                </span>
                                {round.skipped && <span className="text-xs font-bold text-red-400">已跳过</span>}
                            </div>
                            <h5 className="font-bold text-gray-800 mb-2">{round.questionText}</h5>
                            
                            {!round.skipped && (
                                <div className="space-y-3 mt-3">
                                    <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700">
                                        <span className="block text-xs font-bold text-gray-400 uppercase mb-1">你的回答</span>
                                        {round.transcription}
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
                                        <span className="block text-xs font-bold text-brand-blue uppercase mb-1">AI 点评</span>
                                        {round.feedback}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const MockHistoryList: React.FC<MockHistoryListProps> = ({ history }) => {
  if (history.length === 0) {
      return (
          <div className="max-w-3xl mx-auto py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <ClockIcon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">暂无练习记录</h3>
              <p className="text-gray-500 mt-2">去预测问答库开始你的第一次全真模拟抽问吧！</p>
          </div>
      )
  }

  // Sort by newest first
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="max-w-3xl mx-auto pb-20 p-4 animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">我的模拟面试记录</h2>
      <div className="space-y-4">
          {sortedHistory.map(session => (
              <HistoryItem key={session.id} session={session} />
          ))}
      </div>
    </div>
  );
};

export default MockHistoryList;
