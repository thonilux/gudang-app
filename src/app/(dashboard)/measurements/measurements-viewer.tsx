"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Search, Calendar, MapPin, ArrowUpRight } from "lucide-react";

type UIMeasurement = {
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
  equipmentName: string;
  equipmentModel: string | null;
};

interface MeasurementsViewerProps {
  measurements: UIMeasurement[];
}

export function MeasurementsViewer({ measurements }: MeasurementsViewerProps) {
  const [selectedId, setSelectedId] = useState<string>(measurements[0]?.id ?? "");
  const [compareId, setCompareId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeMeasurement = measurements.find((m) => m.id === selectedId) ?? null;
  const compareMeasurement = measurements.find((m) => m.id === compareId) ?? null;

  // Filter measurements by search query (equipment name or model)
  const filteredMeasurements = measurements.filter(
    (m) =>
      m.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.equipmentModel && m.equipmentModel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // SVG dimensions
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
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
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Pusat Pengukuran Smaart</h1>
        <p className="text-sm text-muted">
          Pusat pemantauan respon frekuensi dan koherensi semua peralatan sistem suara.
        </p>
      </div>

      {measurements.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-border bg-panel p-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text">Belum Ada Riwayat Pengukuran</h3>
          <p className="text-sm text-muted max-w-md mx-auto mt-2 leading-relaxed">
            Tidak ada pengukuran speaker yang ditemukan di sistem. Anda dapat mengunggah pengukuran baru melalui tab Pengukuran di halaman detail masing-masing peralatan.
          </p>
        </article>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar selector */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Cari peralatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-panel px-9 py-2.5 text-sm outline-none text-text focus:border-accent"
              />
            </div>

            <article className="rounded-2xl border border-border bg-panel p-4 shadow-soft space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-2">Daftar Pengukuran</h3>
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredMeasurements.map((m) => {
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
                      onClick={() => {
                        setSelectedId(m.id);
                        if (compareId === m.id) {
                          setCompareId(""); // Clear comparison if same selected
                        }
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                        isActive
                          ? "border-accent bg-accent/5 text-text"
                          : "border-border bg-panel hover:bg-panelAlt text-text"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold truncate max-w-[170px]">
                          {m.equipmentName}
                        </span>
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${statusColor}`} />
                      </div>
                      {m.equipmentModel && (
                        <span className="text-[10px] text-muted block -mt-1">{m.equipmentModel}</span>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-border/40">
                        <span>{new Date(m.measurementDate).toLocaleDateString("id-ID", { dateStyle: "short" })}</span>
                        <span className="font-semibold text-text">{m.healthScore}% Health</span>
                      </div>
                    </button>
                  );
                })}
                {filteredMeasurements.length === 0 && (
                  <p className="text-center text-xs text-muted py-8">Peralatan tidak ditemukan.</p>
                )}
              </div>
            </article>
          </div>

          {/* Smaart Dark Panel Display */}
          {activeMeasurement && (() => {
            const freqs = activeMeasurement.parsedJson?.frequency ?? [];
            const mags = activeMeasurement.parsedJson?.magnitude ?? [];
            const phases = activeMeasurement.parsedJson?.phase ?? [];
            const cohs = activeMeasurement.parsedJson?.coherence ?? [];

            const cFreqs = compareMeasurement?.parsedJson?.frequency ?? [];
            const cMags = compareMeasurement?.parsedJson?.magnitude ?? [];
            const cPhases = compareMeasurement?.parsedJson?.phase ?? [];
            const cCohs = compareMeasurement?.parsedJson?.coherence ?? [];

            // Hover state logic
            const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
              if (freqs.length === 0) return;
              const container = e.currentTarget;
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              
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

            // Active values
            const activeFreq = hoverIndex !== null ? freqs[hoverIndex] : null;
            const activeMag = hoverIndex !== null ? mags[hoverIndex] : null;
            const activePhase = hoverIndex !== null ? phases[hoverIndex] : null;
            const activeCoh = hoverIndex !== null ? cohs[hoverIndex] : null;

            // Find closest frequency index on comparison trace for the active frequency
            let compareHoverIndex: number | null = null;
            if (hoverIndex !== null && activeFreq !== null && cFreqs.length > 0) {
              let minDiff = Math.abs(cFreqs[0] - activeFreq);
              let closestIdx = 0;
              for (let j = 1; j < cFreqs.length; j++) {
                const diff = Math.abs(cFreqs[j] - activeFreq);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = j;
                }
              }
              compareHoverIndex = closestIdx;
            }

            const compMag = compareHoverIndex !== null ? cMags[compareHoverIndex] : null;
            const compPhase = compareHoverIndex !== null ? cPhases[compareHoverIndex] : null;
            const compCoh = compareHoverIndex !== null ? cCohs[compareHoverIndex] : null;

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
                    d += ` M ${x} ${y}`;
                  } else {
                    d += ` L ${x} ${y}`;
                  }
                }
              }
              return d;
            };

            return (
              <div className="space-y-6">
                {/* Active Info Header */}
                <div className="rounded-2xl border border-border bg-panel p-5 flex items-center justify-between shadow-soft flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <h2 className="text-lg font-bold text-text">{activeMeasurement.equipmentName}</h2>
                    {activeMeasurement.equipmentModel && (
                      <p className="text-xs text-muted -mt-0.5">{activeMeasurement.equipmentModel}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(activeMeasurement.measurementDate).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Jarak: {activeMeasurement.distanceMeter}m · {activeMeasurement.axis}</span>
                    </div>
                  </div>

                  {/* Comparison Selector Dropdown */}
                  <div className="flex items-center gap-3">
                    <label className="block text-right">
                      <span className="text-[10px] font-bold text-muted block uppercase tracking-wider mb-1">Bandingkan Dengan</span>
                      <select
                        value={compareId}
                        onChange={(e) => setCompareId(e.target.value)}
                        className="rounded-xl border border-border bg-panelAlt px-3 py-2 text-xs font-semibold outline-none text-text focus:border-accent"
                      >
                        <option value="">(Tanpa Pembanding)</option>
                        {measurements
                          .filter((m) => m.id !== activeMeasurement.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.equipmentName} - {new Date(m.measurementDate).toLocaleDateString("id-ID", { dateStyle: "short" })} ({m.healthScore}%)
                            </option>
                          ))}
                      </select>
                    </label>

                    <Link prefetch={false}
                      href={`/equipment/${activeMeasurement.equipmentId}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-panelAlt px-4 py-2.5 text-xs font-semibold text-text transition hover:bg-panel self-end"
                    >
                      Buka Detail Alat <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Smaart Screen */}
                <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 text-zinc-100">
                  {/* Legend & Realtime Values readout */}
                  <div className="flex flex-col gap-2 bg-black/40 rounded-xl border border-zinc-800 px-6 py-4 font-mono text-sm md:text-base">
                    {/* Active measurement values */}
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-500 block shrink-0" />
                        <span className="text-zinc-400 text-xs truncate max-w-[120px] sm:max-w-[200px]">
                          {activeMeasurement.equipmentName} (Active)
                        </span>
                      </div>
                      <div className="flex gap-x-6 gap-y-1 flex-wrap justify-end">
                        <span className="text-emerald-400 font-bold">{formatActiveFreq(activeFreq)}</span>
                        <span className="text-emerald-400 font-bold">{formatActiveMag(activeMag)}</span>
                        <span className="text-cyan-400 font-bold">{formatActivePhase(activePhase)}</span>
                        <span className="text-emerald-500 font-bold">{formatActiveCoh(activeCoh)}</span>
                      </div>
                    </div>

                    {/* Comparison measurement values (rendered only when selected) */}
                    {compareMeasurement && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-amber-400 block shrink-0" />
                          <span className="text-zinc-400 text-xs truncate max-w-[120px] sm:max-w-[200px]">
                            {compareMeasurement.equipmentName} (Compare)
                          </span>
                        </div>
                        <div className="flex gap-x-6 gap-y-1 flex-wrap justify-end">
                          <span className="text-amber-300 font-bold">{formatActiveFreq(activeFreq)}</span>
                          <span className="text-amber-300 font-bold">{formatActiveMag(compMag)}</span>
                          <span className="text-orange-400 font-bold">{formatActivePhase(compPhase)}</span>
                          <span className="text-amber-400 font-bold">{formatActiveCoh(compCoh)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div 
                    className="relative select-none cursor-crosshair bg-black rounded-xl border border-zinc-800 overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Phase Graph */}
                    <div className="border-b border-zinc-800/80">
                      <div className="px-3 pt-2 text-[10px] font-bold text-zinc-500 flex justify-between">
                        <span>Phase ▼</span>
                        <span>mg bawah ▼</span>
                      </div>
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto text-zinc-400 overflow-visible">
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

                        {/* Comparison Phase Trace (Orange) */}
                        {cFreqs.length > 0 && cPhases.length > 0 && (
                          <path
                            d={generatePhasePath(cFreqs, cPhases)}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.8"
                          />
                        )}

                        {/* Active Phase Trace (Green/Cyan) */}
                        {freqs.length > 0 && (
                          <path
                            d={generatePhasePath(freqs, phases)}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

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

                    {/* Magnitude & Coherence Graph */}
                    <div>
                      <div className="px-3 pt-2 text-[10px] font-bold text-zinc-500 flex justify-between">
                        <span>Magnitude ▼</span>
                        <span>mg bawah ▼</span>
                      </div>
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto text-zinc-400 overflow-visible">
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

                        {/* Comparison Coherence Trace (Gold/Orange dashed) */}
                        {cFreqs.length > 0 && cCohs.length > 0 && (
                          <path
                            d={generateCohPath(cFreqs, cCohs)}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="2,2"
                            opacity="0.7"
                          />
                        )}

                        {/* Comparison Magnitude Trace (Gold/Yellow) */}
                        {cFreqs.length > 0 && cMags.length > 0 && (
                          <path
                            d={generateMagPath(cFreqs, cMags)}
                            fill="none"
                            stroke="#eab308"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.85"
                          />
                        )}

                        {/* Active Coherence Response Line (Green/Cyan) */}
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

                        {/* Active Magnitude Response Line (Red) */}
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

                  {/* Summary Metric Cards */}
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
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
}
