const express = require("express");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/generar", async (req, res) => {
  const { tipo, duracion, tema } = req.body;

  if (!tipo || !duracion || !tema || !tema.trim()) {
    return res.status(400).json({ error: "Faltan campos." });
  }

  const apiKey = "sk-ant-api03-v-gT_AxNJ3iCZvcFeK2SRgDCctXDb_97KXmUiQ5wdjo8SNs1_l1E7Q8WZlom394OMK0NWPpHSzIwZ_1NSRtuRXA-ea-ETQAA";
  const palabras = Math.round(parseInt(duracion) * 2.5);
  const prompt = `Sos un experto en Instagram Reels. Generá un guión en español neutro para un video de tipo "${tipo}" sobre: "${tema.trim()}". Duración: ${duracion} segundos. Frases cortas.\n\n[HOOK]\nFrase que detiene el scroll.\n\n[DESARROLLO]\nCuerpo del mensaje.\n\n[CIERRE]\nConclusión.\n\n[CTA]\nLlamada a la acción.`;

  try {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) return res.status(500).json({ error: datos?.error?.message || "Error API" });

    const guion = (datos.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!guion) return res.status(500).json({ error: "Respuesta vacía." });

    return res.json({ guion });
  } catch (err) {
    return res.status(500).json({ error: "Error: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
