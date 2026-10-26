import config from "../../vite.config";

describe("servidor de desarrollo (RNF-18)", () => {
  it("no recarga las páginas cuando Playwright escribe reportes, videos o sesiones", () => {
    const watch = config.server?.watch as { ignored?: string[] } | undefined;
    const ignored = watch?.ignored ?? [];

    expect(ignored).toContain("**/e2e-results/**");
    expect(ignored).toContain("**/e2e/.auth/**");
  });
});
