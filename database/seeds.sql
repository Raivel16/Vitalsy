-- Catálogo inicial de salas y camas. No incluye cuentas ni contraseñas.
-- Idempotente mediante ON CONFLICT.
-- Una sola sentencia: los valores repetidos se declaran una vez en "k" y se reutilizan.

WITH k AS (
    SELECT 'MED-A'::text AS med, 'CIR-B'::text AS cir, 'mixed'::text AS mixed, 'available'::text AS available
),
new_wards AS (
    INSERT INTO wards (code, name, specialty, created_at, updated_at)
    SELECT seed.code, seed.name, seed.specialty, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM k
    CROSS JOIN LATERAL (
        VALUES
            (k.med, 'Medicina Interna A', 'medicina_interna'),
            (k.cir, 'Cirugía B', 'cirugia')
    ) AS seed(code, name, specialty)
    ON CONFLICT (code) DO NOTHING
    RETURNING id, code
),
all_wards AS (
    SELECT id, code FROM new_wards
    UNION ALL
    SELECT wards.id, wards.code FROM wards, k WHERE wards.code IN (k.med, k.cir)
)
INSERT INTO beds (ward_id, room, bed_code, gender_policy, isolation, status, created_at, updated_at)
SELECT all_wards.id, seed.room, seed.bed_code, seed.gender_policy, seed.isolation, seed.status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM k
CROSS JOIN LATERAL (
    VALUES
        (k.med, '101', 'A', k.mixed, false, k.available),
        (k.med, '101', 'B', k.mixed, false, k.available),
        (k.med, '102', 'A', 'female', false, k.available),
        (k.cir, '201', 'A', 'male', false, k.available),
        (k.cir, '201', 'B', 'male', true, 'blocked'),
        (k.cir, '202', 'A', k.mixed, false, 'cleaning')
) AS seed(code, room, bed_code, gender_policy, isolation, status)
JOIN all_wards ON all_wards.code = seed.code
ON CONFLICT (ward_id, room, bed_code) DO NOTHING;
