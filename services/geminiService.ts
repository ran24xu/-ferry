
import { GoogleGenAI, Schema, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, QuestionItem, QuestionCategory } from "../types";

// Helper to ensure we always get a fresh client with the latest API Key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Retry helper
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw lastError;
}

// --- Helper: PCM to WAV ---
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2; 
  const blockAlign = numChannels * 2;
  const dataSize = pcmData.length;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, byteRate, true); 
  view.setUint16(32, blockAlign, true); 
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const bytes = new Uint8Array(buffer, 44);
  bytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- TTS Service ---

export const generateSpeech = async (text: string): Promise<Blob> => {
  const ai = getAiClient();
  try {
    // Retry TTS as well since it can be flaky
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { 
                voiceName: 'Kore' 
            },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned");
    }

    const pcmData = base64ToUint8Array(base64Audio);
    return pcmToWav(pcmData, 24000);

  } catch (error) {
    console.error("TTS generation failed:", error);
    throw error;
  }
}


// --- Analysis & Intro Generation ---

const introSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
            strength: { type: Type.STRING, description: "Short title of the strength (e.g., 'Solid Academic Background')." },
            description: { type: Type.STRING, description: "Explanation of why this is a strength, citing specific experiences from the resume." }
        },
        required: ['strength', 'description']
      },
      description: "List of 4 key capability strengths with evidence."
    },
    competencyLevel: {
        type: Type.STRING,
        enum: ['A', 'B', 'C', 'D'],
        description: "The calculated competency level (A=Top 10%, B=Top 30%, C=Top 60%, D=Bottom)."
    },
    competencyEvaluation: {
        type: Type.STRING,
        description: "A personalized evaluation string explaining the level and offering encouragement."
    },
    intros: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING, enum: ['Affinity', 'Academic', 'Practical'] },
          title: { type: Type.STRING },
          contentCN: { type: Type.STRING, description: "Chinese version of the self-introduction (approx 300-500 words)" },
          contentEN: { type: Type.STRING, description: "English version of the self-introduction matching the Chinese content" }
        },
        required: ['style', 'title', 'contentCN', 'contentEN']
      }
    }
  },
  required: ['strengths', 'competencyLevel', 'competencyEvaluation', 'intros']
};

interface ResumeInput {
    text: string;
    file?: { mimeType: string; data: string } | null;
}

const buildContents = (input: ResumeInput, promptText: string) => {
    if (input.file) {
        return {
            parts: [
                { text: promptText + "\n\n(Resume is attached as a file below)" },
                { inlineData: { mimeType: input.file.mimeType, data: input.file.data } }
            ]
        };
    } else {
        return {
            parts: [
                { text: promptText + "\n\nResume Content:\n" + input.text }
            ]
        };
    }
};

