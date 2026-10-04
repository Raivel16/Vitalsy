<?php

return [
    /*
     * Plazos del proceso 3 (gestión de alertas). El control médico de 15
     * minutos está fijado por el requisito RF-48; los demás son ajustables
     * según la configuración institucional.
     */
    'alerts' => [
        'nurse_ack_minutes' => (int) env('VITALSY_ALERT_NURSE_ACK_MINUTES', 5),
        'supervisor_ack_minutes' => (int) env('VITALSY_ALERT_SUPERVISOR_ACK_MINUTES', 5),
        // Tras confirmar lectura: plazo para reevaluar y disponer (programar control o pedir médico).
        'nurse_follow_up_minutes' => (int) env('VITALSY_ALERT_NURSE_FOLLOW_UP_MINUTES', 15),
        'medical_response_minutes' => (int) env('VITALSY_ALERT_MEDICAL_RESPONSE_MINUTES', 15),
        'routine_control_hours' => (int) env('VITALSY_ROUTINE_CONTROL_HOURS', 12),
        // Grace before a pending e-MAR dose raises a compliance alert.
        'emar_grace_minutes' => (int) env('VITALSY_EMAR_GRACE_MINUTES', 30),
        // After confirming a compliance alert, time to complete the task before escalate.
        'compliance_ack_minutes' => (int) env('VITALSY_COMPLIANCE_ACK_MINUTES', 15),
    ],
];
