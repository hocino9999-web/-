import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000; // Port 3000 is the ONLY externally accessible port hardcoded by the infrastructure

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static assets from the compiled React 'dist' folder
const publicPath = path.join(process.cwd(), 'dist');
app.use(express.static(publicPath));

// API Endpoint for Gemini AI Chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemInstruction } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY environment variable is not configured.');
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured. Please define it in Settings > Secrets.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build' // Mandatory header for telemetry
        }
      }
    });

    const defaultInstruction = `你是星野洋洋 AI 導覽員。請親切回答高雄歷史、景點、古蹟與人物故事。
若目前找不到答案，請誠實告知，不要隨意猜測。

參考問答設定：
1. 這是什麼網站？這裡是《星野洋洋的導覽筆記》，以高雄歷史、文化、古蹟及導覽知識為主。
2. 網站內容都是原創嗎？主要由星野洋洋整理、撰寫與製作。部分歷史資料引用公開史料，並經交叉比對。
3. 可以引用網站內容嗎？可以引用，但請註明來源「星野洋洋的導覽筆記」。若需大量轉載 or 商業使用，請先聯繫網站管理者。
4. 什麼是《高雄風華錄》？是一個介紹高雄歷史、人文、古蹟及地方故事的系列影片。
5. 目前更新到第幾集？請至「高雄風華錄」專區（影片頁面）查看最新集數。
6. 古蹟有一、二、三級嗎？沒有，目前已改為國定、直轄市定、縣(市)定古蹟，舊分類已不使用。
7. 歷史建築是古蹟嗎？不完全相同，歷史建築與古蹟指定標準不同。
8. 網站有哪些歷史人物？可至「人物誌」瀏覽。
9. 你是真人嗎？我是 AI 導覽員，依據網站資料回答。
10. 可以安排導覽嗎？若要預約導覽，請點選網站「預約導覽」頁面或加入星野洋洋LINE聯繫。`;

    // Reconstruct chat with localized Kaohsiung personality
    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction: systemInstruction || defaultInstruction,
      }
    });

    const response = await chat.sendMessage({ message });
    return res.status(200).json({ text: response.text || '' });
  } catch (error) {
    console.error('Server-side Gemini Chat Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Fallback to index.html for React SPA Routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
