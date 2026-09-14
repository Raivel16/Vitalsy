export function Barcode({ value }: { value: string }) {
  const widths = value.split("").map((char) => (char.charCodeAt(0) % 3) + 1);
  const bars = widths.map((bar, index) => {
    const x = 4 + widths.slice(0, index).reduce((sum, width) => sum + width + 1, 0);
    return <rect key={index} x={x} y="2" width={bar} height="28" />;
  });
  const end = 8 + widths.reduce((sum, bar) => sum + bar + 1, 0);

  return (
    <svg className="barcode" viewBox={`0 0 ${end} 42`} role="img" aria-label="Código de barras">
      {bars}
    </svg>
  );
}
