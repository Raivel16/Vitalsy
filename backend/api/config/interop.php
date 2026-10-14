<?php

/*
 | RNF-17: interoperabilidad LIS/PACS. El destino sale SOLO de esta configuracion
 | (nunca de la peticion del usuario: guarda anti-SSRF).
 */
return [
    'driver' => env('INTEROP_DRIVER', 'stub'), // stub | fhir
    'fhir' => [
        'base_url' => env('INTEROP_FHIR_BASE_URL'),
        'token' => env('INTEROP_FHIR_TOKEN'),
        'connect_timeout' => (int) env('INTEROP_CONNECT_TIMEOUT', 5),
        'timeout' => (int) env('INTEROP_TIMEOUT', 10),
        'retries' => (int) env('INTEROP_RETRIES', 2),
        'retry_sleep_ms' => (int) env('INTEROP_RETRY_SLEEP_MS', 200),
        'max_pages' => (int) env('INTEROP_MAX_PAGES', 5),
        'page_size' => (int) env('INTEROP_PAGE_SIZE', 50),
    ],
    'success_rate_threshold' => 99.0,
];
