"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-element";

  useEffect(() => {
    let active = true;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        setIsInitializing(true);

        // Wait a tick for DOM element to render
        await new Promise((resolve) => setTimeout(resolve, 150));
        
        if (!active) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.65;
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            // Stop camera on successful scan
            cleanupScanner();
          },
          () => {
            // Quiet failure (usually just no QR code found in active frame)
          }
        );

        if (active) {
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Camera init error:", err);
        if (active) {
          const errMsg = err instanceof Error ? err.message : "Gagal mengakses kamera. Pastikan izin kamera telah diberikan.";
          setErrorMsg(errMsg);
          setIsInitializing(false);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      cleanupScanner();
    };
  }, [onScanSuccess]);

  const cleanupScanner = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch((err) => console.error("Error stopping scanner:", err));
      } else {
        scannerRef.current = null;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500 animate-pulse" />
            <h3 className="font-semibold text-sm">Pindai QR Code Alat</h3>
          </div>
          <button
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Scanner Box */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center">
          {/* Reader Element (Camera Output Rendered Here) */}
          <div id={containerId} className="w-full h-full object-cover" />

          {/* Initializing / Loading Indicator */}
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-6 space-y-3">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-xs text-zinc-400">Menghubungkan ke kamera...</p>
            </div>
          )}

          {/* Scanning Box Outline overlay */}
          {!isInitializing && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[65%] h-[65%] border-2 border-blue-500 rounded-2xl relative shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse">
                {/* Scanner Glowing Line animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-blue-500 top-0 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-scannerLine" />
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-6 space-y-4">
              <p className="text-xs text-rose-500 leading-relaxed max-w-xs">{errorMsg}</p>
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setIsInitializing(true);
                  // Trigger reload effect
                  window.location.reload();
                }}
                className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        {/* Guidance Footer */}
        <div className="bg-black/60 px-5 py-4 border-t border-zinc-900 text-center">
          <p className="text-xs text-zinc-400">
            Arahkan kamera ke stiker QR Code peralatan untuk memindai otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}
