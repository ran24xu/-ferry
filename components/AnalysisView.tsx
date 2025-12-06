import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, SelfIntro } from '../types';
import { DownloadIcon, SparklesIcon } from './Icons';
import { generateSpeech } from '../services/geminiService';

interface AnalysisViewProps {
  data: AnalysisResult;
  onUpdateIntro: (style: string, lang: 'CN' | 'EN', value: string) => void;
}

const AudioPlayer = ({ text }: { text: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const audioBlob = await generateSpeech(text);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (e) {
      alert("生成音频失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 mt-2">
      {!audioUrl ? (
        <button 
          onClick={handleGenerate}
          disabled={isLoading}
          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1"
        >
          {isLoading ? '生成音频中...' : '🔊 生成英文带读'}
        </button>
      ) : (
        <div className="flex items-center gap-2 w-full">
            <audio ref={audioRef} controls src={audioUrl} className="h-8 w-64" />
            <a 
                href={audioUrl} 
                download="self-intro.wav"
                className="text-xs text-gray-500 hover:text-blue-700 underline"
            >
                下载音频
            </a>
        </div>
      )}
    </div>
  );
};

const LevelBadge = ({ level }: { level: string }) => {
  const styles = {
    'A': 'from-orange-300 to-orange-500 border-orange-100 text-white',
    'B': 'from-blue-300 to-blue-500 border-blue-100 text-white',
    'C': 'from-green-300 to-green-500 border-green-100 text-white',
    'D': 'from-gray-300 to-gray-500 border-gray-100 text-white',
  };
  const styleClass = styles[level as keyof typeof styles] || styles['D'];

  return (
    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl font-black text-5xl border-[6px] bg-gradient-to-br ${styleClass}`}>
      {level}
    </div>
  );
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onUpdateIntro }) => {
  const [activeTab, setActiveTab] = useState<'Affinity' | 'Academic' | 'Practical'>('Affinity');
  
  // Find index to ensure we edit the correct item in the main array
  const activeIntroIndex = data.intros.findIndex(i => i.style === activeTab);
  const activeIntro = activeIntroIndex !== -1 ? data.intros[activeIntroIndex] : data.intros[0];

  const handleDownload = () => {
    const textContent = `
见岸 FERRY 分析报告
-------------------------
复试竞争力: ${data.competencyLevel}
${data.competencyEvaluation}

核心能力优势:
${data.strengths.map(s => `- ${s.strength}: ${s.description}`).join('\n')}

个性化自我介绍:

[${activeIntro.title} - 中文]
${activeIntro.contentCN}

[${activeIntro.title} - 英文]
${activeIntro.contentEN}
    `;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Self_Intro_${activeTab}.txt`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 p-4 space-y-8 animate-fade-in">
      
      {/* Competency Level Portrait Section */}
      <section className="bg-white rounded-3xl p-8 shadow-xl border border-blue-50 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
         {/* Decorative BG */}
         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <SparklesIcon className="w-48 h-48 text-brand-blue" filled />
         </div>
         
         {/* Badge */}
         <div className="flex-shrink-0 z-10">
            <LevelBadge level={data.competencyLevel || 'B'} />
         </div>

         {/* Content */}
         <div className="flex-1 z-10 text-center md:text-left">
             <h3 className="text-xl font-bold text-brand-blue mb-4">
                {data.competencyLevel === 'A' ? '顶尖竞争力 (Top Tier)' : 
                 data.competencyLevel === 'B' ? '强劲竞争力 (High Potential)' :
                 data.competencyLevel === 'C' ? '潜力股 (Solid Base)' : '需加倍努力 (Needs Focus)'}
             </h3>
             <p className="text-gray-700 leading-relaxed font-medium">
                {data.competencyEvaluation || "Evaluation not available."}
             </p>
         </div>
      </section>

      {/* Strengths Section */}
      <section className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl"></div>

        <h2 className="text-xl font-bold mb-8 flex items-center gap-3 relative z-10">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
             <span className="text-2xl">🚀</span>
          </div>
          <span>核心能力优势分析 (Core Advantages)</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {data.strengths.map((item, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl hover:bg-white/20 transition-all group">
              <h4 className="font-bold text-lg mb-2 text-yellow-300 group-hover:text-yellow-200 transition-colors">
                  {item.strength}
              </h4>
              <p className="text-blue-100 text-sm leading-relaxed opacity-90">
                  {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Self Intro Section */}
      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
             <div className="bg-brand-blue text-white p-2 rounded-lg shadow-sm">
                <span className="text-xl">📝</span>
             </div>
             个性化自我介绍 (Self Intro)
          </h2>
          
          <div className="flex bg-gray-200 p-1 rounded-xl">
            {(['Affinity', 'Academic', 'Practical'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setActiveTab(style)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === style 
                    ? 'bg-white text-brand-blue shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {style === 'Affinity' ? '亲和力' : style === 'Academic' ? '学术型' : '实战派'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 bg-brand-lightBlue/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-brand-blue tracking-tight">{activeIntro.title}</h3>
            <button 
                onClick={handleDownload}
                className="text-brand-blue hover:bg-brand-blue hover:text-white px-4 py-2 rounded-lg border border-brand-blue transition-colors text-sm font-semibold flex items-center gap-2 bg-white"
            >
                <DownloadIcon className="w-4 h-4" /> 导出文本
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                <span className="font-bold text-gray-800 text-lg">中文版本</span>
              </div>
              <textarea 
                className="w-full h-96 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-gray-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-brand-blue transition-all outline-none"
                value={activeIntro.contentCN}
                onChange={(e) => onUpdateIntro(activeTab, 'CN', e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    <span className="font-bold text-gray-800 text-lg">英文版本</span>
                </div>
                <AudioPlayer text={activeIntro.contentEN} />
              </div>
              <textarea 
                className="w-full h-96 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-gray-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-brand-blue transition-all outline-none"
                value={activeIntro.contentEN}
                onChange={(e) => onUpdateIntro(activeTab, 'EN', e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalysisView;