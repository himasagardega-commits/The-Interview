import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface DeviceSetupProps {
  onSetupComplete: () => void;
  onCancel: () => void;
}

export const DeviceSetup: React.FC<DeviceSetupProps> = ({ onSetupComplete, onCancel }) => {
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check initial permission states if supported
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any }).then((res) => {
        setCameraPermission(res.state);
        res.onchange = () => setCameraPermission(res.state);
      }).catch(() => {});
      
      navigator.permissions.query({ name: 'microphone' as any }).then((res) => {
        setMicPermission(res.state);
        res.onchange = () => setMicPermission(res.state);
      }).catch(() => {});
    }
  }, []);

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      setCameraPermission('granted');
      setMicPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error("Error accessing media devices:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setMicPermission('denied');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleStartInterview = () => {
    // Stop tracks to release the camera/mic before handing off to the main interview components
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onSetupComplete();
  };

  const isGranted = cameraPermission === 'granted' && micPermission === 'granted';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">System Check</h2>
          <p className="text-indigo-100 mt-2 font-medium">Please grant access to your camera and microphone to start the interview.</p>
        </div>

        {/* Content */}
        <div className="p-8">
          
          {/* Video Preview */}
          <div className="w-full bg-slate-900 rounded-2xl aspect-video mb-8 overflow-hidden relative border border-slate-200 shadow-inner flex items-center justify-center">
            {isGranted ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="text-center p-6">
                <div className="flex gap-4 justify-center mb-4 text-slate-400">
                  <Camera className="w-8 h-8" />
                  <Mic className="w-8 h-8" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Preview will appear here once permissions are granted.</p>
              </div>
            )}
            
            {/* Status Overlays */}
            {isGranted && (
              <div className="absolute top-4 left-4 bg-emerald-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg border border-emerald-400/50">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                Active
              </div>
            )}
          </div>

          {/* Permissions Checklist */}
          <div className="space-y-4 mb-8">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${cameraPermission === 'granted' ? 'bg-emerald-50 border-emerald-200' : cameraPermission === 'denied' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cameraPermission === 'granted' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Camera Access</h4>
                  <p className="text-xs text-slate-500 font-medium">Required for proctoring</p>
                </div>
              </div>
              <div>
                {cameraPermission === 'granted' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : cameraPermission === 'denied' ? <AlertCircle className="w-6 h-6 text-rose-500" /> : <div className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-600 rounded-md">Pending</div>}
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${micPermission === 'granted' ? 'bg-emerald-50 border-emerald-200' : micPermission === 'denied' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${micPermission === 'granted' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Microphone Access</h4>
                  <p className="text-xs text-slate-500 font-medium">Required for answering questions</p>
                </div>
              </div>
              <div>
                {micPermission === 'granted' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : micPermission === 'denied' ? <AlertCircle className="w-6 h-6 text-rose-500" /> : <div className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-600 rounded-md">Pending</div>}
              </div>
            </div>
            
            {(cameraPermission === 'denied' || micPermission === 'denied') && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-800 mb-1">Permissions Denied</h4>
                  <p className="text-xs text-rose-600 font-medium leading-relaxed">
                    You have blocked camera or microphone access. Please click the lock icon in your browser's address bar, allow permissions, and refresh the page.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition text-sm"
            >
              Cancel
            </button>
            
            {!isGranted ? (
              <button
                onClick={requestPermissions}
                disabled={isRequesting || cameraPermission === 'denied' || micPermission === 'denied'}
                className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-sm"
              >
                {isRequesting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Requesting...</>
                ) : (
                  <>Grant Permissions</>
                )}
              </button>
            ) : (
              <button
                onClick={handleStartInterview}
                className="flex-[2] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 text-sm group"
              >
                Start Interview
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