export const generateAnalysis = async (resumeInput: ResumeInput, major: string, uni: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const prompt = `
    Role: Expert Postgraduate Entrance Exam (Kaoyan) Coach.
    Task: Analyze the provided student resume for a re-examination (interview) at ${uni} for the ${major} major.
    
    1. **Competency Evaluation**:
       - Assess the student's competitiveness relative to peers (Top 10%=A, Top 30%=B, Top 60%=C, Others=D).
       - Determine 'competencyLevel' (A, B, C, or D).
       - Generate 'competencyEvaluation' text in Chinese following this pattern:
         - If A/B: "恭喜你，因为你具备[Strength 1]、[Strength 2]的优势，你在复试中的能力水平定位为[Level]级别，相信通过一定的准备，你一定能够获得较高的复试排名。"
         - If C/D: "很棒！你的[Strength 1]、[Strength 2]经历让你在同辈中处于[Level]级别，只要你用心准备复试，一定能够成功上岸。"
    
    2. **Strengths**: Extract exactly 4 key strengths.
       - For each strength, provide a short 'strength' title (e.g., "卓越的学术背景").
       - Provide a 'description' that specifically cites experiences from the resume that support this strength (e.g., "本科期间发表2篇SCI论文，并在全国大学生数学建模竞赛中获得一等奖...").
    
    3. **Self-Introductions**: Generate 3 distinct versions (Chinese & English for each):
       - Version A (Affinity): Focus on personality, communication. (Title: 亲和力与表现力版)
       - Version B (Academic): Focus on research, reading, rigor. (Title: 学术积累与素养版)
       - Version C (Practical): Focus on internships, projects, potential. (Title: 实践经历与潜力版)
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [buildContents(resumeInput, prompt) as any], // Wrap in array to ensure Content[]
      config: {
        responseMimeType: 'application/json',
        responseSchema: introSchema,
        temperature: 0.7,
      }
    }));

    const data = JSON.parse(response.text || '{}');
    return data as AnalysisResult;
  } catch (error) {
    console.error("Analysis generation failed:", error);
    throw error;
  }
};

// --- Question Bank Generation ---

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { 
            type: Type.STRING, 
            enum: ['Motivation', 'Academic', 'Behavioral', 'Resume', 'Personal'],
            description: "Category of the question"
          },
          question: { type: Type.STRING, description: "The interview question in Chinese" },
          questionEN: { type: Type.STRING, description: "The English translation of the interview question" },
          intent: { type: Type.STRING, description: "The hidden intent or essence of asking this (in Chinese)" },
          structure: { type: Type.STRING, description: "Recommended structure for the answer (in Chinese)" },
          keyPoints: { type: Type.STRING, description: "Specific key points from the resume to mention (in Chinese)" },
          recommendedAnswer: { type: Type.STRING, description: "A full sample answer tailored to the resume's details (in Chinese)" }
        },
        required: ['category', 'question', 'questionEN', 'intent', 'structure', 'keyPoints', 'recommendedAnswer']
      }
    }
  },
  required: ['items']
};

export const generateQuestions = async (resumeInput: ResumeInput, major: string, uni: string): Promise<QuestionItem[]> => {
  const ai = getAiClient();
  const prompt = `
    Role: Strict but helpful Academic Interviewer for ${uni}, ${major} department.
    Task: Based on the candidate's resume, generate 8 interview questions categorized exactly as follows (20% reduction in count for speed):

    1. Motivation (自传题): Why this school? Why this major? Why do you want to study via research? Focus on deep motivation and resume alignment.
    2. Academic (考试题): Explain a specific theory relevant to the major? How does AI impact this field? Basic concept understanding or hot topics.
    3. Behavioral (求职题/STAR): E.g., P&G 8 questions style. Leadership, conflict resolution, teamwork. Answer using STAR model.
    4. Resume (背调题): Deep dive into specific resume details. "Tell me more about this internship/paper/project."
    5. Personal (相亲题): Casual but strategic. Hobbies, favorite books, family. Essence is to show competitive advantage through daily life.

    For each question, explain:
    1. Category (Must be one of: Motivation, Academic, Behavioral, Resume, Personal)
    2. The Question in Chinese.
    3. The Question in English (questionEN). **Crucial**: Provide an accurate English translation.
    4. The "Essence" (Intent): Why are you asking this? (Must be in Chinese)
    5. Recommended Answer Structure (Must be in Chinese).
    6. Key Points to mention (customized to the user's resume) (Must be in Chinese).
    7. Recommended Answer: A personalized sample answer (Must be in Chinese).
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [buildContents(resumeInput, prompt) as any],
      config: {
        responseMimeType: 'application/json',
        responseSchema: questionSchema,
        temperature: 0.7,
      }
    }));

    const data = JSON.parse(response.text || '{}');
    return (data.items || []).map((item: any, index: number) => ({
      ...item,
      id: `q-${Date.now()}-${index}`,
      isFavorite: false,
      userNotes: '',
      practiceCount: 0
    }));
  } catch (error) {
    console.error("Question generation failed:", error);
    throw error;
  }
};

// --- Mock Interview Evaluation ---

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcription: { type: Type.STRING, description: "Verbatim transcription of the user's audio answer." },
    feedback: { type: Type.STRING, description: "Constructive feedback on the answer." }
  },
  required: ['transcription', 'feedback']
};

export const evaluateMockResponse = async (
  input: Blob | string, 
  question: string,
  isEnglish: boolean
): Promise<{ transcription: string; feedback: string }> => {
  const ai = getAiClient();
  const isAudio = input instanceof Blob;
  
  const prompt = `
    Role: Interview Coach.
    Task: The student was asked the following question: "${question}".
    ${isEnglish ? 'NOTE: The student was required to answer in English. Please evaluate their English proficiency as well.' : ''}

    ${isAudio ? '1. Transcribe the audio recording exactly (Text-to-Speech).' : '1. The student provided a text answer.'}
    2. Provide feedback (in Chinese) on their answer:
       - Did they answer the core question?
       - Did they include personal experiences?
       - Is the structure clear?
       - Is it too long or too short?
       - Suggest one specific improvement.
  `;

  const parts: any[] = [{ text: prompt }];

  if (isAudio) {
      const base64Audio = await blobToBase64(input as Blob);
      parts.push({ inlineData: { mimeType: (input as Blob).type || 'audio/webm', data: base64Audio } });
  } else {
      parts.push({ text: `Student Text Answer: "${input}"` });
  }

  try {
    // Retry evaluation as well
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash', // Multimodal model
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: evaluationSchema,
      }
    }));
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Evaluation failed:", error);
    return { 
        transcription: isAudio ? "Error processing audio." : (input as string), 
        feedback: "Could not generate feedback due to an error." 
    };
  }
};
