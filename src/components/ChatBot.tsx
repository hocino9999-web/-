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
  const [activeFaqTab, setActiveFaqTab] = useState<string>('網站與影音');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize opening message from AI Conductor
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: `您好，歡迎來到《星野洋洋的導覽筆記》！\n\n我是星野洋洋 AI 導覽員。請點選下方的常見問答按鈕，我會立即為您提供詳細的高雄歷史、景點與古蹟導覽解答！`
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

  const handleFAQClick = (q: string, a: string) => {
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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="floating-chatbot">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div 
          className="w-[360px] sm:w-[420px] h-[550px] bg-white rounded-3xl shadow-2xl border border-stone-200/80 flex flex-col overflow-hidden mb-4 transition-all animate-fade-in"
          id="chat-box-container"
        >
          {/* Chat Header */}
          <div className="bg-linear-to-r from-amber-800 to-amber-900 text-amber-50 px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Compass className="w-5 h-5 text-amber-200" />
              </div>
              <div className="text-left">
                <h4 className="font-serif font-bold text-sm text-white">星野洋洋 導覽問答</h4>
                <span className="text-[10px] text-amber-200/80">提供親切、誠懇的高雄文史導覽</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-amber-100 hover:text-white cursor-pointer"
                id="btn-close-chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                      : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none font-serif'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Predefined FAQ / Q&A Quick Actions Box - Moved to the bottom to act as the primary interface */}
          <div className="border-t border-stone-150 bg-stone-50 p-4 space-y-3 text-left shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-amber-700 animate-pulse" />
                <span>請點選下方導覽問答主題：</span>
              </span>
              <div className="flex gap-1.5">
                {CHATBOT_FAQ.map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setActiveFaqTab(cat.category)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFaqTab === cat.category
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
              {CHATBOT_FAQ.find(c => c.category === activeFaqTab)?.questions.map((qObj, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFAQClick(qObj.q, qObj.a)}
                  className="w-full px-3 py-2 bg-white hover:bg-amber-50/50 text-stone-700 hover:text-amber-950 border border-stone-200 hover:border-amber-700/30 rounded-xl text-xs font-medium transition-all text-left flex items-center gap-2 cursor-pointer shadow-3xs"
                  title={qObj.q}
                >
                  <ChevronRight className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span className="truncate">{qObj.q}</span>
                </button>
              ))}
            </div>
          </div>
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
