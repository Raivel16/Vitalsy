<?php

namespace App\Services\Clinical;

/**
 * Filtro Butterworth de 4º orden, fase cero (filtfilt) para atenuar ruido
 * en series fisiológicas (RF-23 / RNF-02).
 *
 * Se implementa como cascada de dos secciones SOS de 2º orden + filtfilt.
 */
class ButterworthFilter
{
    /**
     * @param  list<float|int>  $signal
     * @return list<float>
     */
    public function zeroPhaseFourthOrder(array $signal, float $normalizedCutoff = 0.12): array
    {
        if (count($signal) < 8) {
            return array_map(static fn ($v) => (float) $v, $signal);
        }

        $wn = max(0.05, min(0.4, $normalizedCutoff));
        $section = $this->secondOrderSection($wn);
        // 4º orden = dos secciones idénticas en cascada.
        $forward = $this->sosFilter($this->sosFilter($signal, $section), $section);
        $backward = $this->sosFilter($this->sosFilter(array_reverse($forward), $section), $section);

        return array_reverse($backward);
    }

    /**
     * Diseño bilineal estabilizado de una sección Butterworth de 2º orden.
     *
     * @return array{b: list<float>, a: list<float>}
     */
    private function secondOrderSection(float $wn): array
    {
        $k = tan(M_PI * $wn);
        $k2 = $k * $k;
        $norm = 1 + M_SQRT2 * $k + $k2;

        return [
            'b' => [$k2 / $norm, 2 * $k2 / $norm, $k2 / $norm],
            'a' => [1.0, 2 * ($k2 - 1) / $norm, (1 - M_SQRT2 * $k + $k2) / $norm],
        ];
    }

    /**
     * @param  list<float|int>  $signal
     * @param  array{b: list<float>, a: list<float>}  $section
     * @return list<float>
     */
    private function sosFilter(array $signal, array $section): array
    {
        $b = $section['b'];
        $a = $section['a'];
        $n = count($signal);
        $y = array_fill(0, $n, 0.0);

        for ($i = 0; $i < $n; $i++) {
            $acc = $b[0] * (float) $signal[$i];
            if ($i >= 1) {
                $acc += $b[1] * (float) $signal[$i - 1] - $a[1] * $y[$i - 1];
            }
            if ($i >= 2) {
                $acc += $b[2] * (float) $signal[$i - 2] - $a[2] * $y[$i - 2];
            }
            $y[$i] = $acc;
        }

        return $y;
    }
}
