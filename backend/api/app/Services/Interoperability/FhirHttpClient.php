<?php

namespace App\Services\Interoperability;

use App\Exceptions\InteropUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Base de los clientes FHIR R4 (RNF-17). Destino y token salen solo de config/interop.php
 * (anti-SSRF); TLS siempre verificado; el token nunca se registra.
 */
abstract class FhirHttpClient
{
    private readonly string $baseUrl;

    /** @param  array<string, mixed>  $config */
    public function __construct(private readonly InteropMetrics $metrics, private readonly array $config)
    {
        $base = trim((string) ($config['base_url'] ?? ''));
        if ($base === '' || ! str_starts_with($base, 'http')) {
            throw new RuntimeException('INTEROP_FHIR_BASE_URL no esta configurada para el driver FHIR.');
        }
        $this->baseUrl = rtrim($base, '/');
    }

    abstract protected function system(): string;

    abstract protected function unavailableMessage(): string;

    protected function metrics(): InteropMetrics
    {
        return $this->metrics;
    }

    /** Resuelve el id FHIR del Encounter a partir de nuestro encounter_id (Encounter.identifier). */
    protected function resolveEncounterId(string $encounterId): ?string
    {
        $bundle = $this->get($this->baseUrl.'/Encounter', ['identifier' => $encounterId, '_count' => 1], 'Encounter');
        $id = $bundle['entry'][0]['resource']['id'] ?? null;

        return is_string($id) && $id !== '' ? $id : null;
    }

    /**
     * Recorre las paginas de un searchset (link[relation=next]), acotado a max_pages.
     *
     * @param  array<string, scalar>  $query
     * @return list<array<string, mixed>> recursos (entry.resource) tal cual llegaron
     */
    protected function searchAll(string $path, array $query, string $resourceType): array
    {
        $url = $this->baseUrl.'/'.ltrim($path, '/');
        $params = $query + ['_count' => (int) ($this->config['page_size'] ?? 50)];
        $max = max(1, (int) ($this->config['max_pages'] ?? 5));
        $resources = [];

        for ($page = 0; $page < $max && $url !== null; $page++) {
            $bundle = $this->get($url, $page === 0 ? $params : [], $resourceType);
            foreach ((array) ($bundle['entry'] ?? []) as $entry) {
                $resources[] = is_array($entry) && is_array($entry['resource'] ?? null) ? $entry['resource'] : [];
            }
            $url = $this->nextLink($bundle);
        }

        return $resources;
    }

    /** Solo se sigue un `next` del mismo host que la base configurada (anti-SSRF). */
    private function nextLink(array $bundle): ?string
    {
        foreach ((array) ($bundle['link'] ?? []) as $link) {
            if (is_array($link) && ($link['relation'] ?? null) === 'next' && is_string($link['url'] ?? null)) {
                $same = parse_url($link['url'], PHP_URL_HOST) === parse_url($this->baseUrl, PHP_URL_HOST)
                    && parse_url($link['url'], PHP_URL_SCHEME) === parse_url($this->baseUrl, PHP_URL_SCHEME);

                return $same ? $link['url'] : null;
            }
        }

        return null;
    }

    /**
     * @param  array<string, scalar>  $query
     * @return array<string, mixed>
     */
    private function get(string $url, array $query, string $resourceType): array
    {
        $started = microtime(true);
        try {
            $response = $this->request()->get($url, $query === [] ? null : $query);
            $json = $response->json();
            if (! is_array($json) || ($json['resourceType'] ?? null) !== 'Bundle') {
                throw new RuntimeException('invalid_bundle');
            }

            return $json;
        } catch (ConnectionException|RequestException|RuntimeException $e) {
            $code = $e instanceof RequestException ? 'http_'.$e->response->status()
                : ($e instanceof ConnectionException ? 'connection' : 'invalid_bundle');
            $this->metrics->record($this->system(), $resourceType, false, null, $code, (int) ((microtime(true) - $started) * 1000));
            Log::warning('interop.request_failed', ['system' => $this->system(), 'resource' => $resourceType, 'code' => $code]);

            throw new InteropUnavailableException($this->unavailableMessage(), 'interop_'.$this->system().'_unavailable');
        }
    }

    private function request(): PendingRequest
    {
        $request = Http::asJson()
            ->withHeaders(['Accept' => 'application/fhir+json'])
            ->connectTimeout((int) ($this->config['connect_timeout'] ?? 5))
            ->timeout((int) ($this->config['timeout'] ?? 10))
            ->retry(
                (int) ($this->config['retries'] ?? 2) + 1 > 1 ? (int) ($this->config['retries'] ?? 2) + 1 : 1,
                (int) ($this->config['retry_sleep_ms'] ?? 200),
                fn ($e) => $e instanceof ConnectionException
                    || ($e instanceof RequestException && $e->response->serverError()),
                throw: true,
            );

        $token = (string) ($this->config['token'] ?? '');

        return $token !== '' ? $request->withToken($token) : $request;
    }

    /** @param array<string, mixed> $resource */
    protected function firstString(mixed ...$candidates): ?string
    {
        foreach ($candidates as $c) {
            if (is_string($c) && trim($c) !== '') {
                return trim($c);
            }
        }

        return null;
    }

    /** Texto legible de un CodeableConcept. */
    protected function conceptText(mixed $concept): ?string
    {
        if (! is_array($concept)) {
            return null;
        }
        $coding = is_array($concept['coding'][0] ?? null) ? $concept['coding'][0] : [];

        return $this->firstString($concept['text'] ?? null, $coding['display'] ?? null, $coding['code'] ?? null);
    }

    /** Fecha ISO-8601 valida o null. */
    protected function isoDate(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }
        try {
            new \DateTimeImmutable($value);
        } catch (\Exception) {
            return null;
        }

        return $value;
    }

    /**
     * Copia solo las claves permitidas (lista blanca): sin nombre del paciente,
     * performer ni adjuntos binarios.
     *
     * @param  array<string, mixed>  $resource
     * @param  list<string>  $allowed
     * @return array<string, mixed>
     */
    protected function sanitise(array $resource, array $allowed): array
    {
        $out = ['resourceType' => 'fhir.'.($resource['resourceType'] ?? 'Resource')];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $resource)) {
                $out[$key] = $resource[$key];
            }
        }
        if (is_string($resource['encounter']['reference'] ?? null)) {
            $out['encounter'] = ['reference' => $resource['encounter']['reference']];
        }

        return $out;
    }
}
