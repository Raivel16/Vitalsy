<?php

return [
    /*
     * Plazos del proceso 3 (gestión de alertas). El control médico de 15
     * minutos está fijado por el requisito RF-43; los demás son ajustables
     * según la configuración institucional.
     */
    'alerts' => [
        'nurse_ack_minutes' => (int) env('VITALSY_ALERT_NURSE_ACK_MINUTES', 5),
        'supervisor_ack_minutes' => (int) env('VITALSY_ALERT_SUPERVISOR_ACK_MINUTES', 5),
        'medical_response_minutes' => (int) env('VITALSY_ALERT_MEDICAL_RESPONSE_MINUTES', 15),
        'routine_control_hours' => (int) env('VITALSY_ROUTINE_CONTROL_HOURS', 12),
    ],
];
