"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  Sparkles,
  Clock,
  Activity,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { QuestionItem } from "@/types";

interface SpeechInterfaceProps {
  currentQuestion: QuestionItem;
  onSubmitAnswer: (answer: string, durationSeconds: number) => void;
  onNextQuestion: () => void;
  isEvaluating: boolean;
  isEvaluated: boolean;
  nextQuestionNumber: number;
  totalQuestions: number;
}

export const SpeechInterface: React.FC<SpeechInterfaceProps> = ({
  currentQuestion,
  onSubmitAnswer,
  onNextQuestion,
  isEvaluating,
  isEvaluated,
  nextQuestionNumber,
  totalQuestions,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [detectedFillers, setDetectedFillers] = useState<string[]>([]);
  const [liveWpm, setLiveWpm] = useState<number>(0);

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Text-to-Speech: Read current question aloud when it changes
  const speakQuestion = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Speak when currentQuestion changes
  useEffect(() => {
    setTranscript("");
    setDurationSeconds(0);
    setDetectedFillers([]);
    setLiveWpm(0);
    isListeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {}

    const timer = setTimeout(() => {
      speakQuestion(currentQuestion.questionText);
    }, 600);

    return () => {
      clearTimeout(timer);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion.id]);

  // 2. Speech-to-Text Setup: Continuously records everything until user clicks Finish and Evaluate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript + " ";
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    // Auto-restart recognition continuously while recording is active
    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          }, 250);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  // 3. Timer & Live Metrics calculation
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  useEffect(() => {
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const minutes = Math.max(0.08, durationSeconds / 60);
    const calculatedWpm = Math.round(words.length / minutes);
    setLiveWpm(Math.min(250, calculatedWpm));

    // Filler word tracking
    const fillers = ["um", "uh", "like", "you know", "basically", "actually"];
    const found: string[] = [];
    const lower = transcript.toLowerCase();
    fillers.forEach((f) => {
      const match = lower.match(new RegExp(`\\b${f}\\b`, "g"));
      if (match) found.push(`${f} (${match.length})`);
    });
    setDetectedFillers(found);
  }, [transcript, durationSeconds]);

  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not natively supported in this browser. You can type your answer below.");
      return;
    }

    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {}
    } else {
      // Stop AI voice if it was still talking
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
      isListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn("Failed to start speech recognition:", err);
      }
    }
  };

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const handleFinishAndEvaluate = () => {
    if (wordCount > 20000) {
      alert(
        `Your response has ${wordCount.toLocaleString()} words, which exceeds the maximum limit of 20,000 words. Please trim your response.`
      );
      return;
    }

    // Stop recording completely
    isListeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {}

    const finalAnswer = transcript.trim() || "No answer provided by candidate.";
    onSubmitAnswer(finalAnswer, Math.max(10, durationSeconds));
  };

  const handlePreFillSample = (type: "strong" | "fundamental") => {
    if (type === "strong") {
      setTranscript(
        "Good morning. My name is John Doe. First of all, I would like to thank you for giving me an opportunity to introduce myself. I am currently staying in Hyderabad but born and brought up in Guntur, Andhra Pradesh. I have completed my graduation in Bachelor of Technology in Computer Science and Engineering from Jawaharlal Nehru Technological University College of Engineering. I did my plus 2 from the state board with 94% and SSC from the state board with 95%. Coming to technical skills, I am proficient with programming languages like Java, Python, and TypeScript, alongside frameworks like React and Next.js. Coming to my soft skills, I have good leadership qualities, effective communication, and adapt well to dynamic situations. My strengths are persistent learning and facing new challenges. My weakness is problems with meeting deadlines when striving for excessive perfection, which I am rectifying by using agile sprint timeboxing. My hobbies include contributing to open-source and solving algorithmic challenges. Coming to my family, I come from a supportive background. My short-term goal is to get a job in a reputed company like yours, and my long-term goal is to become a knowledgeable personality in a responsible position in the company. That's all about me, once again thank you very much for giving me this wonderful opportunity to introduce myself."
      );
      setDurationSeconds(58);
    } else {
      setTranscript(
        "Hi, I'm John. I did my degree from college and know some coding. In my free time I like watching movies and hanging out. I want to get a good job."
      );
      setDurationSeconds(15);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Voice State & Question Audio Controls */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              isAiSpeaking
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isAiSpeaking ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">AI Interviewer Voice</span>
              {isAiSpeaking && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  Speaking...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isAiSpeaking ? "Listen carefully to the question" : "Question reading completed"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => speakQuestion(currentQuestion.questionText)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay Voice</span>
        </button>
      </div>

      {/* Real-Time Speech Analytics Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pacing</span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {liveWpm} <span className="text-[10px] text-slate-500 font-normal">WPM</span>
            </span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Filler Words</span>
            <span className="text-xs font-mono font-bold text-amber-600">
              {detectedFillers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Answer Transcript & Live Microphone Input */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Your Spoken Transcript & Response</span>
            {isListening && (
              <span className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold lowercase">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                recording
              </span>
            )}
          </label>

          {/* Quick Pre-fill test helper buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 hidden sm:inline">Simulate response:</span>
            <button
              type="button"
              onClick={() => handlePreFillSample("strong")}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium transition"
            >
              Strong Answer
            </button>
            <button
              type="button"
              onClick={() => handlePreFillSample("fundamental")}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-medium transition"
            >
              Weak Answer
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            isListening
              ? "Listening to your voice... Speak your response clearly."
              : "Click 'Start Microphone' below to speak your answer, or type/paste your response directly here (supports 0 to 20,000 words)..."
          }
          className="w-full max-h-72 min-h-[120px] px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs leading-relaxed resize-y font-sans transition"
        />

        {/* Word count display & Fillers detected */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Answer Length:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                wordCount > 20000
                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                  : wordCount > 0
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {wordCount.toLocaleString()}
            </span>
            <span className="text-slate-400 font-normal">/ 20,000 words max</span>
          </div>

          {detectedFillers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500">Hesitations:</span>
              {detectedFillers.map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[10px]"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Status Banner */}
        {isEvaluated && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Answer evaluated & recorded successfully!</span>
            </div>
            <span className="text-[11px] text-emerald-700 hidden sm:inline">
              Click &quot;Next Question&quot; to proceed.
            </span>
          </div>
        )}

        {/* Bottom controls: Mic toggle and Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={toggleListening}
            disabled={isEvaluating || isEvaluated}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-sm ${
              isListening
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Pause Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-indigo-600" />
                <span>{transcript ? "Resume Speaking" : "Start Microphone"}</span>
              </>
            )}
          </button>

          {!isEvaluated ? (
            <button
              type="button"
              onClick={handleFinishAndEvaluate}
              disabled={isEvaluating || wordCount > 20000}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition hover:scale-[1.02]"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Finish and Evaluate</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextQuestion}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition hover:scale-[1.03] animate-in zoom-in-95"
            >
              <span>
                {nextQuestionNumber > totalQuestions
                  ? "Complete Interview & View Final Report →"
                  : `Next Question (Question ${nextQuestionNumber} of ${totalQuestions}) →`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
