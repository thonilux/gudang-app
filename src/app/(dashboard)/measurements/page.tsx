import { getDb } from "@/db";
import { equipmentMeasurements, equipment } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MeasurementsViewer } from "./measurements-viewer";
import { getCurrentAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function MeasurementsPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  const db = await getDb();
  const rawMeasurements = await db
    .select({
      id: equipmentMeasurements.id,
      equipmentId: equipmentMeasurements.equipmentId,
      measurementDate: equipmentMeasurements.measurementDate,
      method: equipmentMeasurements.method,
      distanceMeter: equipmentMeasurements.distanceMeter,
      axis: equipmentMeasurements.axis,
      parsedJson: equipmentMeasurements.parsedJson,
      avgCoherence: equipmentMeasurements.avgCoherence,
      validFrequencyMin: equipmentMeasurements.validFrequencyMin,
      validFrequencyMax: equipmentMeasurements.validFrequencyMax,
      peakResponseDb: equipmentMeasurements.peakResponseDb,
      deepestDipDb: equipmentMeasurements.deepestDipDb,
      hfTrendDb: equipmentMeasurements.hfTrendDb,
      healthScore: equipmentMeasurements.healthScore,
      resultStatus: equipmentMeasurements.resultStatus,
      engineerNote: equipmentMeasurements.engineerNote,
      equipmentName: equipment.name,
      equipmentModel: equipment.model,
    })
    .from(equipmentMeasurements)
    .innerJoin(equipment, eq(equipmentMeasurements.equipmentId, equipment.id))
    .orderBy(desc(equipmentMeasurements.measurementDate));

  const measurements = rawMeasurements.map((m) => ({
    ...m,
    parsedJson: m.parsedJson as {
      frequency: number[];
      magnitude: number[];
      phase: (number | null)[];
      coherence: (number | null)[];
    } | null,
  }));

  return <MeasurementsViewer measurements={measurements} />;
}
