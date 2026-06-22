export interface SmaartDataPoint {
  frequency: number;
  magnitude: number;
  phase: number | null;
  coherence: number | null;
}

export interface ParsedMeasurementResult {
  dataPoints: SmaartDataPoint[];
  avgCoherence: number;
  validFrequencyMin: number | null;
  validFrequencyMax: number | null;
  peakResponseDb: number;
  deepestDipDb: number;
  hfTrendDb: number;
  healthScore: number;
  resultStatus: "pass" | "warning" | "fail";
}

/**
 * Parses raw text from a Smaart ASCII file.
 * Expected columns: Frequency (Hz), Magnitude (dB), Phase (deg, optional), Coherence (0-1 or 0-100%, optional)
 */
export function parseSmaartAscii(rawText: string): ParsedMeasurementResult {
  const lines = rawText.split(/\r?\n/);
  const dataPoints: SmaartDataPoint[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Check if the line starts with a number (either positive, negative, or starting with a decimal point)
    if (!/^[+-]?\d/.test(trimmed)) {
      continue; // Skip comments/headers
    }

    // Split by comma, tab, or whitespace
    const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
    if (tokens.length < 2) {
      continue; // Need at least frequency and magnitude
    }

    const frequency = parseFloat(tokens[0]);
    const magnitude = parseFloat(tokens[1]);
    
    if (isNaN(frequency) || isNaN(magnitude)) {
      continue;
    }

    const phaseVal = tokens[2] ? parseFloat(tokens[2]) : null;
    const phase = phaseVal !== null && !isNaN(phaseVal) ? phaseVal : null;

    const coherenceVal = tokens[3] ? parseFloat(tokens[3]) : null;
    let coherence = coherenceVal !== null && !isNaN(coherenceVal) ? coherenceVal : null;

    // Normalize coherence to 0-1 if it was exported on a 0-100 scale
    if (coherence !== null && coherence > 1.0) {
      coherence = coherence / 100;
    }
    // Clamp coherence
    if (coherence !== null) {
      coherence = Math.max(0, Math.min(1, coherence));
    }

    dataPoints.push({
      frequency,
      magnitude,
      phase,
      coherence,
    });
  }

  if (dataPoints.length === 0) {
    throw new Error("Tidak ada data pengukuran frekuensi yang valid ditemukan di dalam file.");
  }

  // Calculate summary metrics
  let totalCoherence = 0;
  let coherenceCount = 0;
  let peakResponseDb = -Infinity;
  let deepestDipDb = Infinity;

  // HF trend calculation (high frequency vs mid frequency)
  let hfSum = 0;
  let hfCount = 0;
  let mfSum = 0;
  let mfCount = 0;

  // Valid frequency range where coherence is acceptable (>= 0.5)
  let validFreqMin: number | null = null;
  let validFreqMax: number | null = null;

  for (const pt of dataPoints) {
    if (pt.coherence !== null) {
      totalCoherence += pt.coherence;
      coherenceCount++;

      if (pt.coherence >= 0.5) {
        if (validFreqMin === null || pt.frequency < validFreqMin) {
          validFreqMin = pt.frequency;
        }
        if (validFreqMax === null || pt.frequency > validFreqMax) {
          validFreqMax = pt.frequency;
        }
      }
    }

    if (pt.magnitude > peakResponseDb) {
      peakResponseDb = pt.magnitude;
    }
    if (pt.magnitude < deepestDipDb) {
      deepestDipDb = pt.magnitude;
    }

    // Mid Frequency (500Hz - 2000Hz)
    if (pt.frequency >= 500 && pt.frequency <= 2000) {
      mfSum += pt.magnitude;
      mfCount++;
    }
    // High Frequency (5000Hz - 20000Hz)
    if (pt.frequency >= 5000 && pt.frequency <= 20000) {
      hfSum += pt.magnitude;
      hfCount++;
    }
  }

  const avgCoherence = coherenceCount > 0 ? totalCoherence / coherenceCount : 1.0;
  const avgMf = mfCount > 0 ? mfSum / mfCount : 0;
  const avgHf = hfCount > 0 ? hfSum / hfCount : 0;
  const hfTrendDb = avgHf - avgMf;

  // Health score calculation
  // Base health is driven by average coherence (0-100)
  let healthScore = Math.round(avgCoherence * 100);

  // Deduct health score for extreme dips (e.g. dips below -15dB)
  if (deepestDipDb < -15) {
    const penalty = Math.min(30, Math.round((Math.abs(deepestDipDb) - 15) * 2));
    healthScore = Math.max(10, healthScore - penalty);
  }

  // Determine result status
  let resultStatus: "pass" | "warning" | "fail" = "pass";
  if (avgCoherence < 0.6 || healthScore < 50 || deepestDipDb < -25) {
    resultStatus = "fail";
  } else if (avgCoherence < 0.75 || healthScore < 75 || deepestDipDb < -12) {
    resultStatus = "warning";
  }

  return {
    dataPoints,
    avgCoherence,
    validFrequencyMin: validFreqMin,
    validFrequencyMax: validFreqMax,
    peakResponseDb: isFinite(peakResponseDb) ? peakResponseDb : 0,
    deepestDipDb: isFinite(deepestDipDb) ? deepestDipDb : 0,
    hfTrendDb,
    healthScore,
    resultStatus,
  };
}
