<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'up'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:4200',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
    ],
    'allowed_origins_patterns' => [
        '#^https?://([a-z0-9-]+\.)*devops\.local(?::\d+)?$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
