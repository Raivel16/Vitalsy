-- Catálogo inicial de salas y camas. No incluye cuentas ni contraseñas.
-- Idempotente mediante ON CONFLICT.

INSERT INTO wards (code, name, specialty, created_at, updated_at)
VALUES
    ('MED-A', 'Medicina Interna A', 'medicina_interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('CIR-B', 'Cirugía B', 'cirugia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO beds (ward_id, room, bed_code, gender_policy, isolation, status, created_at, updated_at)
SELECT wards.id, seed.room, seed.bed_code, seed.gender_policy, seed.isolation, seed.status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('MED-A', '101', 'A', 'mixed', false, 'available'),
        ('MED-A', '101', 'B', 'mixed', false, 'available'),
        ('MED-A', '102', 'A', 'female', false, 'available'),
        ('CIR-B', '201', 'A', 'male', false, 'available'),
        ('CIR-B', '201', 'B', 'male', true, 'blocked'),
        ('CIR-B', '202', 'A', 'mixed', false, 'cleaning')
) AS seed(code, room, bed_code, gender_policy, isolation, status)
JOIN wards ON wards.code = seed.code
ON CONFLICT (ward_id, room, bed_code) DO NOTHING;
