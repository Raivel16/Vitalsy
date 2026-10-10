import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "./BarcodeScanner";

const scannerState = vi.hoisted(() => ({
  startImpl: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  isScanning: true,
}));

vi.mock("html5-qrcode", () => ({
  Html5QrcodeSupportedFormats: { CODE_128: 1, CODE_39: 2, QR_CODE: 3, EAN_13: 4, EAN_8: 5 },
  Html5Qrcode: class {
    get isScanning() {
      return scannerState.isScanning;
    }
    start(...args: unknown[]) {
      return scannerState.startImpl(...args);
    }
    stop() {
      return scannerState.stop();
    }
    clear() {
      return scannerState.clear();
    }
  },
}));

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

describe("BarcodeScanner", () => {
  beforeEach(() => {
    scannerState.startImpl = vi.fn().mockResolvedValue(undefined);
    scannerState.stop = vi.fn().mockResolvedValue(undefined);
    scannerState.clear = vi.fn();
    scannerState.isScanning = true;
    stubMatchMedia(false);
  });

  it("abre el visor como diálogo accesible y lo cierra con el botón Cerrar", async () => {
    const user = userEvent.setup();
    render(<BarcodeScanner onScan={vi.fn()} label="Escanear brazalete" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));

    const dialog = screen.getByRole("dialog", { name: /escanear brazalete/i });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // El fondo clicable es un botón nativo oculto a lectores de pantalla y fuera del orden de tabulación.
    expect(dialog.parentElement).toHaveClass("scanner-modal");
    const scrim = dialog.parentElement?.querySelector(".scanner-scrim");
    expect(scrim?.tagName).toBe("BUTTON");
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).toHaveAttribute("tabindex", "-1");

    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cierra con Escape y con clic en el fondo, pero no con clic dentro de la tarjeta", async () => {
    const user = userEvent.setup();
    render(<BarcodeScanner onScan={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));
    await user.click(screen.getByText(/apunte la cámara/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));
    const scrim = screen.getByRole("dialog").parentElement?.querySelector(".scanner-scrim") as HTMLElement;
    await user.click(scrim);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("entrega el código leído, detiene la cámara y cierra el visor", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    scannerState.startImpl = vi.fn((_camera, _config, onDecoded: (text: string) => void) => {
      onDecoded("  ENC-0001  ");
      return Promise.resolve();
    });
    render(<BarcodeScanner onScan={onScan} />);

    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onScan).toHaveBeenCalledWith("ENC-0001");
    expect(scannerState.stop).toHaveBeenCalled();
    expect(scannerState.clear).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignora lecturas vacías y usa un recuadro compacto en pantallas angostas", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    stubMatchMedia(true);
    scannerState.startImpl = vi.fn((_camera, config: { qrbox: { width: number } }, onDecoded: (text: string) => void) => {
      expect(config.qrbox.width).toBe(220);
      onDecoded("   ");
      return Promise.resolve();
    });
    render(<BarcodeScanner onScan={onScan} />);

    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onScan).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("avisa cuando no se puede abrir la cámara", async () => {
    const user = userEvent.setup();
    scannerState.startImpl = vi.fn().mockRejectedValue(new Error("denied"));
    render(<BarcodeScanner onScan={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));

    expect(await screen.findByText(/no se pudo abrir la cámara/i)).toBeInTheDocument();
  });

  it("tolera que la cámara ya esté detenida al cerrar", async () => {
    const user = userEvent.setup();
    scannerState.isScanning = true;
    scannerState.stop = vi.fn().mockRejectedValue(new Error("already stopped"));
    scannerState.clear = vi.fn(() => {
      throw new Error("already cleared");
    });
    render(<BarcodeScanner onScan={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /escanear brazalete/i }));
    await user.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(scannerState.stop).toHaveBeenCalled();
  });
});
