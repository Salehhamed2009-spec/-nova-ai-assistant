# API Template für NOVA Backend

Dieses Dokument hilft dir, das NOVA Backend auf einem **separaten Vercel-Projekt** zu erstellen.

## 📋 Schritt 1: Neues Vercel-Projekt erstellen

```bash
# Neue Vercel-Projekt-Vorlage erstellen
vercel create nova-api --template node

# Oder manuell ein neues GitHub-Repo:
mkdir nova-api
cd nova-api
git init
```

## 📁 Schritt 2: Projektstruktur

```
nova-api/
├── api/
│   ├── chat.js          # Chat-Endpoint
│   ├── memory.js        # Memory-Endpoint (optional)
│   └── health.js        # Health-Check
├── package.json
├── vercel.json
└── .gitignore
```

## 📦 Schritt 3: package.json

```json
{
  "name": "nova-api",
  "version": "1.0.0",
  "description": "NOVA Backend API",
  "type": "module",
  "dependencies": {
    "@huggingface/inference": "^2.0.0"
  }
}
```

## 🔧 Schritt 4: vercel.json

```json
{
  "buildCommand": "npm install",
  "env": {
    "HF_TOKEN": "@HF_TOKEN"
  }
}
```

## 💬 Schritt 5: Chat-API (`api/chat.js`)

```javascript
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_TOKEN);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [], memories = [] } = req.body;

    // Validierung
    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    if (!process.env.HF_TOKEN) {
      console.error("HF_TOKEN not set!");
      return res.status(500).json({
        success: false,
        error: "Server configuration error"
      });
    }

    // Memory in System-Prompt einbinden
    const memoryContext = memories.length > 0
      ? `Die folgenden Informationen über den Benutzer sind wichtig:\n${memories.map(m => `- ${m}`).join("\n")}\n\n`
      : "";

    // Chat-History formatieren
    const messages = [
      {
        role: "system",
        content: `Du bist NOVA, ein persönlicher und freundlicher KI-Assistent. 
        
${memoryContext}

Du bist:
- Intelligent und hilfsbereit
- Natürlich in deinen Antworten
- Ehrlich, wenn du etwas nicht weißt
- Prägnant und fokussiert
- Interessiert an dem Benutzer
- Bereit, bei vielen Aufgaben zu helfen

Antworte auf Deutsch, wenn der Benutzer auf Deutsch spricht.`
      },
      ...history.map(msg => ({
        role: msg.role || "user",
        content: msg.content || msg.text || ""
      })),
      {
        role: "user",
        content: message.trim()
      }
    ];

    console.log(`[${new Date().toISOString()}] Chat request from user`);

    // An Hugging Face senden
    const response = await hf.chatCompletion({
      model: "meta-llama/Llama-2-7b-chat-hf",
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
      top_k: 40,
      repetition_penalty: 1.1
    });

    const reply = response.choices[0]?.message?.content || "Entschuldigung, ich konnte keine Antwort generieren.";

    console.log(`[${new Date().toISOString()}] Response sent successfully`);

    return res.status(200).json({
      success: true,
      response: reply.trim()
    });

  } catch (error) {
    console.error("[ERROR]", error);

    let errorMsg = "Ein Fehler ist aufgetreten.";

    if (error.status === 429) {
      errorMsg = "Zu viele Anfragen. Bitte versuche es später erneut.";
    } else if (error.status === 503) {
      errorMsg = "Hugging Face ist gerade überlastet. Bitte versuche es später erneut.";
    }

    return res.status(500).json({
      success: false,
      error: errorMsg,
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}
```

## 🧠 Schritt 6: Memory-API (`api/memory.js`) - Optional

```javascript
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,DELETE");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    // Memories abrufen (aus Datenbank, wenn vorhanden)
    return res.status(200).json({
      success: true,
      memories: []
    });
  }

  if (req.method === "POST") {
    const { memory } = req.body;
    
    if (!memory?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Memory text required"
      });
    }

    // Memory speichern (in Datenbank)
    // Beispiel: await db.memories.create({ text: memory })

    return res.status(200).json({
      success: true,
      message: "Memory saved"
    });
  }

  if (req.method === "DELETE") {
    const { memoryId } = req.body;

    // Memory löschen
    // Beispiel: await db.memories.delete({ id: memoryId })

    return res.status(200).json({
      success: true,
      message: "Memory deleted"
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

## ❤️ Schritt 7: Health Check (`api/health.js`)

```javascript
export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
```

## 🚀 Schritt 8: Deployment auf Vercel

```bash
# Vercel CLI installieren
npm install -g vercel

# Projekt auf Vercel deployen
vercel deploy

# Environment-Variable setzen
vercel env add HF_TOKEN
# Paste dein Hugging Face API Token ein

# Production deployen
vercel --prod
```

**Oder über Vercel Dashboard:**
1. Gehe zu https://vercel.com
2. "Add New" → "Project"
3. GitHub-Repo wählen
4. Environment Variables hinzufügen: `HF_TOKEN`
5. Deploy

## 🔐 Environment-Variable in Vercel setzen

1. Gehe zu deinem Vercel-Projekt
2. → Settings → Environment Variables
3. Neue Variable: `HF_TOKEN` = dein Hugging Face Token
4. Deploy erneut triggern

## 🧪 Testen

```bash
# Local testen
vercel dev

# API testen
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hallo NOVA!",
    "history": [],
    "memories": []
  }'
```

## 🔄 Frontend mit Backend verbinden

In der Frontend `config.js`:

```javascript
export const CONFIG = {
  API_URL: 'https://YOUR_VERCEL_API_PROJECT.vercel.app/api',
  // ...
};
```

**Beispiel:**
```
https://nova-api-abc123.vercel.app/api
```

## 🐛 Troubleshooting

**"HF_TOKEN is not defined"**
- Prüfe: Ist die Variable in Vercel unter Settings → Environment Variables gesetzt?
- Lösung: Variable hinzufügen und Deploy erneut triggern

**"CORS error"**
- Prüfe: CORS Headers in der API gesetzt?
- Prüfe: Ist die Frontend-URL in `vercel.env` oder hardcoded?

**"Model not found"**
- Prüfe: Hast du Zugriff auf das Modell auf Hugging Face?
- Lösung: Anderes Modell versuchen (z.B. `mistralai/Mistral-7B-Instruct-v0.1`)

**"Rate Limited (429)"**
- Hugging Face hat Rate-Limits
- Lösung: Warten oder kostenpflichtigen Plan nutzen

## 📚 Alternative Modelle

Wenn Llama zu langsam ist, versuche:

```javascript
model: "mistralai/Mistral-7B-Instruct-v0.1"
// Schneller, aber weniger Kontext
```

Oder für leichte Aufgaben:

```javascript
model: "google/flan-t5-large"
// Schneller, kleineres Modell
```

## 📞 Hilfe

- Hugging Face Docs: https://huggingface.co/docs/inference/
- Vercel Docs: https://vercel.com/docs

---

**Du schaffst das! 🚀**
