import React, { useState, useEffect, useMemo, useRef } from 'react';
import WaveChart from './components/WaveChart';
import ResultsTable from './components/ResultsTable';
import FormulaDisplay from './components/FormulaDisplay';
import { DataPoint, TrialResult } from './types.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_TRIALS = 3;
const AMPLITUDE = 1;
const POINTS = 200; // Number of points for the graph
const SOUND_DETECTION_THRESHOLD = 65; // Sensitivity for sound detection (0-255)

// --- Audio Decoding Helpers ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const App: React.FC = () => {
  const [trials, setTrials] = useState<TrialResult[]>([]);
  const [uxData, setUxData] = useState<DataPoint[]>([]);
  const [utData, setUtData] = useState<DataPoint[]>([]);
  const [averageSpeed, setAverageSpeed] = useState<number | null>(null);
  const [isExperimentRunning, setIsExperimentRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(true);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);


  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const isExperimentDone = useMemo(() => trials.length >= MAX_TRIALS, [trials]);

  useEffect(() => {
    if (isExperimentDone) {
      const totalSpeed = trials.reduce((sum, trial) => sum + (trial.wavelength / trial.period), 0);
      setAverageSpeed(totalSpeed / trials.length);
    }
  }, [isExperimentDone, trials]);
  
  const generateWaveData = (lambda: number, period: number) => {
    const newUxData: DataPoint[] = [];
    for (let i = 0; i <= POINTS; i++) {
      const x = (i / POINTS) * (2 * lambda);
      newUxData.push({
        axisValue: x,
        amplitude: AMPLITUDE * Math.cos((2 * Math.PI * x) / lambda),
      });
    }

    const newUtData: DataPoint[] = [];
    for (let i = 0; i <= POINTS; i++) {
      const t = (i / POINTS) * (2 * period);
      newUtData.push({
        axisValue: t,
        amplitude: AMPLITUDE * Math.cos((2 * Math.PI * t) / period),
      });
    }
    
    setUxData(newUxData);
    setUtData(newUtData);
  };

  const stopListening = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
  };


  const handleStartTrial = () => {
      if (isExperimentDone || isExperimentRunning) return;

      setIsExperimentRunning(true);
      
      setTimeout(() => {
          const wavelength = 0.7 + (Math.random() - 0.5) * 0.2; 
          const speedOfSound = 340 + (Math.random() - 0.5) * 10;
          const period = wavelength / speedOfSound;

          generateWaveData(wavelength, period);
          
          setTrials(prevTrials => [
              ...prevTrials,
              { id: prevTrials.length + 1, wavelength, period },
          ]);

          setIsExperimentRunning(false);
      }, 500);
  };

  const handleStartListening = async () => {
    if (isExperimentDone || isExperimentRunning || isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsListening(true);
      
      // Fix: Cast window to 'any' to access the prefixed webkitAudioContext for broader browser compatibility.
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;
      
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const detectSound = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

        if (average > SOUND_DETECTION_THRESHOLD) {
          stopListening();
          handleStartTrial();
        } else {
          animationFrameIdRef.current = requestAnimationFrame(detectSound);
        }
      };
      animationFrameIdRef.current = requestAnimationFrame(detectSound);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Không thể truy cập micro. Vui lòng cấp quyền trong cài đặt trình duyệt và thử lại.');
      setIsListening(false);
    }
  };

  const handleReset = () => {
    stopListening();
    setTrials([]);
    setUxData([]);
    setUtData([]);
    setAverageSpeed(null);
  };

  const playIntroAudio = async () => {
    try {
     // 1. Thiết lập AI
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = "Mình sẽ giúp bạn đo tốc độ truyền sóng âm bằng cách bạn vỗ tay hay nói to vào màn hình. Tôi sẽ vẽ đồ thị biểu diễn li độ U x và U tê. Chúng ta sẽ đo được bước sóng lam đa và chu kỳ T in. Tốc độ truyền sóng bằng lam đa chia cho chu kỳ. Các bạn làm 3 lần nhé.";
      
      try {
        // 2. Lấy nội dung chữ từ AI
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // 3. Đọc chữ thành tiếng bằng giọng nói của trình duyệt
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN'; 
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Lỗi gọi AI:", error);
      }

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      source.start();

    } catch (error) {
      console.error("Error generating or playing audio:", error);
      alert("Đã có lỗi xảy ra khi tải âm thanh hướng dẫn.");
    }
  };

  const handleStartIntro = async () => {
    setIsGeneratingAudio(true);
    await playIntroAudio();
    setIsGeneratingAudio(false);
    setShowIntroModal(false);
  };
  useEffect(() => {
    return () => stopListening();
  }, []);

  const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
    </svg>
  );
  
  const AudioIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 15.858a5 5 0 010-7.072m2.828 9.9a9 9 0 010-12.728" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
    </svg>
  );

  const getButtonText = () => {
    if (isExperimentRunning) return 'Đang đo...';
    if (isListening) return 'Đang lắng nghe...';
    return `Bắt đầu Lần ${trials.length + 1}`;
  };
  
  return (
    <>
      {showIntroModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center transform transition-all scale-95 opacity-0 animate-fade-in-scale">
            <style>{`
              @keyframes fade-in-scale {
                to {
                  transform: scale(1);
                  opacity: 1;
                }
              }
              .animate-fade-in-scale {
                animation: fade-in-scale 0.3s ease-out forwards;
              }
            `}</style>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-700 mb-3">Chào mừng bạn!</h2>
            <p className="text-slate-600 mb-6">Hãy nghe hướng dẫn ngắn để bắt đầu thí nghiệm đo tốc độ âm thanh nhé.</p>
            <button
                onClick={handleStartIntro}
                disabled={isGeneratingAudio}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:-translate-y-1"
            >
                <AudioIcon/>
                {isGeneratingAudio ? 'Đang tải âm thanh...' : 'Nghe hướng dẫn'}
            </button>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-700">Bài thực hành: ĐO TỐC ĐỘ TRUYỀN ÂM</h1>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">Bạn hãy nói hay vỗ tay để AI đo tốc độ truyền sóng âm của bạn.</p>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <WaveChart data={uxData} title="Hình ảnh sóng tại thời điểm t₀ (u - x)" xAxisLabel="x (m)" lineColor="#3b82f6" />
              <WaveChart data={utData} title="Dao động của phần tử tại vị trí x₀ (u - t)" xAxisLabel="t (s)" lineColor="#10b981" />
            </div>

            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">Bảng điều khiển</h2>
                  {!isExperimentDone ? (
                      <button
                          onClick={handleStartListening}
                          disabled={isExperimentRunning || isListening}
                          className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:-translate-y-1"
                      >
                          <MicrophoneIcon/>
                          {getButtonText()}
                      </button>
                  ) : (
                      <button
                          onClick={handleReset}
                          className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1"
                      >
                          <ResetIcon/>
                          Làm lại thí nghiệm
                      </button>
                  )}
                  <p className="text-sm text-slate-500 mt-3 text-center">Nhấn nút "Bắt đầu" và tạo ra âm thanh (vỗ tay, nói) để bắt đầu đo.</p>
              </div>

              <FormulaDisplay />
              
              <ResultsTable trials={trials} />

              {averageSpeed !== null && (
                  <div className="bg-green-500/10 backdrop-blur-sm border-l-4 border-green-500 text-green-900 p-6 rounded-lg shadow-lg">
                      <h3 className="text-lg font-bold">Kết quả cuối cùng</h3>
                      <p className="text-2xl font-mono mt-2">
                          v ≈ <span className="font-extrabold">{averageSpeed.toFixed(2)}</span> m/s
                      </p>
                      <p className="text-sm mt-1">Tốc độ truyền âm trung bình sau {MAX_TRIALS} lần đo.</p>
                  </div>
              )}
            </aside>
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
