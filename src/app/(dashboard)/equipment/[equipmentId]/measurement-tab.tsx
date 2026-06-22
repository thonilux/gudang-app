"use client";
import { useActionState, useState } from "react";
import { Loader2, UploadCloud, Trash2, BarChart3 } from "lucide-react";

import { addEquipmentMeasurementAction, deleteEquipmentMeasurementAction } from "./measurement-actions";

type DBMeasurement = {
  id: string;
  equipmentId: string;
  measurementDate: Date;
  method: string;
  distanceMeter: string;
  axis: string;
  parsedJson: {
    frequency: number[];
    magnitude: number[];
    phase: (number | null)[];
    coherence: (number | null)[];
  } | null;
  avgCoherence: string;
  validFrequencyMin: string | null;
  validFrequencyMax: string | null;
  peakResponseDb: string | null;
  deepestDipDb: string | null;
  hfTrendDb: string | null;
  healthScore: number;
  resultStatus: string;
  engineerNote: string;
};

interface MeasurementTabProps {
  equipmentId: string;
  measurements: DBMeasurement[];
}

export function MeasurementTab({ equipmentId, measurements }: MeasurementTabProps) {
  const [selectedId, setSelectedId] = useState<string>(measurements[0]?.id ?? "");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [state, formAction, pending] = useActionState(addEquipmentMeasurementAction, {});
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteEquipmentMeasurementAction, {});
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeMeasurement = measurements.find((m) => m.id === selectedId) ?? null;

  // SVG dimensions
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 30;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Logarithmic frequency scale helpers (20Hz - 20kHz)
  const fMin = 20;
  const fMax = 20000;
  const logFMin = Math.log10(fMin);
  const logFMax = Math.log10(fMax);

  const getX = (freq: number) => {
    if (freq < fMin) return paddingLeft;
    if (freq > fMax) return chartWidth - paddingRight;
    const logFreq = Math.log10(freq);
    return paddingLeft + ((logFreq - logFMin) / (logFMax - logFMin)) * graphWidth;
  };

  // Magnitude scale helpers (+18dB to -18dB)
  const dbMax = 18;
  const dbMin = -18;
  const getYMag = (db: number) => {
    const clampedDb = Math.max(dbMin, Math.min(dbMax, db));
    return paddingTop + ((dbMax - clampedDb) / (dbMax - dbMin)) * graphHeight;
  };

  // Coherence scale helpers (0.0 to 1.0)
  const getYCoh = (coh: number) => {
    const clamped = Math.max(0, Math.min(1, coh));
    return paddingTop + (1.0 - clamped) * graphHeight;
  };

  // Generate SVG Path for Magnitude
  const generateMagPath = (freqs: number[], mags: number[]) => {
    if (!freqs || freqs.length === 0) return "";
    let d = "";
    for (let i = 0; i < freqs.length; i++) {
      const x = getX(freqs[i]);
      const y = getYMag(mags[i]);
      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        d += ` L ${x} ${y}`;
      }
    }
    return d;
  };

  // Generate SVG Path for Coherence
  const generateCohPath = (freqs: number[], cohs: (number | null)[]) => {
    if (!freqs || freqs.length === 0) return "";
    let d = "";
    let first = true;
    for (let i = 0; i < freqs.length; i++) {
      const coh = cohs[i];
      if (coh === null || isNaN(coh)) continue;
      const x = getX(freqs[i]);
      const y = getYCoh(coh);
      if (first) {
        d += `M ${x} ${y}`;
        first = false;
      } else {
        d += ` L ${x} ${y}`;
      }
    }
    return d;
  };

  // Grid frequencies (labeled markers)
  const gridFreqs = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const formatFreqLabel = (f: number) => {
    if (f >= 1000) return `${f / 1000}k`;
    return f.toString();
  };



  return (
    <div className="space-y-6">
      {/* Upload Form Modal Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Riwayat Pengukuran Smaart</h2>
          <p className="text-sm text-muted">
            Bandingkan respon frekuensi dan koherensi speaker terhadap baseline.
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          <UploadCloud className="h-4 w-4" />
          {showUploadForm ? "Tutup Form" : "Unggah Pengukuran Baru"}
        </button>
      </div>

      {showUploadForm && (
        <aside className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4">
          <h3 className="font-semibold text-text">Unggah File Smaart ASCII</h3>
          <p className="text-xs text-muted leading-relaxed">
            Ekspor data pengukuran Smaart Anda ke format text/ASCII (biasanya berisi kolom: Freq, Mag, Phase, Coh).
            Pastikan meletakkan mikrofon di posisi SOP tetap (on-axis, jarak 1 meter, volume terkalibrasi).
          </p>
          <form action={formAction} className="space-y-4 pt-2">
            <input type="hidden" name="equipmentId" value={equipmentId} />
            <input type="hidden" name="redirectTo" value={`/equipment/${equipmentId}?tab=pengukuran`} />

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text">Metode / Alat</span>
                <input
                  type="text"
                  name="method"
                  defaultValue="Smaart ASCII"
                  className="w-full rounded-xl border border-border bg-panelAlt px-4 py-2.5 text-sm outline-none text-text"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text">Jarak Mikrofon</span>
                <input
                  type="text"
                  name="distanceMeter"
                  defaultValue="1.0"
                  placeholder="Contoh: 1.0 meter"
                  className="w-full rounded-xl border border-border bg-panelAlt px-4 py-2.5 text-sm outline-none text-text"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text">Axis</span>
                <input
                  type="text"
                  name="axis"
                  defaultValue="on-axis"
                  className="w-full rounded-xl border border-border bg-panelAlt px-4 py-2.5 text-sm outline-none text-text"
                  required
                />
              </label>
            </div>            <div className="space-y-2">
              <span className="text-sm font-medium text-text block">Metode Input Data</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    inputMode === "file"
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border bg-panelAlt text-muted hover:text-text"
                  }`}
                >
                  Unggah Berkas (.txt/.csv)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    inputMode === "paste"
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border bg-panelAlt text-muted hover:text-text"
                  }`}
                >
                  Tempel Teks ASCII
                </button>
              </div>
            </div>

            {inputMode === "file" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text">File ASCII (.txt / .csv)</span>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-xl cursor-pointer bg-panelAlt hover:bg-panel transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-muted mb-2" />
                      <p className="text-xs text-muted">
                        Klik atau seret file Smaart ASCII ke sini
                      </p>
                    </div>
                    <input type="file" name="rawFile" accept=".txt,.csv" className="hidden" required={inputMode === "file"} />
                  </label>
                </div>
              </label>
            ) : (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text">Tempel Teks Smaart ASCII</span>
                <textarea
                  name="rawTextContent"
                  rows={8}
                  placeholder="Tempel kolom data Smaart ASCII di sini (Frekuensi, Magnitudo, Fasa, Koherensi)..."
                  className="w-full rounded-xl border border-border bg-panelAlt px-4 py-2.5 text-sm font-mono outline-none text-text"
                  required={inputMode === "paste"}
                />
              </label>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium text-text">Catatan Engineer</span>
              <textarea
                name="engineerNote"
                rows={3}
                placeholder="Tuliskan catatan kondisi ruangan, temperatur, atau kelainan yang terdeteksi..."
                className="w-full rounded-xl border border-border bg-panelAlt px-4 py-2.5 text-sm outline-none text-text"
              />
            </label>

            {state.error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan & Proses Data
            </button>
          </form>
        </aside>
      )}

      {measurements.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-border bg-panel p-10 text-center">
          <BarChart3 className="h-10 w-10 text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text">Belum Ada Riwayat Pengukuran</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-2 leading-relaxed">
            Speaker ini belum pernah diukur menggunakan SOP Smaart ASCII. Silakan unggah file pengukuran pertama Anda untuk mendeteksi kesehatan speaker.
          </p>
        </article>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* History Selection Sidebar */}
          <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft space-y-4 h-fit">
            <h3 className="font-semibold text-text">Riwayat Tes</h3>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {measurements.map((m) => {
                const isActive = m.id === selectedId;
                const statusColor =
                  m.resultStatus === "pass"
                    ? "bg-emerald-500"
                    : m.resultStatus === "warning"
                    ? "bg-amber-500"
                    : "bg-rose-500";
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isActive
                        ? "border-accent bg-accent/5 text-text"
                        : "border-border bg-panel hover:bg-panelAlt text-text"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold">
                        {new Date(m.measurementDate).toLocaleDateString("id-ID", {
                          dateStyle: "medium",
                        })}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        Jarak {m.distanceMeter}m · {m.axis}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{m.healthScore}%</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {activeMeasurement && (
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Diunggah oleh</span>
                  <span className="text-xs font-semibold text-text">Sistem / Admin</span>
                </div>
                <form action={deleteFormAction}>
                  <input type="hidden" name="id" value={activeMeasurement.id} />
                  <input type="hidden" name="equipmentId" value={equipmentId} />
                  <button
                    type="submit"
                    disabled={deletePending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Pengukuran
                  </button>
                  {deleteState.error && (
                    <p className="text-xs text-rose-600 mt-2">{deleteState.error}</p>
                  )}
                </form>
              </div>
            )}
          </article>

          {/* Active Graph Details Panel */}
          {activeMeasurement && (() => {
            const freqs = activeMeasurement.parsedJson?.frequency ?? [];
            const mags = activeMeasurement.parsedJson?.magnitude ?? [];
            const phases = activeMeasurement.parsedJson?.phase ?? [];
            const cohs = activeMeasurement.parsedJson?.coherence ?? [];



            const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
              if (freqs.length === 0) return;
              const container = e.currentTarget;
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              
              // Calculate relative to the graph area
              const relativeX = x - paddingLeft;
              if (relativeX < 0 || relativeX > graphWidth) {
                setHoverIndex(null);
                return;
              }
              
              const fraction = relativeX / graphWidth;
              const logFreq = logFMin + fraction * (logFMax - logFMin);
              const targetFreq = Math.pow(10, logFreq);
              
              let closestIndex = 0;
              let minDiff = Math.abs(freqs[0] - targetFreq);
              for (let i = 1; i < freqs.length; i++) {
                const diff = Math.abs(freqs[i] - targetFreq);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIndex = i;
                }
              }
              setHoverIndex(closestIndex);
            };

            const handleMouseLeave = () => {
              setHoverIndex(null);
            };

            // Calculate active values (hover or average/summary)
            const activeFreq = hoverIndex !== null ? freqs[hoverIndex] : null;
            const activeMag = hoverIndex !== null ? mags[hoverIndex] : null;
            const activePhase = hoverIndex !== null ? phases[hoverIndex] : null;
            const activeCoh = hoverIndex !== null ? cohs[hoverIndex] : null;

            const formatActiveFreq = (f: number | null) => {
              if (f === null) return "-- Hz";
              if (f >= 1000) return `${(f / 1000).toFixed(2)} kHz`;
              return `${f.toFixed(1)} Hz`;
            };

            const formatActiveMag = (m: number | null) => {
              if (m === null) return "-- dB";
              return `${m > 0 ? "+" : ""}${m.toFixed(2)} dB`;
            };

            const formatActivePhase = (p: number | null) => {
              if (p === null) return "-- °";
              return `${p.toFixed(1)} °`;
            };

            const formatActiveCoh = (c: number | null) => {
              if (c === null) return "-- %";
              return `${Math.round(c * 100)} %`;
            };

            // Y scales
            const getYPhase = (deg: number) => {
              const clamped = Math.max(-180, Math.min(180, deg));
              return paddingTop + ((180 - clamped) / 360) * graphHeight;
            };

            const generatePhasePath = (fList: number[], pList: (number | null)[]) => {
              if (!fList || fList.length === 0) return "";
              let d = "";
              let first = true;
              for (let i = 0; i < fList.length; i++) {
                const phase = pList[i];
                if (phase === null || isNaN(phase)) continue;
                const x = getX(fList[i]);
                const y = getYPhase(phase);
                if (first) {
                  d += `M ${x} ${y}`;
                  first = false;
                } else {
                  const prevPhase = pList[i - 1];
                  if (prevPhase !== null && Math.abs(phase - prevPhase) > 280) {
                    d += ` M ${x} ${y}`; // Jump to prevent vertical line on wrap
                  } else {
                    d += ` L ${x} ${y}`;
                  }
                }
              }
              return d;
            };

            return (
              <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 text-zinc-100">
                {/* 1. Smaart Header Display */}
                <div className="bg-black/40 rounded-xl border border-zinc-800 px-6 py-3 flex items-center justify-between font-mono text-base md:text-lg">
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    <span className="text-emerald-400 font-bold">
                      {formatActiveFreq(activeFreq)}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {formatActiveMag(activeMag)}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      {formatActivePhase(activePhase)}
                    </span>
                    <span className="text-rose-500 font-bold">
                      {formatActiveCoh(activeCoh)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 hidden sm:block">
                    {hoverIndex !== null ? "CURSOR ACTIVE" : "HOVER TO INSPECT"}
                  </div>
                </div>

                {/* 2. Smaart Graphic Analyzer Board */}
                <div 
                  className="relative select-none cursor-crosshair bg-black rounded-xl border border-zinc-800 overflow-hidden"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Phase Graph (Top) */}
                  <div className="border-b border-zinc-800/80">
                    <div className="px-3 pt-2 text-[10px] font-bold text-zinc-500 flex justify-between">
                      <span>Phase ▼</span>
                      <span>mg bawah ▼</span>
                    </div>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto text-zinc-400 overflow-visible">
                      {/* Gridlines phase (Horizontal: 60 deg steps) */}
                      {[-180, -120, -60, 0, 60, 120, 180].map((deg) => {
                        const y = getYPhase(deg);
                        return (
                          <g key={deg}>
                            <line
                              x1={paddingLeft}
                              y1={y}
                              x2={chartWidth - paddingRight}
                              y2={y}
                              stroke="#222"
                              strokeWidth={deg === 0 ? "1" : "0.5"}
                              strokeDasharray={deg === 0 ? "0" : "3,3"}
                            />
                            <text
                              x={paddingLeft - 8}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[9px] fill-zinc-500 font-mono"
                            >
                              {deg}
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical Frequency Gridlines */}
                      {gridFreqs.map((freq) => {
                        const x = getX(freq);
                        return (
                          <line
                            key={freq}
                            x1={x}
                            y1={paddingTop}
                            x2={x}
                            y2={chartHeight - paddingBottom}
                            stroke="#222"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                          />
                        );
                      })}

                      {/* Phase Path (Green/Cyan) */}
                      {freqs.length > 0 && (
                        <path
                          d={generatePhasePath(freqs, phases)}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Hover vertical line cursor */}
                      {hoverIndex !== null && (
                        <line
                          x1={getX(freqs[hoverIndex])}
                          y1={paddingTop}
                          x2={getX(freqs[hoverIndex])}
                          y2={chartHeight - paddingBottom}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.5"
                        />
                      )}
                    </svg>
                  </div>

                  {/* Magnitude & Coherence Graph (Bottom) */}
                  <div>
                    <div className="px-3 pt-2 text-[10px] font-bold text-zinc-500 flex justify-between">
                      <span>Magnitude ▼</span>
                      <span>mg bawah ▼</span>
                    </div>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto text-zinc-400 overflow-visible">
                      {/* Gridlines magnitude (Horizontal: 6dB steps) */}
                      {[-18, -12, -6, 0, 6, 12, 18].map((db) => {
                        const y = getYMag(db);
                        return (
                          <g key={db}>
                            <line
                              x1={paddingLeft}
                              y1={y}
                              x2={chartWidth - paddingRight}
                              y2={y}
                              stroke="#222"
                              strokeWidth={db === 0 ? "1" : "0.5"}
                              strokeDasharray={db === 0 ? "0" : "3,3"}
                            />
                            <text
                              x={paddingLeft - 8}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[9px] fill-zinc-500 font-mono"
                            >
                              {db > 0 ? `+${db}` : db}
                            </text>
                          </g>
                        );
                      })}

                      {/* Right Coherence Labels (0 - 100%) */}
                      {[0, 20, 40, 60, 80, 100].map((cVal) => {
                        const y = getYCoh(cVal / 100);
                        return (
                          <g key={cVal}>
                            <text
                              x={chartWidth - paddingRight + 8}
                              y={y + 3}
                              textAnchor="start"
                              className="text-[9px] fill-zinc-500 font-mono"
                            >
                              {cVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical Frequency Gridlines & bottom X-labels */}
                      {gridFreqs.map((freq) => {
                        const x = getX(freq);
                        return (
                          <g key={freq}>
                            <line
                              x1={x}
                              y1={paddingTop}
                              x2={x}
                              y2={chartHeight - paddingBottom}
                              stroke="#222"
                              strokeWidth="0.5"
                              strokeDasharray="2,2"
                            />
                            <text
                              x={x}
                              y={chartHeight - paddingBottom + 14}
                              textAnchor="middle"
                              className="text-[9px] fill-zinc-500 font-mono"
                            >
                              {formatFreqLabel(freq)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Coherence Response Line (Green/Cyan) */}
                      {freqs.length > 0 && cohs.length > 0 && (
                        <path
                          d={generateCohPath(freqs, cohs)}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.85"
                        />
                      )}

                      {/* Magnitude Response Line (Red) */}
                      {freqs.length > 0 && mags.length > 0 && (
                        <path
                          d={generateMagPath(freqs, mags)}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Hover vertical line cursor */}
                      {hoverIndex !== null && (
                        <line
                          x1={getX(freqs[hoverIndex])}
                          y1={paddingTop}
                          x2={getX(freqs[hoverIndex])}
                          y2={chartHeight - paddingBottom}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.5"
                        />
                      )}
                    </svg>
                  </div>
                </div>

                {/* 3. Detail Diagnosa Card */}
                <div className="grid gap-4 sm:grid-cols-4 pt-2">
                  <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Status Uji</span>
                    <div className="mt-1 flex items-center gap-1.5 font-bold">
                      {activeMeasurement.resultStatus === "pass" ? (
                        <span className="text-emerald-400">PASS</span>
                      ) : activeMeasurement.resultStatus === "warning" ? (
                        <span className="text-amber-400">WARN</span>
                      ) : (
                        <span className="text-rose-400">FAIL</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Skor Kesehatan</span>
                    <div className="mt-1 text-lg font-bold text-zinc-100">{activeMeasurement.healthScore}%</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Rata-rata Koherensi</span>
                    <div className="mt-1 text-lg font-bold text-zinc-100">
                      {Math.round(parseFloat(activeMeasurement.avgCoherence) * 100)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Puncak / Lembah</span>
                    <div className="mt-1 text-sm font-bold text-zinc-100">
                      {parseFloat(activeMeasurement.peakResponseDb ?? "0").toFixed(1)} / {parseFloat(activeMeasurement.deepestDipDb ?? "0").toFixed(1)} dB
                    </div>
                  </div>
                </div>

                {/* Engineer Notes */}
                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4 space-y-2 text-sm text-zinc-300">
                  <span className="font-semibold block text-zinc-100">Catatan Diagnosa Engineer:</span>
                  <p className="text-zinc-400 leading-relaxed">
                    {activeMeasurement.engineerNote || "Tidak ada catatan tambahan."}
                  </p>
                  {activeMeasurement.validFrequencyMin && activeMeasurement.validFrequencyMax && (
                    <p className="text-xs text-zinc-500 pt-1">
                      * Rentang frekuensi respon koheren yang valid: {parseFloat(activeMeasurement.validFrequencyMin).toFixed(0)} Hz - {parseFloat(activeMeasurement.validFrequencyMax).toFixed(0)} Hz.
                    </p>
                  )}
                </div>
              </article>
            );
          })()}
        </section>
      )}
    </div>
  );
}
