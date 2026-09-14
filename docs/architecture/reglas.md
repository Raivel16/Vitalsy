# Reglas de Desarrollo

1. Metodología TDD obligatoria (backend y frontend): primero se escriben las pruebas, luego se implementa el código que las hace pasar. Ninguna funcionalidad se implementa sin su prueba previa.
2. Backend (Laravel): pruebas unitarias/feature con PHPUnit/Pest antes de escribir controladores, servicios o modelos.
3. Frontend (React + TS):
   - Pruebas TDD (Vitest + Testing Library) antes de implementar componentes/lógica.
   - Además de las pruebas, toda pantalla/formulario debe incluir alertas visuales (feedback de éxito/error) y validaciones de datos de entrada antes de enviar al backend.
4. Ningún PR/commit se considera completo sin sus pruebas correspondientes en verde.
5. La documentación técnica y de arquitectura se mantiene actualizada en `docs/`.
6. Los requerimientos funcionales y no funcionales viven en `docs/requirements/requerimientos.md` y deben consultarse antes de implementar cualquier feature.
