import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white/50 p-8 backdrop-blur-sm shadow-soft">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute h-12 w-12 rounded-full border border-blue-200 bg-blue-50/30 animate-ping opacity-75"></div>
        {/* Inner spinning loader */}
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="font-semibold text-slate-800 tracking-tight animate-pulse">Memuat Data...</h3>
        <p className="text-xs text-slate-500 max-w-[240px]">
          Sedang mengambil data terbaru dari server. Silakan tunggu sebentar.
        </p>
      </div>
    </div>
  );
}
