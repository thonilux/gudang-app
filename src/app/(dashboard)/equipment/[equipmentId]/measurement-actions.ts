"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { equipmentMeasurements, equipment } from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { parseSmaartAscii } from "@/features/measurements/parser";

export type MeasurementActionState = {
  error?: string;
};

const measurementSchema = z.object({
  equipmentId: z.string().uuid("ID peralatan tidak valid."),
  method: z.string().trim().min(1, "Metode pengukuran wajib diisi."),
  distanceMeter: z.string().trim().min(1, "Jarak mik wajib diisi."),
  axis: z.string().trim().min(1, "Axis pengukuran wajib diisi."),
  engineerNote: z.string().trim().optional(),
  redirectTo: z.string().trim().optional(),
});

async function requireEquipmentWriteAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "equipment.write")) {
    redirect("/akses-ditolak");
  }

  return session;
}

export async function addEquipmentMeasurementAction(
  _state: MeasurementActionState,
  formData: FormData,
): Promise<MeasurementActionState> {
  const session = await requireEquipmentWriteAccess();

  const parsed = measurementSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    method: formData.get("method"),
    distanceMeter: formData.get("distanceMeter"),
    axis: formData.get("axis"),
    engineerNote: formData.get("engineerNote") ?? "",
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data form tidak valid.",
    };
  }

  const rawTextContent = formData.get("rawTextContent") as string | null;
  const rawFile = formData.get("rawFile") as File | null;

  let fileContent = "";

  if (rawTextContent && rawTextContent.trim().length > 0) {
    fileContent = rawTextContent;
  } else if (rawFile && rawFile.size > 0) {
    try {
      fileContent = await rawFile.text();
    } catch {
      return { error: "Gagal membaca isi berkas teks." };
    }
  } else {
    return { error: "Berkas file ASCII Smaart atau tempelan teks wajib diisi." };
  }

  const db = getDb();
  const equipmentRow = await db.query.equipment.findFirst({
    where: eq(equipment.id, parsed.data.equipmentId),
  });

  if (!equipmentRow) {
    return { error: "Peralatan tidak ditemukan." };
  }

  try {
    // Parse the Smaart ASCII file content
    const parsedData = parseSmaartAscii(fileContent);

    // Format parsed data points into flat arrays as requested in the parsed JSON example
    const frequencies: number[] = [];
    const magnitudes: number[] = [];
    const phases: (number | null)[] = [];
    const coherences: (number | null)[] = [];

    for (const pt of parsedData.dataPoints) {
      frequencies.push(pt.frequency);
      magnitudes.push(pt.magnitude);
      phases.push(pt.phase);
      coherences.push(pt.coherence);
    }

    const parsedJsonPayload = {
      frequency: frequencies,
      magnitude: magnitudes,
      phase: phases,
      coherence: coherences,
    };

    // Save into database
    await db.insert(equipmentMeasurements).values({
      equipmentId: parsed.data.equipmentId,
      method: parsed.data.method,
      distanceMeter: parsed.data.distanceMeter,
      axis: parsed.data.axis,
      rawText: fileContent,
      parsedJson: parsedJsonPayload,
      avgCoherence: parsedData.avgCoherence.toString(),
      validFrequencyMin: parsedData.validFrequencyMin ? parsedData.validFrequencyMin.toString() : null,
      validFrequencyMax: parsedData.validFrequencyMax ? parsedData.validFrequencyMax.toString() : null,
      peakResponseDb: parsedData.peakResponseDb.toString(),
      deepestDipDb: parsedData.deepestDipDb.toString(),
      hfTrendDb: parsedData.hfTrendDb.toString(),
      healthScore: parsedData.healthScore,
      resultStatus: parsedData.resultStatus,
      engineerNote: parsed.data.engineerNote ?? "",
      createdByUserId: session.user.id,
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "equipment.measurement.create",
      entityType: "equipment",
      entityId: parsed.data.equipmentId,
      summary: `Mencatat data pengukuran baru untuk peralatan ${equipmentRow.code} (Status: ${parsedData.resultStatus.toUpperCase()}, Skor: ${parsedData.healthScore})`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/equipment");
    revalidatePath(`/equipment/${parsed.data.equipmentId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengolah data file Smaart.";
    return { error: message };
  }

  redirect(parsed.data.redirectTo ?? `/equipment/${parsed.data.equipmentId}?tab=pengukuran`);
}

export async function deleteEquipmentMeasurementAction(
  _state: MeasurementActionState,
  formData: FormData,
): Promise<MeasurementActionState> {
  const session = await requireEquipmentWriteAccess();
  const id = String(formData.get("id") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "");

  if (!id || !equipmentId) {
    return { error: "ID tidak valid." };
  }

  const db = getDb();
  try {
    await db.delete(equipmentMeasurements).where(eq(equipmentMeasurements.id, id));

    await writeAuditLog({
      userId: session.user.id,
      action: "equipment.measurement.delete",
      entityType: "equipment",
      entityId: equipmentId,
      summary: `Menghapus data pengukuran peralatan`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/equipment");
    revalidatePath(`/equipment/${equipmentId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus data pengukuran.";
    return { error: message };
  }

  redirect(`/equipment/${equipmentId}?tab=pengukuran`);
}
