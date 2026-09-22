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
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const transcriptRef = useRef<string>("");
  const baseTranscriptRef = useRef<string>("");
  const absoluteBaseTranscriptRef = useRef<string>("");
  const [durationSeconds, setDurationSeconds] = useState<number>(0);

  // Keep transcriptRef in sync for access inside event handlers
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [detectedFillers, setDetectedFillers] = useState<string[]>([]);
  const [liveWpm, setLiveWpm] = useState<number>(0);

  // Recognition ref for live fallback
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // MediaRecorder refs for Gemini High-Fidelity Audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // 1. Text-to-Speech: Read current question aloud when it changes
  const speakQuestion = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

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

  // 2. Speech-to-Text Setup (Live Browser preview + Gemini backend initialization)
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
      // Only update if we aren't currently waiting on Gemini
      if (!isTranscribing) {
        let currentSessionTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentSessionTranscript += event.results[i][0].transcript + " ";
        }
        
        const newTranscript = baseTranscriptRef.current 
          ? baseTranscriptRef.current + " " + currentSessionTranscript.trim()
          : currentSessionTranscript.trim();
          
        setTranscript(newTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      // Do not stop listening on error to allow continuous recording.
      // onend will handle restarting the recognition.
    };

    recognition.onend = () => {
      // When a session ends, whatever is in transcriptRef becomes the new base
      // for the next session so we don't overwrite previous text.
      baseTranscriptRef.current = transcriptRef.current;
      
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
  }, [isTranscribing]);

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
    words.forEach((w) => {
      const cleanWord = w.toLowerCase().replace(/[^a-z]/g, "");
      if (fillers.includes(cleanWord) && !found.includes(cleanWord)) {
        found.push(cleanWord);
      }
    });
    setDetectedFillers(found);
  }, [transcript, durationSeconds]);

  const processAudioWithGemini = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      setIsTranscribing(true);
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: audioBlob.type || "audio/webm",
            }),
          });
          
          const data = await response.json();
          if (data.text) {
            const newTranscript = absoluteBaseTranscriptRef.current
              ? absoluteBaseTranscriptRef.current + " " + data.text.trim()
              : data.text.trim();
            setTranscript(newTranscript);
            baseTranscriptRef.current = newTranscript;
            resolve(newTranscript);
          } else {
            resolve(transcriptRef.current);
          }
        } catch (err) {
          console.error("Gemini Transcription failed, using browser fallback:", err);
          resolve(transcriptRef.current);
        } finally {
          setIsTranscribing(false);
        }
      };
    });
  };

  const toggleListening = async () => {
    if (isListeningRef.current) {
      // STOP LISTENING
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
    } else {
      // START LISTENING
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
      isListeningRef.current = true;
      setIsListening(true);
      baseTranscriptRef.current = transcriptRef.current;
      absoluteBaseTranscriptRef.current = transcriptRef.current;
      audioChunksRef.current = [];

      try {
        // Start High-Fidelity Audio Recording for Gemini
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          processAudioWithGemini(audioBlob);
          // Stop all mic tracks to clear recording dot
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      } catch (err) {
        console.error("MediaRecorder setup failed:", err);
      }

      // Also start live browser preview
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn("Failed to start speech recognition:", err);
      }
    }
  };

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const handleFinishAndEvaluate = async () => {
    if (wordCount > 20000) {
      alert(
        `Your response has ${wordCount.toLocaleString()} words, which exceeds the maximum limit of 20,000 words. Please trim your response.`
      );
      return;
    }

    isListeningRef.current = false;
    setIsListening(false);
    let finalAnswer = transcriptRef.current;

    try {
      recognitionRef.current?.stop();
    } catch {}

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const recorder = mediaRecorderRef.current;
      finalAnswer = await new Promise<string>((resolve) => {
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (recorder.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop());
          }
          const finalSubText = await processAudioWithGemini(audioBlob);
          resolve(finalSubText);
        };
        recorder.stop();
      });
    }

    finalAnswer = finalAnswer.trim() || "No answer provided by candidate.";
    onSubmitAnswer(finalAnswer, Math.max(10, durationSeconds));
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-5xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
      {/* Top Banner: Question Text & AI Voice Controls */}
      <div className="bg-indigo-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/20 shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                Q{nextQuestionNumber}
              </span>
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-widest">
                {currentQuestion.difficulty} Question
              </span>
            </div>
            <button
              onClick={() => speakQuestion(currentQuestion.questionText)}
              className={`p-2.5 rounded-full transition-all ${
                isAiSpeaking
                  ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 ring-1 ring-rose-500/50"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isAiSpeaking ? "Stop AI Voice" : "Listen to Question"}
            >
              {isAiSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-medium leading-relaxed mt-2 text-indigo-50">
            &quot;{currentQuestion.questionText}&quot;
          </h2>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {Math.floor(durationSeconds / 60)}:
              {(durationSeconds % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Words</span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {wordCount.toLocaleString()}
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
            {isTranscribing && (
              <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold lowercase">
                <RefreshCw className="w-3 h-3 animate-spin" />
                enhancing with gemini ai...
              </span>
            )}
          </label>
        </div>

        <textarea
          rows={5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={isTranscribing}
          placeholder={
            isListening
              ? "Listening to your voice... Speak your response clearly."
              : isTranscribing
              ? "Gemini Audio is converting your voice into high-fidelity text..."
              : "Click 'Start Microphone' below to speak your answer, or type/paste your response directly here (supports 0 to 20,000 words)..."
          }
          className="w-full max-h-72 min-h-[120px] px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs leading-relaxed resize-y font-sans transition disabled:opacity-60"
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

        {/* Bottom controls: Mic toggle and Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={toggleListening}
            disabled={isEvaluating || isEvaluated || isTranscribing}
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
              disabled={isEvaluating || isTranscribing || wordCount > 20000}
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
