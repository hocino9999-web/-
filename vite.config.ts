import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { GoogleGenAI } from '@google/genai';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/chat')) {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const { message, history } = JSON.parse(body);
                  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY1 || process.env.VITE_GEMINI_API_KEY;
                  console.log(`[API KEY CHECK] Key exists: ${!!apiKey}, length: ${apiKey ? apiKey.length : 0}, prefix: ${apiKey ? apiKey.substring(0, 6) : 'none'}`);
                  if (!apiKey) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not configured. Please define it in Secrets.' }));
                    return;
                  }

                  const ai = new GoogleGenAI({
                    apiKey,
                    httpOptions: {
                      headers: {
                        'User-Agent': 'aistudio-build'
                      }
                    }
                  });

                  // Reconstruct chat with system instructions and support multi-model fallback
                  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
                  let lastError = null;
                  let responseText = '';

                  for (const modelName of models) {
                    try {
                      console.log(`[Vite API Middleware] Trying model: ${modelName}`);
                      const chat = ai.chats.create({
                        model: modelName,
                        config: {
                          systemInstruction: '你是「星野洋洋」，高雄在地深度文史與走讀導覽專家。你熟悉高雄的歷史（例如：鹽埕、哈瑪星、旗津、左營舊城等）、歷史建物、老屋故事、文化特色與在地美食。請以親切、專業、富有故事性的口吻回答遊客的問題。',
                        }
                      });

                      // Feed history if any
                      if (history && history.length > 0) {
                        // Prepopulate chat state or inject as parts if needed.
                      }

                      const response = await chat.sendMessage({ message });
                      responseText = response.text || '';
                      lastError = null;
                      console.log(`[Vite API Middleware] Success with model: ${modelName}`);
                      break;
                    } catch (err) {
                      console.warn(`[Vite API Middleware] Model ${modelName} failed, trying next... Error:`, err);
                      lastError = err;
                    }
                  }

                  if (lastError) {
                    throw lastError;
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ text: responseText }));
                } catch (error) {
                  console.error('Vite dev server API Error:', error);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
                }
              });
            } else {
              res.writeHead(405, { 'Content-Type': 'text/plain' });
              res.end('Method Not Allowed');
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true
  }
});
