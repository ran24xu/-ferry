import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { UploadIcon, SparklesIcon, FileTextIcon, TrashIcon, FerryIcon } from './Icons';

interface InputSectionProps {
  onStartAnalysis: (profile: UserProfile) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onStartAnalysis, isLoading }) => {
  const [major, setMajor] = useState('');
  const [uni, setUni] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);

  // Simulated progress bar effect
  useEffect(() => {
    let interval: number;
    if (isLoading) {
      setProgress(0);
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // Stall at 90% until done
          return prev + Math.random() * 5;
        });
      }, 500);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reduced limit from 5MB to 3MB to prevent RPC/XHR errors
    if (file.size > 3 * 1024 * 1024) {
      alert("文件过大。请上传小于 3MB 的 PDF 文件。");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data:application/pdf;base64, prefix
            const base64Data = result.split(',')[1];
            setResumeFile({
                name: file.name,
                mimeType: file.type,
                data: base64Data
            });
            setResumeText(''); // Clear text to avoid confusion
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      setResumeText(text);
      setResumeFile(null);
    } else {
      alert("请上传 PDF (.pdf) 或纯文本 (.txt, .md) 文件。");
    }
    
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearFile = () => {
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isReady = major.trim() && uni.trim() && (resumeText.trim().length > 50 || resumeFile !== null);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-brand-dark tracking-tight flex items-center justify-center gap-3">
          <span className="text-brand-blue">见岸 Ferry</span>
        </h1>
        <div className="space-y-1">
            <p className="text-gray-600 text-xl font-medium">
            看见彼岸，渡你抵达。
            </p>
            <p className="text-gray-400 text-sm tracking-wide">
            Ferry to Your Future.
            </p>
            <p className="text-xs text-gray-400 pt-1 font-medium">
            @然后徐 原创
            </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-blue-100 relative overflow-hidden">
        {/* Progress Bar Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-4 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <FerryIcon className="w-8 h-8 text-brand-blue" filled />
              </div>
              <h3 className="text-xl font-bold text-gray-800">正在深度分析你的简历...</h3>
              <p className="text-sm text-gray-500">正在解读简历，挖掘亮点，并为你生成专属策略...</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 overflow-hidden">
                <div 
                  className="bg-brand-blue h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">目标院校 (Target University)</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-lightBlue transition-all outline-none"
              placeholder="例如：复旦大学"
              value={uni}
              onChange={(e) => setUni(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">报考专业 (Target Major)</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-lightBlue transition-all outline-none"
              placeholder="例如：新闻与传播"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end mb-1">
            <label className="text-sm font-semibold text-gray-700">个人简历 / 自述 (Resume)</label>
            <div className="relative">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  id="resume-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.md"
                />
                <label 
                  htmlFor="resume-upload"
                  className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-brand-blue bg-blue-50 hover:bg-blue-100 hover:text-blue-700 px-3 py-2 rounded-lg transition-colors border border-blue-100"
                >
                  <UploadIcon className="w-4 h-4" />
                  <span>上传 PDF</span>
                </label>
            </div>
          </div>
          
          {resumeFile ? (
              <div className="w-full p-6 border-2 border-dashed border-brand-blue/30 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-center animate-fade-in relative group transition-all">
                  <button 
                    onClick={clearFile}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
                    title="Remove file"
                  >
                      <TrashIcon className="w-5 h-5" />
                  </button>
                  
                  <div className="bg-white p-3 rounded-2xl shadow-sm mb-3 text-brand-blue">
                     <FileTextIcon className="w-8 h-8" />
                  </div>
                  <div className="max-w-full px-8">
                     <p className="font-bold text-gray-800 text-sm truncate">{resumeFile.name}</p>
                     <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{resumeFile.mimeType.split('/')[1]} Document</p>
                  </div>
              </div>
          ) : (
            <div className="relative">
                <textarea
                    className="w-full h-64 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-lightBlue transition-all outline-none resize-none text-sm leading-relaxed"
                    placeholder="在此粘贴简历内容，或点击上方按钮上传PDF..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                />
                <p className="absolute bottom-3 right-4 text-xs text-gray-400 pointer-events-none">
                    {resumeText.length} 字符
                </p>
            </div>
          )}
        </div>

        <button
          onClick={() => onStartAnalysis({ targetMajor: major, targetUni: uni, resumeText, resumeFile })}
          disabled={!isReady || isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg
            ${isReady && !isLoading 
              ? 'bg-brand-blue text-white hover:bg-blue-700 shadow-blue-200' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
           {isReady ? <FerryIcon className="w-5 h-5" filled /> : <SparklesIcon className="w-5 h-5" />}
           生成专属复试分析
        </button>
      </div>
    </div>
  );
};

export default InputSection;