import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { LifeWordmark } from "./LifeWordmark";

describe("LifeWordmark (RNF-16)", () => {
  it("expone el texto accesible «Vitalsy» y «Life»", () => {
    render(<LifeWordmark />);
    expect(screen.getByText("Vitalsy")).toBeInTheDocument();
    expect(screen.getByText("Life")).toBeInTheDocument();
    expect(screen.getByText("Vitalsy").parentElement).toHaveTextContent("Vitalsy Life");
  });
});

describe("identidad web (RNF-16)", () => {
  const root = resolve(__dirname, "../../..");
  it("el favicon es un SVG de marca sin insignia roja ni degradado", () => {
    const svg = readFileSync(resolve(root, "public/favicon.svg"), "utf8");
    expect(svg).toMatch(/<svg[^>]+viewBox="0 0 32 32"/);
    expect(svg).toContain("#1E6B7B");
    expect(svg).not.toMatch(/#E23B4A|linearGradient/i);
  });
  it("index.html declara color de tema y título de la marca", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(html).toContain('<meta name="theme-color" content="#1E6B7B"');
    expect(html).toContain("<title>Vitalsy Clinical</title>");
    expect(html).toContain('href="/favicon.svg"');
  });
});
