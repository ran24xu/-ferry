
import React from 'react';
import { QuestionItem, QuestionCategory } from '../types';
import { HeartIcon } from './Icons';

interface FavoritesViewProps {
  questions: QuestionItem[];
  onUpdateNote: (id: string, note: string) => void;
  onRemoveFavorite: (id: string) => void;
}

const CATEGORY_TAGS: Record<QuestionCategory, string> = {
    'Motivation': '自传题',
    'Academic': '考试题',
    'Behavioral': '求职题',
    'Resume': '背调题',
    'Personal': '相亲题'
};

const FavoritesView: React.FC<FavoritesViewProps> = ({ questions, onUpdateNote, onRemoveFavorite }) => {
  const favorites = questions.filter(q => q.isFavorite);

  if (favorites.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="bg-gray-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
           <HeartIcon className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-700">暂无收藏</h3>
        <p className="text-gray-500 mt-2">去问答库收藏一些问题吧。</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 p-4 animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">我的复试备战笔记</h2>
      
      <div className="space-y-8">
        {favorites.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 relative group">
            <button 
                onClick={() => onRemoveFavorite(item.id)}
                className="absolute top-4 right-4 text-red-500 opacity-50 hover:opacity-100 transition-opacity"
                title="Remove from favorites"
            >
                <HeartIcon filled className="w-6 h-6" />
            </button>

            <div className="mb-2">
                <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-1 rounded">
                    {CATEGORY_TAGS[item.category] || item.category}
                </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 pr-10 mb-2">{item.question}</h3>
            
            <div className="bg-green-50 p-4 rounded-xl mb-4 text-sm text-gray-700">
                <span className="font-bold text-green-700 block mb-1">推荐回答：</span>
                {item.recommendedAnswer || "暂无推荐回答"}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl mb-4 text-sm text-gray-700">
                <span className="font-bold text-blue-700 block mb-1">建议回答结构：</span>
                {item.structure}
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">我的回答草稿 / 笔记</label>
                <textarea
                    className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[120px]"
                    placeholder="在这里写下你的回答要点..."
                    value={item.userNotes}
                    onChange={(e) => onUpdateNote(item.id, e.target.value)}
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesView;
