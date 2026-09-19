"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Video,
} from "lucide-react";

export type PostureType =
  | "Centered & Focused"
  | "Turned Left"
  | "Turned Right"
  | "Looking Down"
  | "Looking Up"
  | "Looking Away"
  | "No Face Detected";

interface CameraMonitorProps {
  onProctoringNotice?: (message: string) => void;
}

export const CameraMonitor: React.FC<CameraMonitorProps> = ({
  onProctoringNotice,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [engagementScore, setEngagementScore] = useState<number>(97);
  const [postureState, setPostureState] = useState<PostureType>("Centered & Focused");

  // Track face bounding box overlay in percentage (mirrored space)
  const [reticleBox, setReticleBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>({ left: 28, top: 18, width: 44, height: 62 });

  // Native face detector reference if supported
  const nativeDetectorRef = useRef<any>(null);
  const awayCounterRef = useRef<number>(0);

  // Initialize Native FaceDetector if available in Chromium
  useEffect(() => {
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        nativeDetectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch {
        nativeDetectorRef.current = null;
      }
    }
  }, []);

  // 1. Camera Initialization with lifecycle safety and unmount cancellation
  useEffect(() => {
    let isMounted = true;
    let localStream: MediaStream | null = null;

    const startCamera = async () => {
      if (!isCameraActive) return;

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) setCameraError("Webcam not supported on this browser.");
          return;
        }

        // Release any existing tracks on video element before opening new stream
        if (videoRef.current?.srcObject) {
          const currentTracks = (videoRef.current.srcObject as MediaStream).getTracks();
          currentTracks.forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }

        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
            audio: false,
          });
        } catch (firstErr: any) {
          // If first attempt failed with NotReadableError or Overconstrained, fallback to basic constraints
          if (firstErr.name !== "NotAllowedError" && firstErr.name !== "PermissionDeniedError") {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw firstErr;
          }
        }

        // Critical: If the component unmounted while getUserMedia was resolving, stop the tracks immediately!
        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraError(null);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Camera stream unavailable:", err);

        if (err.name === "NotReadableError") {
          setCameraError(
            "Camera is currently in use by another application (Zoom, Teams, Skype, or another browser tab). Close other apps using the webcam and click Retry."
          );
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError(
            "Webcam permission was denied. Please allow camera access in your browser address bar and click Retry."
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No webcam was detected on this device.");
        } else {
          setCameraError("Webcam currently unavailable. You can continue the interview seamlessly without camera.");
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
      }
      if (videoRef.current?.srcObject) {
        const currentTracks = (videoRef.current.srcObject as MediaStream).getTracks();
        currentTracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraActive, retryCount]);

  // 2. Real-Time Computer Vision Frame Analysis Engine (Screen-Space Dual Feature Tracker)
  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;

    let detectedPosture: PostureType = "Centered & Focused";
    let targetScore = 97;

    // Check if Native FaceDetector is supported and works in Chromium
    let handledByNative = false;
    if (nativeDetectorRef.current) {
      try {
        const faces = await nativeDetectorRef.current.detect(video);
        if (faces && faces.length > 0) {
          handledByNative = true;
          const videoW = video.videoWidth || 640;
          const videoH = video.videoHeight || 480;

          // Select primary face closest to center
          let bestFace = faces[0];
          let bestScore = -1;
          for (const f of faces) {
            const b = f.boundingBox;
            const area = b.width * b.height;
            const centerX = b.x + b.width / 2;
            const distFromCenter = Math.abs(centerX - videoW / 2);
            const score = area - distFromCenter * 150;
            if (score > bestScore) {
              bestScore = score;
              bestFace = f;
            }
          }

          const box = bestFace.boundingBox;

          // In Screen Space (mirrored with -scale-x-100):
          const screenFaceCenterX = 1 - (box.x + box.width / 2) / videoW;
          const screenFaceCenterY = (box.y + box.height / 2) / videoH;

          // Check if face center deviates significantly
          if (screenFaceCenterX < 0.35) {
            detectedPosture = "Turned Left";
            targetScore = 72;
          } else if (screenFaceCenterX > 0.65) {
            detectedPosture = "Turned Right";
            targetScore = 72;
          } else if (screenFaceCenterY > 0.70) {
            detectedPosture = "Looking Down";
            targetScore = 70;
          } else if (screenFaceCenterY < 0.20) {
            detectedPosture = "Looking Up";
            targetScore = 75;
          } else {
            detectedPosture = "Centered & Focused";
            targetScore = 98;
          }

          // Reticle in Screen Space
          const screenLeftPct = Math.max(5, Math.min(75, (1 - (box.x + box.width) / videoW) * 100));
          const topPct = Math.max(5, Math.min(75, (box.y / videoH) * 100));
          const widthPct = Math.max(22, Math.min(55, (box.width / videoW) * 100));
          const heightPct = Math.max(28, Math.min(65, (box.height / videoH) * 100));

          setReticleBox((prev) => ({
            left: Math.round(prev.left * 0.6 + screenLeftPct * 0.4),
            top: Math.round(prev.top * 0.6 + topPct * 0.4),
            width: Math.round(prev.width * 0.6 + widthPct * 0.4),
            height: Math.round(prev.height * 0.6 + heightPct * 0.4),
          }));
        } else {
          handledByNative = true;
          detectedPosture = "No Face Detected";
          targetScore = 50;
        }
      } catch {
        handledByNative = false;
      }
    }

    // High-Precision Connected-Component Face Clusterer in Screen Space (Cross-Browser Universal)
    // Isolates the candidate's actual head in the center and rejects background wooden furniture/walls
    if (!handledByNative) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
        canvasRef.current.width = 160;
        canvasRef.current.height = 120;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        const data = imgData.data;

        // 16 cols x 12 rows grid of 10x10 blocks
        const GRID_COLS = 16;
        const GRID_ROWS = 12;
        const CELL_W = 10;
        const CELL_H = 10;

        const cellSkin = new Int16Array(GRID_COLS * GRID_ROWS);
        const cellHair = new Int16Array(GRID_COLS * GRID_ROWS);

        for (let y = 10; y < 112; y += 2) {
          for (let x = 6; x < 154; x += 2) {
            const idx = (y * 160 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const luminance = (r * 299 + g * 587 + b * 114) / 1000;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            // Strict skin chrominance filter
            const isSkin =
              r > 50 &&
              g > 34 &&
              b > 24 &&
              r > g &&
              r > b &&
              r - Math.min(g, b) > 12 &&
              cb >= 78 &&
              cb <= 135 &&
              cr >= 132 &&
              cr <= 180;

            const isHair = luminance < 45;

            // In mirrored screen space:
            const screenX = 159 - x;
            const sCol = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(screenX / CELL_W)));
            const sRow = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y / CELL_H)));
            const cellIdx = sRow * GRID_COLS + sCol;

            if (isSkin) cellSkin[cellIdx]++;
            if (isHair) cellHair[cellIdx]++;
          }
        }

        // Find connected clusters of skin blocks
        const visited = new Uint8Array(GRID_COLS * GRID_ROWS);
        interface FaceCluster {
          minCol: number;
          maxCol: number;
          minRow: number;
          maxRow: number;
          skinCount: number;
          hairAboveCount: number;
          score: number;
        }
        const clusters: FaceCluster[] = [];

        for (let r = 1; r < GRID_ROWS - 1; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const idx = r * GRID_COLS + c;
            // Cell has significant skin density
            if (cellSkin[idx] >= 6 && !visited[idx]) {
              const queue: Array<{ c: number; r: number }> = [{ c, r }];
              visited[idx] = 1;

              let minCol = c;
              let maxCol = c;
              let minRow = r;
              let maxRow = r;
              let totalSkinInCluster = 0;
              let hairAboveInCluster = 0;

              while (queue.length > 0) {
                const curr = queue.shift()!;
                const cIdx = curr.r * GRID_COLS + curr.c;
                totalSkinInCluster += cellSkin[cIdx];

                if (curr.r > 0) {
                  hairAboveInCluster += cellHair[(curr.r - 1) * GRID_COLS + curr.c];
                }

                minCol = Math.min(minCol, curr.c);
                maxCol = Math.max(maxCol, curr.c);
                minRow = Math.min(minRow, curr.r);
                maxRow = Math.max(maxRow, curr.r);

                const neighbors = [
                  { c: curr.c + 1, r: curr.r },
                  { c: curr.c - 1, r: curr.r },
                  { c: curr.c, r: curr.r + 1 },
                  { c: curr.c, r: curr.r - 1 },
                ];

                for (const n of neighbors) {
                  if (n.c >= 0 && n.c < GRID_COLS && n.r >= 0 && n.r < GRID_ROWS) {
                    const nIdx = n.r * GRID_COLS + n.c;
                    if (cellSkin[nIdx] >= 6 && !visited[nIdx]) {
                      visited[nIdx] = 1;
                      queue.push(n);
                    }
                  }
                }
              }

              // Human face cluster score:
              // Prioritize size, presence of dark hair directly above, and proximity to horizontal center (c = 7.5)
              const centerCol = (minCol + maxCol) / 2;
              const distFromCenter = Math.abs(centerCol - 7.5);
              const edgePenalty = centerCol < 3.2 || centerCol > 12.8 ? 80 : 0;
              const score =
                totalSkinInCluster +
                hairAboveInCluster * 2 -
                distFromCenter * 15 -
                edgePenalty;

              clusters.push({
                minCol,
                maxCol,
                minRow,
                maxRow,
                skinCount: totalSkinInCluster,
                hairAboveCount: hairAboveInCluster,
                score,
              });
            }
          }
        }

        if (clusters.length === 0) {
          detectedPosture = "No Face Detected";
          targetScore = 50;
        } else {
          clusters.sort((a, b) => b.score - a.score);
          const best = clusters[0];

          if (best.skinCount < 25) {
            detectedPosture = "No Face Detected";
            targetScore = 50;
          } else {
            // Isolate ONLY the best face cluster (candidate's actual head)
            const minScreenX = best.minCol * CELL_W;
            const maxScreenX = (best.maxCol + 1) * CELL_W;
            const minScreenY = Math.max(8, (best.minRow - 1) * CELL_H);
            const maxScreenY = Math.min(115, (best.maxRow + 1) * CELL_H);

            const headMidScreenX = (minScreenX + maxScreenX) / 2;
            const screenNormX = headMidScreenX / 160;
            const screenNormY = (minScreenY + maxScreenY) / 2 / 120;

            // Symmetry analysis inside the candidate's isolated head ONLY
            let leftSkin = 0;
            let rightSkin = 0;
            let leftHair = 0;
            let rightHair = 0;

            for (let y = minScreenY; y <= maxScreenY; y += 2) {
              for (let x = 6; x < 154; x += 2) {
                const screenX = 159 - x;
                if (screenX < minScreenX || screenX > maxScreenX) continue;

                const idx = (y * 160 + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const luminance = (r * 299 + g * 587 + b * 114) / 1000;
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

                const isSkin =
                  r > 50 &&
                  g > 34 &&
                  b > 24 &&
                  r > g &&
                  r > b &&
                  r - Math.min(g, b) > 12 &&
                  cb >= 78 &&
                  cb <= 135 &&
                  cr >= 132 &&
                  cr <= 180;

                const isDarkHair = luminance < 45;

                if (screenX < headMidScreenX) {
                  if (isSkin) leftSkin++;
                  if (isDarkHair) leftHair++;
                } else {
                  if (isSkin) rightSkin++;
                  if (isDarkHair) rightHair++;
                }
              }
            }

            const skinRatioLeft = leftSkin / (rightSkin + 1);
            const skinRatioRight = rightSkin / (leftSkin + 1);

            // Posture evaluation with realistic deadband
            if (
              screenNormX < 0.35 ||
              (skinRatioLeft > 1.6 && rightHair > leftHair * 1.3)
            ) {
              detectedPosture = "Turned Left";
              targetScore = 72;
            } else if (
              screenNormX > 0.65 ||
              (skinRatioRight > 1.6 && leftHair > rightHair * 1.3)
            ) {
              detectedPosture = "Turned Right";
              targetScore = 72;
            } else if (screenNormY > 0.70) {
              detectedPosture = "Looking Down";
              targetScore = 70;
            } else if (screenNormY < 0.20) {
              detectedPosture = "Looking Up";
              targetScore = 75;
            } else {
              detectedPosture = "Centered & Focused";
              targetScore = 98;
            }

            // Smooth Reticle Positioning tightly around candidate's head
            const reticleLeft = Math.max(5, Math.min(75, (minScreenX / 160) * 100));
            const reticleTop = Math.max(5, Math.min(75, (minScreenY / 120) * 100));
            const reticleWidth = Math.max(22, Math.min(55, ((maxScreenX - minScreenX) / 160) * 100));
            const reticleHeight = Math.max(28, Math.min(65, ((maxScreenY - minScreenY) / 120) * 100));

            setReticleBox((prev) => ({
              left: Math.round(prev.left * 0.7 + reticleLeft * 0.3),
              top: Math.round(prev.top * 0.7 + reticleTop * 0.3),
              width: Math.round(prev.width * 0.7 + reticleWidth * 0.3),
              height: Math.round(prev.height * 0.7 + reticleHeight * 0.3),
            }));
          }
        }
      }
    }

    setPostureState(detectedPosture);

    // Smooth engagement score interpolation
    setEngagementScore((prev) => {
      const smoothed = Math.round(prev * 0.75 + targetScore * 0.25);
      return Math.max(48, Math.min(99, smoothed));
    });

    // Proctoring notice if candidate looks away for prolonged duration
    if (detectedPosture !== "Centered & Focused") {
      awayCounterRef.current += 1;
      if (awayCounterRef.current === 8) {
        onProctoringNotice?.(`Candidate posture warning: ${detectedPosture}`);
      }
    } else {
      awayCounterRef.current = 0;
    }
  }, [onProctoringNotice]);

  // Continuous frame analysis timer (every 160ms = ~6.2 checks/sec)
  useEffect(() => {
    if (!isCameraActive || cameraError) return;

    const interval = setInterval(() => {
      analyzeFrame();
    }, 160);

    return () => clearInterval(interval);
  }, [isCameraActive, cameraError, analyzeFrame]);

  const retryCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current?.srcObject) {
      const currentTracks = (videoRef.current.srcObject as MediaStream).getTracks();
      currentTracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraError(null);
    setIsCameraActive(true);
    setRetryCount((prev) => prev + 1);
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      if (videoRef.current?.srcObject) {
        const currentTracks = (videoRef.current.srcObject as MediaStream).getTracks();
        currentTracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      retryCamera();
    }
  };

  const isCentered = postureState === "Centered & Focused";
  const isTurned =
    postureState === "Turned Left" ||
    postureState === "Turned Right" ||
    postureState === "Looking Down" ||
    postureState === "Looking Up";

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/90 shadow-md flex items-center justify-center group">
      {/* Real Video Stream */}
      {isCameraActive && !cameraError ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        /* Fallback Mock Video stream when camera blocked, in-use, or disabled */
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900 text-white w-full h-full">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <CameraOff className="w-7 h-7" />
          </div>
          <div className="max-w-md px-2 space-y-1">
            <p className="text-xs font-bold text-slate-100">
              {cameraError
                ? cameraError.includes("in use")
                  ? "Camera Device In Use"
                  : "Webcam Blocked or Unavailable"
                : "Camera Turned Off"}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {cameraError || "Audio & speech-to-text will still function seamlessly"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={retryCamera}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera</span>
            </button>
            {cameraError && (
              <button
                type="button"
                onClick={() => {
                  setIsCameraActive(false);
                  setCameraError(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Continue Without Camera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Proctoring Viewfinder HUD Overlay */}
      {isCameraActive && !cameraError && (
        <>
          {/* Dynamic Active Face Tracking Reticle Corners */}
          <div
            className={`absolute pointer-events-none transition-all duration-200 ease-out border rounded-2xl ${
              isCentered
                ? "border-emerald-400/40"
                : isTurned
                ? "border-amber-400/60 shadow-lg shadow-amber-500/20"
                : "border-rose-400/70 shadow-lg shadow-rose-500/20 animate-pulse"
            }`}
            style={{
              left: `${reticleBox.left}%`,
              top: `${reticleBox.top}%`,
              width: `${reticleBox.width}%`,
              height: `${reticleBox.height}%`,
            }}
          >
            {/* Top-Left Corner */}
            <div
              className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 -mt-0.5 -ml-0.5 rounded-tl ${
                isCentered
                  ? "border-emerald-400"
                  : isTurned
                  ? "border-amber-400"
                  : "border-rose-400"
              }`}
            />
            {/* Top-Right Corner */}
            <div
              className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 -mt-0.5 -mr-0.5 rounded-tr ${
                isCentered
                  ? "border-emerald-400"
                  : isTurned
                  ? "border-amber-400"
                  : "border-rose-400"
              }`}
            />
            {/* Bottom-Left Corner */}
            <div
              className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 -mb-0.5 -ml-0.5 rounded-bl ${
                isCentered
                  ? "border-emerald-400"
                  : isTurned
                  ? "border-amber-400"
                  : "border-rose-400"
              }`}
            />
            {/* Bottom-Right Corner */}
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 -mb-0.5 -mr-0.5 rounded-br ${
                isCentered
                  ? "border-emerald-400"
                  : isTurned
                  ? "border-amber-400"
                  : "border-rose-400"
              }`}
            />

            {/* Sub-label under reticle when posture changes */}
            {!isCentered && (
              <div
                className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide whitespace-nowrap shadow-md backdrop-blur-md ${
                  isTurned
                    ? "bg-amber-500/90 text-slate-900"
                    : "bg-rose-500/90 text-white"
                }`}
              >
                {postureState}
              </div>
            )}
          </div>

          {/* Top Proctoring HUD Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-medium transition-colors ${
                isCentered
                  ? "bg-black/60 border-neutral-700/60 text-emerald-400"
                  : isTurned
                  ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
                  : "bg-rose-950/80 border-rose-500/40 text-rose-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isCentered
                    ? "bg-emerald-400"
                    : isTurned
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              <span>{isCentered ? "LIVE PROCTORING" : "ATTENTION NOTICE"}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-semibold transition-colors ${
                engagementScore >= 85
                  ? "bg-black/60 border-neutral-700/60 text-white"
                  : engagementScore >= 70
                  ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
                  : "bg-rose-950/80 border-rose-500/40 text-rose-300"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Focus: {engagementScore}%</span>
            </div>
          </div>

          {/* Turn / Attention Warning Toast if candidate turns away */}
          {!isCentered && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] shadow-lg backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in duration-150">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
              <span>Face Camera Notice: {postureState}</span>
            </div>
          )}

          {/* Bottom HUD Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs transition-colors shadow-sm ${
                isCentered
                  ? "bg-black/75 border-neutral-700/70 text-slate-200"
                  : isTurned
                  ? "bg-amber-950/80 border-amber-500/50 text-amber-200"
                  : "bg-rose-950/90 border-rose-500/60 text-rose-200"
              }`}
            >
              {isCentered ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : isTurned ? (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              )}
              <span>
                Posture: <strong>{postureState}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={toggleCamera}
              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-neutral-800 text-white hover:text-indigo-400 transition shadow-sm"
              title="Toggle Camera"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
