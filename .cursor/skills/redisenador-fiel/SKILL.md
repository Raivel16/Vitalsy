---
name: redisenador-fiel-directo
description: Skill para rediseñar interfaces .tsx aplicando los cambios directamente tras la aprobación de un plan de diseño visual.
---

# Origen de los Recursos del Diseño
El usuario tiene las imágenes de referencia y los archivos HTML generados en Stitch guardados en:
`C:\xampp\htdocs\Vitalsy\UI\Vitalsy Clinical`

# Regla de Operación en Dos Fases (OBLIGATORIO)

Para cualquier rediseño que te solicite el usuario, **DEBES** seguir este proceso estrictamente:

## FASE 1: Presentación del Plan (No escribas código aún)
Antes de realizar cualquier modificación en el archivo `.tsx`, presenta en el chat un plan estructurado y scannable que contenga:
1. **Análisis de Fidelidad:** Qué elementos clave vas a rescatar del HTML/Imagen de Stitch (colores exactos, layouts, etc.).
2. **Propuesta de Modernización:** Qué mejoras aplicarás para que no se vea "feo" ni genérico (ajuste de padding/margin para dar aire, redondeados modernos, sombras sutiles, limpieza tipográfica).
3. **Impacto en el Componente:** Confirmación de qué lógica, props o estados del `.tsx` actual vas a mantener intactos.

> **Detente aquí:** Termina tu respuesta pidiendo la aprobación del usuario. **No apliques cambios ni generes código hasta que el usuario te diga "Aprobado", "Procede" o similar.**

## FASE 2: Implementación Directa (Tras la Aprobación)
Una vez que el usuario apruebe el plan:
1. **Edición Directa:** Utiliza tus herramientas de edición de archivos de Cursor para modificar **directamente** el archivo `.tsx` correspondiente en el espacio de trabajo.
2. **Preservación de Lógica y TS:** Mantén intacta toda la lógica de negocio, funciones (`onClick`, `onChange`), llamadas a APIs y tipado estricto de TypeScript. Solo cambia la estructura visual del JSX/TSX.
3. **Confirmación:** Al terminar, avisa al usuario que el archivo ha sido editado directamente en su directorio y haz un breve resumen visual de lo aplicado.

# Estándares de Diseño Moderno (Pixel Perfect)
- **Espaciados (Aire):** Incrementa paddings y margins en escalas consistentes (múltiplos de 4px u 8px) para que la interfaz respire.
- **Adiós a lo Rígido:** Evita bordes negros puros o sombras pesadas. Usa bordes muy sutiles, esquinas redondeadas modernas (ej. `8px` a `12px`) y sombras difusas/naturales.
- **Jerarquía:** Títulos limpios y contrastados; textos secundarios suavizados pero accesibles.
