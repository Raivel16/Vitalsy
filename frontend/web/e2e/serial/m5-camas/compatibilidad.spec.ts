import { expect, test } from "../../support/fixtures";
import { assignBed, census, requestBed, type BedRequestInput, type Ctx } from "../../support/scenarios";

// RF-72 (BedCompatibility): cada sugerencia debe cumplir aislamiento, especialidad y género.
async function wardSpecialty(ctx: Ctx): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for (const ward of await census(ctx)) for (const bed of ward.beds) map.set(bed.id, ward.specialty);
  return map;
}

const BASE: BedRequestInput = { patientName: "", specialty: "medicina_interna", gender: "female", isolationType: "ninguno", priority: "media", source: "urgencias" };

test.describe("compatibilidad lecho ↔ paciente (RF-72)", () => {
  const cases: [string, Partial<BedRequestInput>][] = [
    ["paciente femenina sin aislamiento", { gender: "female" }],
    ["paciente masculino sin aislamiento", { gender: "male" }],
    ["paciente con aislamiento de contacto", { isolationType: "contacto" }],
    ["paciente de cirugía", { specialty: "cirugia", gender: "male" }],
  ];
  for (const [name, overrides] of cases) {
    test(`RF-72 · Camas · las sugerencias para ${name} son todas compatibles`, async ({ api, data }) => {
      const ctx = { api, data };
      const input = { ...BASE, ...overrides, patientName: data.patient().fullName };
      const { suggestions } = await requestBed(ctx, input);
      const specialty = await wardSpecialty(ctx);
      expect(suggestions.length, "hay lechos E2E compatibles libres").toBeGreaterThan(0);
      for (const bed of suggestions) {
        const where = `${bed.ward} ${bed.room}-${bed.bedCode}`;
        expect(bed.status, where).toBe("available");
        expect(bed.isolation, `${where} aislamiento`).toBe(input.isolationType !== "ninguno");
        expect(specialty.get(bed.id), `${where} especialidad`).toBe(input.specialty);
        expect(["mixed", input.gender], `${where} género`).toContain(bed.genderPolicy);
      }
    });
  }

  test("RF-72 · Camas · asignar un lecho incompatible se rechaza con el motivo [E5-03]", async ({ api, data }) => {
    const ctx = { api, data };
    const { requestId } = await requestBed(ctx, { ...BASE, gender: "male", patientName: data.patient({ sex: "male" }).fullName });
    const femaleBed = (await census(ctx)).flatMap((w) => w.beds).find((b) => b.genderPolicy === "female" && b.status === "available" && !b.isolation)!;
    const res = await (await api("gestion_camas")).raw("POST", `/beds/requests/${requestId}/assign`, { bedId: femaleBed.id });
    expect(res.status()).toBe(422);
    expect((await res.json()).message).toMatch(/^El lecho no es compatible con el paciente: /);
  });

  test("RF-70 · Camas · sin lecho compatible la solicitud queda en espera [E5-02]", async ({ api, data }) => {
    const { requestId, suggestions } = await requestBed({ api, data }, { ...BASE, specialty: "traumatologia", patientName: data.patient().fullName });
    expect(suggestions).toEqual([]);
    const { requests } = await (await api("gestion_camas")).get<{ requests: { id: number; status: string }[] }>("/beds/requests?status=pendiente,en_espera");
    expect(requests.find((r) => r.id === requestId)?.status).toBe("en_espera");
  });

  test("RF-70 · Camas · la lista de espera se ordena por prioridad clínica", async ({ api, data }) => {
    const ctx = { api, data };
    const mine: number[] = [];
    for (const priority of ["baja", "media", "alta", "critica"] as const) {
      mine.push((await requestBed(ctx, { ...BASE, specialty: "traumatologia", priority, patientName: data.patient().fullName })).requestId);
    }
    const { requests } = await (await api("gestion_camas")).get<{ requests: { id: number; priority: string }[] }>("/beds/requests?status=pendiente,en_espera");
    const order = requests.filter((r) => mine.includes(r.id)).map((r) => r.priority);
    expect(order).toEqual(["critica", "alta", "media", "baja"]);
  });

  test("RF-72 · Camas · un lecho bloqueado o en limpieza no se puede asignar", async ({ api, data }) => {
    const ctx = { api, data };
    const { requestId } = await requestBed(ctx, { ...BASE, gender: "male", patientName: data.patient().fullName });
    const unavailable = (await census(ctx)).filter((w) => w.code.startsWith("MED-E2E")).flatMap((w) => w.beds).filter((b) => b.status !== "available");
    expect(unavailable.length).toBeGreaterThan(0);
    for (const bed of unavailable.slice(0, 2)) {
      const res = await (await api("gestion_camas")).raw("POST", `/beds/requests/${requestId}/assign`, { bedId: bed.id });
      expect(res.status(), `${bed.room}-${bed.bedCode} (${bed.status})`).toBe(422);
    }
    await assignBed(ctx, requestId);
  });
});
