# Reglas de Desarrollo

1. Metodología TDD obligatoria (backend y frontend): primero se escriben las pruebas, luego se implementa el código que las hace pasar. Ninguna funcionalidad se implementa sin su prueba previa.
2. Backend (Laravel): pruebas unitarias/feature con PHPUnit/Pest antes de escribir controladores, servicios o modelos.
3. Frontend (React + TS):
   - Pruebas TDD (Vitest + Testing Library) antes de implementar componentes/lógica.
   - Además de las pruebas, toda pantalla/formulario debe incluir alertas visuales (feedback de éxito/error) y validaciones de datos de entrada antes de enviar al backend.
4. Ningún PR/commit se considera completo sin sus pruebas correspondientes en verde.
5. La documentación técnica y de arquitectura se mantiene actualizada en `docs/`.
6. Los requerimientos funcionales y no funcionales viven en `docs/requirements/requerimientos.md` y deben consultarse antes de implementar cualquier feature.
7. El frontend React debe aplicar Screaming Architecture: la estructura de carpetas debe expresar claramente los dominios y módulos funcionales del sistema, priorizando la organización por funcionalidad sobre la organización exclusivamente por tipo técnico.

## Normas y principios a considerar

Además de las reglas anteriores, el desarrollo debe alinearse con estas normas y principios:

- **ISO 25010** — calidad del producto (funcionalidad, usabilidad, fiabilidad, seguridad, mantenibilidad, eficiencia).
- **ISO 25001** — gestión de la calidad del software (planificar, medir y mejorar procesos de calidad).
- **ISO 29119** — pruebas de software (estrategia, casos, evidencia; refuerza el TDD ya obligatorio).
- **ISO 27001** — seguridad de la información (mínimo privilegio, control de acceso, protección de datos clínicos).
- **SOLID** — diseño de código (responsabilidad única, extensible, desacoplado en servicios/módulos).
- **DevOps** — integración continua, ramas `feature/* → dev → main`, pruebas en CI antes de merge.
- **TDD** — principio transversal obligatorio (ver regla 1): prueba primero, implementación después, evidencia en verde.
