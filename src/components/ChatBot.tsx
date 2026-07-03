import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Compass, Loader2, Settings, HelpCircle, ChevronRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

const CHAT_SYSTEM_PROMPT = `你是星野洋洋 AI 導覽員。

請嚴格遵循以下問答集（Q&A）的內容與設定來回答：

【網站相關】
Q：這是什麼網站？
A：這裡是《星野洋洋的導覽筆記》，以高雄歷史、文化、古蹟及導覽知識為主，透過文章、影片及 AI 導覽，帶您認識高雄的故事。

Q：網站內容都是原創嗎？
A：網站內容主要由星野洋洋整理、撰寫與製作，部分歷史資料引用公開史料，並經交叉比對整理。如有錯誤 or 新史料，也歡迎留言交流。

Q：可以引用網站內容嗎？
A：可以引用，但請註明來源「星野洋洋的導覽筆記」，若需大量轉載 or 商業使用，請先聯繫網站管理者。

【高雄風華錄】
Q：什麼是《高雄風華錄》？
A：《高雄風華錄》是一個介紹高雄歷史、人文、古蹟及地方故事的系列影片，希望讓更多人了解這座城市的發展與文化。

Q：目前更新到第幾集？
A：請至「高雄風華錄」專區（影片頁面）查看最新集數。

Q：下一集介紹什麼？
A：最新預告會公布於最新文章及影片說明。

【古蹟知識】
Q：古蹟是不是還有一級、二級、三級？
A：不是。目前已改為「國定古蹟」、「直轄市定古蹟」、「縣（市）定古蹟」。一、二、三級古蹟是過去的分類方式，目前已不再使用。

Q：歷史建築是古蹟嗎？
A：不完全相同。歷史建築與古蹟同樣受到文化資產保存制度保護，但指定標準不同，因此不能直接畫上等號。

【人物與導覽】
Q：網站有哪些歷史人物？
A：網站整理了與高雄發展有關的重要人物，例如企業家、地方仕紳、文化人士及城市建設的重要推動者，可至「人物誌」瀏覽。

Q：你是真人嗎？
A：我是 AI 導覽員，依據網站資料回答問題。如果需要最新資訊或更深入內容，也可以瀏覽相關文章。

Q：可以安排導覽嗎？
A：您好，感謝您對星野洋洋導覽的支持！若您想預約導覽，請點選網站中的「預約導覽」頁面，填寫日期、時間、人數及聯絡方式。送出申請後，我們會儘快確認是否可以安排，或直接加入星野洋洋LINE，收到訊息後將盡速與您聯繫。若有特殊需求，也歡迎在預約表單的備註欄留言。如有開放導覽活動，會公布於網站或社群平台。

Q：可以推薦高雄景點嗎？
A：可以，可依您的時間安排適合的路線。

【聊天限制】
Q：你什麼都知道嗎？
A：不是。我主要回答網站內容、高雄歷史及文化導覽相關問題。如果超出我的知識範圍，我會明確告知，而不會猜測答案。

Q：找不到答案怎麼辦？
A：很抱歉，目前網站資料中尚未收錄這個主題。您可以：1. 換個問法再試一次；2. 查看相關文章；3. 透過留言功能告訴我們，我們會評估是否新增相關內容。

若使用者詢問上述範疇外的問題，若您無法確定或資料不足，請誠實告知「我對這部分不太清楚，無法為您解答」，千萬不要隨意猜測。保持親切、誠懇、專業的導覽員口吻。`;

