

Profesor, en un software de salud y monitoreo fisiológico en tiempo real, donde la operación es crítica y continua (24/7), ¿cuál es el protocolo adecuado para autorizar un cambio y qué estrategia de despliegue (CI/CD Zero-Downtime) se recomienda para actualizar el sistema sin interrumpir el monitoreo activo en las salas hospitalarias?

Respuesta: 
Tener un Comité de cambios 
Analizar no solo IT también IT
si o si Zero-Downtime


Fase de Pre-Staging

Probar con pacientes sin perder la funcionalidad despliegue

Ambos sistemas de forma paralela para asegurar que los dos arrojan los mismos datos
NUNCA APAGAR UNO Y SUBIR EL NUEVO LOS DOS DE FORMA PARALELA POR UN TIEMPO HASTA QUE ESTEMOS SEGURO QUE AMBOS OBTIENEN LOS MISMOS DATOS SIN PROBLEMA Y SIGUEN FUNCIONANDO




Para un software de salud, donde la tolerancia a fallos es cero y no se puede interrumpir el servicio, la estrategia ideal para desplegar en paralelo la versión nueva y la antigua se llama Despliegue Blue-Green (Azul-Verde), combinado a menudo con una técnica de verificación llamada Despliegue Shadow (Sombra) o Canary (Canario).