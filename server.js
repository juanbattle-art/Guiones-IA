// ============================================================
// SERVER.JS
// Servidor Express que actúa de intermediario entre el
// navegador del usuario y la API de Anthropic.
// La API key NUNCA llega al navegador — vive aquí.
// ============================================================

// ── IMPORTAR LIBRERÍAS ───────────────────────────────────────
const express = require("express");
const path    = require("path");

const app  = express();
// Render asigna el puerto automáticamente via PORT.
// Localmente usa 3000.
const PORT = process.env.PORT || 3000;


// ── MIDDLEWARES ──────────────────────────────────────────────
// Permite que Express entienda JSON en el body de los requests
app.use(express.json());

// Sirve index.html y cualquier archivo estático desde esta carpeta
app.use(express.static(path.join(__dirname)));


// ── RUTA POST /generar ───────────────────────────────────────
// El navegador manda { tipo, duracion, tema } y este endpoint
// llama a Claude y devuelve { guion } o { error }.
app.post("/generar", async (req, res) => {

  // 1. Extraer datos del body
  const { tipo, duracion, tema } = req.body;

  // 2. Validar que llegaron todos los campos
  if (!tipo || !duracion || !tema || !tema.trim()) {
    return res.status(400).json({
      error: "Faltan campos. Completá tipo, duración y tema."
    });
  }

  // 3. Leer la API key desde variables de entorno
  //    En Render: configurada en "Environment Variables"
  //    Localmente: exportar antes de correr → export ANTHROPIC_API_KEY=sk-ant-...
  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
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY no configurada. Agregala como variable de entorno."
    });
  }

  // 4. Calcular palabras objetivo según duración
  //    Velocidad promedio de habla en video: ~2.5 palabras/segundo
  const palabras = Math.round(parseInt(duracion) * 2.5);

  // 5. Construir el prompt para Claude
  const prompt = `Sos un experto creador de contenido para Instagram Reels.

Generá un guión en español neutro para un video de tipo "${tipo}" sobre: "${tema.trim()}".

ESPECIFICACIONES:
- Duración: ${duracion} segundos (~${palabras} palabras habladas)
- Frases cortas, máximo 10 palabras por línea
- Cada frase en su propia línea
- Sin muletillas ni palabras de relleno
- Tono natural, como se habla

ESTRUCTURA OBLIGATORIA — usá exactamente estas etiquetas:

[HOOK]
Primera frase que detiene el scroll. Máximo 2 líneas. Debe generar curiosidad o impacto inmediato.

[DESARROLLO]
El cuerpo del mensaje. Ritmo rápido, directo al punto. Sin rodeos.

[CIERRE]
Reflexión o conclusión poderosa. 1-2 líneas.

[CTA]
Llamada a la acción concreta y específica (seguir, comentar, guardar o compartir).

REGLAS:
- Total: aproximadamente ${palabras} palabras
- Devolvé ÚNICAMENTE el guión con sus bloques
- Sin introducciones, explicaciones ni comentarios extra`;

  try {
    // 6. Llamar a la API de Anthropic
    //    fetch está disponible nativamente desde Node 18+
    const respuestaAPI = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type":      "application/json",
        "x-api-key":         apiKey,         // La key va en el header, nunca en la URL
        "anthropic-version": "2023-06-01",   // Versión requerida por Anthropic
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5",  // Modelo rápido y económico
        max_tokens: 1024,                 // Máximo de tokens en la respuesta
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    // 7. Parsear la respuesta de Anthropic
    const datos = await respuestaAPI.json();

    // 8. Manejar errores que devuelve Anthropic
    if (!respuestaAPI.ok) {
      const mensajeError = datos?.error?.message || `Error de la API (HTTP ${respuestaAPI.status})`;
      console.error("Error de Anthropic:", mensajeError);
      return res.status(500).json({ error: mensajeError });
    }

    // 9. Extraer el texto del guión
    //    La API devuelve un array "content" con bloques de tipo "text"
    const guion = (datos.content || [])
      .filter(bloque => bloque.type === "text")
      .map(bloque => bloque.text)
      .join("\n")
      .trim();

    if (!guion) {
      return res.status(500).json({
        error: "Claude respondió pero el guión llegó vacío. Intentá de nuevo."
      });
    }

    // 10. Devolver el guión al navegador
    return res.json({ guion });

  } catch (err) {
    // Captura errores de red u otros errores inesperados
    console.error("Error inesperado:", err.message);
    return res.status(500).json({
      error: "Error de conexión con la API de Claude: " + err.message
    });
  }
});


// ── INICIAR SERVIDOR ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔑 API Key configurada: ${process.env.ANTHROPIC_API_KEY ? "SÍ" : "NO ⚠️"}`);
});