const CHATBOT_FAQ = [
  {
    category: '網站與影音',
    questions: [
      { q: '這是什麼網站？', a: '這裡是《星野洋洋的導覽筆記》，以高雄歷史、文化、古蹟及導覽知識為主，透過文章、影片及 AI 導覽，帶您認識高雄的故事。' },
      { q: '網站內容都是原創嗎？', a: '網站內容主要由星野洋洋整理、撰寫與製作，部分歷史資料引用公開史料，並經交叉比對整理。如有錯誤 or 新史料，也歡迎留言交流。' },
      { q: '可以引用網站內容嗎？', a: '可以引用，但請註明來源「星野洋洋的導覽筆記」，若需大量轉載 or 商業使用，請先聯繫網站管理者。' },
      { q: '什麼是《高雄風華錄》？', a: '《高雄風華錄》是一個介紹高雄歷史、人文、古蹟及地方故事的系列影片，希望讓更多人了解這座城市的發展與文化。' },
      { q: '目前更新到第幾集？', a: '請至「高雄風華錄」專區（影片頁面）查看最新集數。' }
    ]
  },
  {
    category: '古蹟與導覽',
    questions: [
      { q: '古蹟是不是有一、二、三級？', a: '不是。\n\n目前已改為：\n- 國定古蹟\n- 直轄市定古蹟\n- 縣（市）定古蹟\n\n一、二、三級古蹟是過去的分類方式，目前已不再使用。' },
      { q: '歷史建築是古蹟嗎？', a: '不完全相同。\n\n歷史建築與古蹟同樣受到文化資產保存制度保護，但指定標準不同，因此不能直接畫上等號。' },
      { q: '可以安排導覽嗎？', a: '您好，感謝您對星野洋洋導覽的支持！\n\n若您想預約導覽，請點選網站中的「預約導覽」頁面，填寫日期、時間、人數及聯絡方式。送出申請後，我們會儘快確認是否可以安排，或直接加入星野洋洋LINE，收到訊息後將盡速與您聯繫。\n若有特殊需求，也歡迎在預約表單的備註欄留言。\n如有開放導覽活動，會公布於網站或社群平台。' },
      { q: '你什麼都知道嗎？', a: '不是。\n\n我主要回答網站內容、高雄歷史及文化導覽相關問題。如果超出我的知識範圍，我會明確告知，而不會猜測答案。' }
    ]
  }
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFaqTab, setActiveFaqTab] = useState<string>('網站與影音');
  
  // Custom chatbot instructions/prompt configuration
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('chatbot_system_prompt') || CHAT_SYSTEM_PROMPT;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize opening message from AI Conductor
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: `您好，歡迎來到《星野洋洋的導覽筆記》！\n\n我是星野洋洋 AI 導覽員。\n\n您可以詢問：\n- 高雄歷史\n- 高雄景點\n- 古蹟介紹\n- 人物故事\n- 高雄風華錄影片\n- 導覽路線建議\n\n若目前找不到答案，我也會誠實告知，不會隨意猜測。`
      }
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 50);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText.trim();
    setInputText('');

    await sendMessageToBot(userMessageText);
  };

  const sendMessageToBot = async (text: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: text,
          systemInstruction: systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error('抱歉，與星野洋洋的連線發生些許障礙，請確認 API 金鑰是否配置，或稍後再試。');
      }

      const data = await response.json();
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.text || '我好像在思索中迷失了方向，請再問我一次吧！'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'bot',
        text: error instanceof Error ? error.message : '連線異常，請稍後再試。'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFAQClick = (q: string, a: string) => {
    if (isLoading) return;
    
    const userMessage: ChatMessage = {
      id: `user-faq-${Date.now()}`,
      sender: 'user',
      text: q
    };

    const botMessage: ChatMessage = {
      id: `bot-faq-${Date.now()}`,
      sender: 'bot',
      text: a
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('chatbot_system_prompt', systemPrompt);
    setShowSettings(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="floating-chatbot">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div 
          className="w-[360px] sm:w-[420px] h-[580px] bg-white rounded-3xl shadow-2xl border border-stone-200/80 flex flex-col overflow-hidden mb-4 transition-all"
          id="chat-box-container"
        >
          {/* Chat Header */}
          <div className="bg-linear-to-r from-amber-800 to-amber-900 text-amber-50 px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Compass className="w-5 h-5 text-amber-200" />
              </div>
              <div className="text-left">
                <h4 className="font-serif font-bold text-sm text-white">星野洋洋 AI 導覽員</h4>
                <span className="text-[10px] text-amber-200/80">提供親切、誠懇的高雄文史導覽</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-amber-100 hover:text-white cursor-pointer"
                title="AI 系統設定"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-amber-100 hover:text-white cursor-pointer"
                id="btn-close-chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings Panel Overlay */}
          {showSettings ? (
            <form onSubmit={handleSaveSettings} className="bg-amber-50/90 border-b border-amber-200 p-4 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  ⚙️ 導覽員 AI 系統指令設定
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSystemPrompt(CHAT_SYSTEM_PROMPT);
                  }}
                  className="text-[10px] text-amber-800 hover:underline cursor-pointer"
                >
                  重設預設值
                </button>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="輸入 AI 的系統指令、語氣或特色內容..."
                className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs text-stone-700 h-28 outline-none focus:border-amber-700 transition-all resize-none leading-relaxed"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                >
                  儲存自訂設定
                </button>
              </div>
            </form>
          ) : null}

          {/* Message List Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-amber-50/20 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                id={`chat-msg-${msg.id}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-amber-700 text-white rounded-tr-none'
                      : msg.id.startsWith('error')
                      ? 'bg-rose-50 border border-rose-100 text-rose-850 rounded-tl-none font-mono text-xs'
                      : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none font-serif'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-stone-500 text-xs shadow-2xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                  <span>星野洋洋正翻閱歷史筆記中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Predefined FAQ / Q&A Quick Actions Box */}
          <div className="border-t border-stone-100 bg-stone-50 p-3.5 space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>常見導覽問與答（快速點選）：</span>
              </span>
              <div className="flex gap-1.5">
                {CHATBOT_FAQ.map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setActiveFaqTab(cat.category)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      activeFaqTab === cat.category
                        ? 'bg-amber-800 text-white'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto pr-1">
              {CHATBOT_FAQ.find(c => c.category === activeFaqTab)?.questions.map((qObj, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFAQClick(qObj.q, qObj.a)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-950 border border-stone-200 hover:border-amber-700/30 rounded-lg text-[11px] font-medium transition-all text-left flex items-center gap-1 cursor-pointer max-w-full truncate"
                  title={qObj.q}
                >
                  <ChevronRight className="w-3 h-3 text-amber-700 flex-shrink-0" />
                  <span className="truncate">{qObj.q}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-100 flex gap-2 bg-white">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="向星野洋洋提問... (例：介紹古蹟歷史)"
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-700 focus:bg-white transition-all"
              disabled={isLoading}
              id="chat-input-text"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer ${
                inputText.trim() && !isLoading
                  ? 'bg-amber-700 text-white shadow-amber-900/10 hover:bg-amber-800'
                  : 'bg-stone-100 text-stone-400 border border-stone-200 shadow-none cursor-not-allowed'
              }`}
              id="chat-btn-send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-amber-700 hover:bg-amber-800 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-amber-700/10"
        id="chatbot-toggle-button"
        title="與星野洋洋對話"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          </div>
        )}
      </button>
    </div>
  );
}
