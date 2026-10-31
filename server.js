import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/solve", async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(503).json({ error: "ИИ ещё не подключён. Нужен бесплатный API-ключ Gemini." });

    const { prompt, mode, detail, image } = req.body || {};
    if (!prompt && !image) return res.status(400).json({ error: "Добавь условие задачи или фотографию." });

    const ai = new GoogleGenerativeAI(key);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const instruction = [
      "Ты — школьный помощник School. Отвечай на русском языке.",
      mode === "graph" ? "Это запрос на график: объясни построение и укажи функцию/уравнение. Если возможно, верни формулу в виде y = ..." : "Реши обычную школьную задачу.",
      detail ? "Дай подробное решение по шагам, объясни формулы и каждый переход." : "Дай короткий ответ; для вычислительной задачи покажи необходимые основные шаги.",
      "Если условие на фото нечёткое или неполное, попроси уточнить. Не выдумывай данные."
    ].join(" ");

    const parts = [{ text: instruction + "\n\nЗадание: " + (prompt || "Реши задание на фотографии.") }];
    if (image) {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(image);
      if (!match) return res.status(400).json({ error: "Поддерживаются изображения PNG, JPG и WEBP." });
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    const result = await model.generateContent(parts);
    res.json({ answer: result.response.text() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось получить ответ. Возможно, бесплатный лимит модели исчерпан. Попробуй позже." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`School запущен на порту ${port}`));
