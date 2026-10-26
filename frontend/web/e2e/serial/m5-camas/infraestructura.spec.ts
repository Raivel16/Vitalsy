import { expect, test } from "../../support/fixtures";

type Available = { beds: { ward: string; room: string; bedCode: string }[] };

// Cada prueba crea su propio pabellón (código único por semilla): no toca el catálogo de las demás.
test.describe("infraestructura de camas por pantalla (RF-110–112)", () => {
  test("RF-110 · Camas · el administrador crea un pabellón y camas que la gestión de camas ya ve [E5-01]", async ({ asRole, api, data }) => {
    const code = `T${data.int(100, 999)}`;
    const name = `Pabellón de prueba ${code}`;
    const page = await asRole("administrador_accesos");
    await page.goto("/infraestructura");
    await expect(page.getByRole("heading", { name: "Infraestructura de camas" })).toBeVisible();

    // Validación previa: sin datos no se envía nada.
    await page.getByRole("button", { name: "Crear pabellón" }).click();
    await expect(page.getByText("El código es obligatorio.")).toBeVisible();

    await page.getByLabel("Código del pabellón").fill(code);
    await page.getByLabel("Nombre del pabellón").fill(name);
    await page.getByLabel("Especialidad").selectOption("medicina_interna");
    await page.getByRole("button", { name: "Crear pabellón" }).click();
    await expect(page.getByText(`Pabellón ${code} creado.`)).toBeVisible();

    await page.getByLabel("Pabellón de la cama").selectOption({ label: `${code} · ${name}` });
    await page.getByLabel("Habitación", { exact: true }).fill("901");
    await page.getByLabel("Código de cama").fill("A");
    await page.getByRole("button", { name: "Crear cama" }).click();
    await expect(page.getByText("Cama 901-A creada.")).toBeVisible();

    const available = await (await api("gestion_camas")).get<Available>("/beds/available");
    expect(available.beds.some((b) => b.ward === name && b.room === "901" && b.bedCode === "A")).toBe(true);

    // Un duplicado se rechaza con el motivo del servidor.
    await page.getByLabel("Habitación", { exact: true }).fill("901");
    await page.getByLabel("Código de cama").fill("A");
    await page.getByRole("button", { name: "Crear cama" }).click();
    await expect(page.getByText("Ya existe una cama con esa habitación y código en el pabellón.")).toBeVisible();
  });

  test("RF-111 · Camas · desactivar oculta la cama de la asignación y borrar conserva el historial [E5-02]", async ({ asRole, api, data }) => {
    const code = `D${data.int(100, 999)}`;
    const name = `Pabellón ${code}`;
    const admin = await api("administrador_accesos");
    const ward = (await admin.post<{ ward: { id: number } }>("/bed-infrastructure/wards", { code, name, specialty: "cirugia" })).ward;
    await admin.post("/bed-infrastructure/beds/bulk", { wardId: ward.id, roomFrom: 910, roomTo: 910, bedsPerRoom: 2, genderPolicy: "mixed", isolation: false });

    const page = await asRole("administrador_accesos");
    await page.goto("/infraestructura");
    await page.getByRole("button", { name: "Desactivar cama 910-A" }).click();
    await expect(page.getByText("Cama 910-A desactivada.")).toBeVisible();

    const camas = await api("gestion_camas");
    const visible = async () => (await camas.get<Available>("/beds/available")).beds.filter((b) => b.ward === name).map((b) => `${b.room}-${b.bedCode}`);
    expect(await visible()).toEqual(["910-B"]);

    await page.getByRole("button", { name: "Activar cama 910-A" }).click();
    await expect(page.getByText("Cama 910-A activada.")).toBeVisible();
    expect((await visible()).sort()).toEqual(["910-A", "910-B"]);

    await page.getByRole("button", { name: "Borrar cama 910-B" }).click();
    await expect(page.getByText(/conserva el historial/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Confirmar borrado de la cama 910-B" }).click();
    await expect(page.getByText("Cama 910-B borrada. El historial se conserva.")).toBeVisible();
    expect(await visible()).toEqual(["910-A"]);
  });

  test("RF-112 · Camas · el alta en lote muestra vista previa y no duplica camas [E5-03]", async ({ asRole, api, data }) => {
    const code = `L${data.int(100, 999)}`;
    const name = `Pabellón ${code}`;
    const ward = (await (await api("administrador_accesos")).post<{ ward: { id: number } }>("/bed-infrastructure/wards", { code, name, specialty: "pediatria" })).ward;

    const page = await asRole("administrador_accesos");
    await page.goto("/infraestructura");
    await page.getByLabel("Pabellón del lote").selectOption(String(ward.id));
    await page.getByLabel("Habitación inicial").fill("920");
    await page.getByLabel("Habitación final").fill("922");
    await page.getByLabel("Camas por habitación").fill("2");
    await page.getByRole("button", { name: "Vista previa del lote" }).click();
    const preview = page.getByRole("region", { name: "Vista previa del lote" });
    await expect(preview).toContainText("6 camas");
    await page.getByRole("button", { name: "Crear 6 camas nuevas" }).click();
    await expect(page.getByText("Lote creado: 6 camas nuevas.")).toBeVisible();

    // Repetir el mismo lote: todo existe y no queda nada por crear.
    await page.getByRole("button", { name: "Vista previa del lote" }).click();
    await expect(page.getByRole("region", { name: "Vista previa del lote" })).toContainText("6 ya existen");
    await expect(page.getByRole("button", { name: "Crear 0 camas nuevas" })).toBeDisabled();

    const total = (await (await api("gestion_camas")).get<Available>("/beds/available")).beds.filter((b) => b.ward === name);
    expect(total).toHaveLength(6);
  });

  test("RF-110 · Camas · los demás roles reciben 403 en la API de infraestructura [E5-05]", async ({ api }) => {
    for (const role of ["gestion_camas", "enfermera_supervisora", "admision"] as const) {
      expect((await (await api(role)).raw("GET", "/bed-infrastructure/wards")).status(), role).toBe(403);
    }
  });
});
