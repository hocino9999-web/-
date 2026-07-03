import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { 
  Calendar, User, Phone, Mail, CheckCircle2, AlertCircle, Users, ArrowRight, 
  Clock, Compass, MapPin, Sparkles, HelpCircle, Info, ShieldCheck, CheckSquare, Square
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';

interface RouteOption {
  title: string;
  duration: string;
  districts: string[];
  themes: string[];
  meetingPoint: string;
  description: string;
}

const RECOMMENDED_ROUTES: RouteOption[] = [
  {
    title: '鼓山百年風華走讀',
    duration: '120 分鐘',
    districts: ['鼓山'],
    themes: ['高雄歷史', '打狗歷史', '古蹟巡禮', '歷史建築', '日治時期'],
    meetingPoint: '鼓山輪渡站',
    description: '漫步鼓山舊街町，探索打狗開港、鐵道支線與老碼頭的常民百年生活歲月。'
  },
  {
    title: '哈瑪星鐵道文化走讀',
    duration: '120 分鐘',
    districts: ['哈瑪星'],
    themes: ['鐵道文化', '哈瑪星', '歷史建築', '日治時期'],
    meetingPoint: '哈瑪星鐵道文化園區',
    description: '自打狗驛舊軌道出發，穿梭金融第一街，飽覽最完整近代海陸聯運的歷史街廓。'
  },
  {
    title: '高雄港築港歷史走讀',
    duration: '半日',
    districts: ['高雄港', '駁二'],
    themes: ['高雄歷史', '打狗歷史', '鐵道文化', '戰後發展'],
    meetingPoint: '高雄港旅運中心',
    description: '走訪蓬萊商港區、駁二倉庫群、第一船渠，見證大港百年波瀾壯闊的築港奇蹟。'
  },
  {
    title: '打狗開港與港都發展走讀',
    duration: '一日',
    districts: ['哈瑪星', '鼓山', '旗津'],
    themes: ['高雄歷史', '打狗歷史', '古蹟巡禮', '清代歷史', '日治時期'],
    meetingPoint: '鼓山輪渡站',
    description: '重返 1863 開港風雲！橫跨旗津燈塔、洋行遺址到哈瑪星，深度走讀城市發祥之源。'
  },
  {
    title: '古蹟與歷史建築巡禮',
    duration: '120 分鐘',
    districts: ['哈瑪星', '鹽埕', '鼓山'],
    themes: ['古蹟巡禮', '歷史建築', '人物故事', '日治時期'],
    meetingPoint: '哈瑪星鐵道文化園區',
    description: '深度考證打狗驛官舍、愛國婦人會館、武德殿及新濱町紅磚街屋的折衷主義美學。'
  },

  {
    title: '《高雄風華錄》精選路線',
    duration: '半日',
    districts: ['哈瑪星', '鹽埕', '鼓山', '高雄港'],
    themes: ['高雄歷史', '打狗歷史', '哈瑪星', '鐵道文化', '古蹟巡禮', '歷史建築', '人物故事', '日治時期', '戰後發展'],
    meetingPoint: '哈瑪星鐵道文化園區',
    description: '依據《高雄風華錄》大作，精選四大近代樞紐街廓，由星野洋洋帶領之旗艦版文史走讀。'
  },
  {
    title: '客製化走讀路線',
    duration: '半日',
    districts: ['其他'],
    themes: ['客製化路線'],
    meetingPoint: '其他（自行填寫）',
    description: '由您定義景點！不論是特定老屋、家族發源地、特殊文史主題，皆可為您量身訂製。'
  }
];

const AUDIENCE_OPTIONS = ['一般民眾', '家庭親子', '學校', '大學生', '社區團體', '公司企業', '國外旅客', '攝影團', '樂齡長者', '其他'];
const DISTRICT_OPTIONS = ['鼓山', '哈瑪星', '鹽埕', '旗津', '左營', '高雄港', '駁二', '壽山', '其他'];
const THEME_OPTIONS = ['高雄歷史', '打狗歷史', '哈瑪星', '鐵道文化', '古蹟巡禮', '歷史建築', '人物故事', '香蕉產業', '宗教文化', '日治時期', '清代歷史', '戰後發展', '客製化路線'];
const TIME_DURATION_OPTIONS = ['60 分鐘', '90 分鐘', '120 分鐘', '半日', '一日'];
const LANGUAGE_OPTIONS = ['中文', '台語', '中文與台語（雙語）'];
const MEETING_POINT_OPTIONS = ['哈瑪星鐵道文化園區', '鼓山輪渡站', '高雄港旅運中心', '美麗島站', '其他（自行填寫）'];
const SPECIAL_NEEDS_OPTIONS = ['輪椅', '嬰兒車', '長者', '行動不便', '攝影需求', '校外教學', '無特殊需求'];

export default function CalendarSection() {
  // Form values
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>(RECOMMENDED_ROUTES[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [organization, setOrganization] = useState('');
  
  const [tourDate, setTourDate] = useState('');
  const [altDate1, setAltDate1] = useState('');
  const [altDate2, setAltDate2] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  
  const [partySizeRange, setPartySizeRange] = useState('1–5 人');
  const [customPartySize, setCustomPartySize] = useState('');
  
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(['一般民眾']);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(['鼓山']);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(['高雄歷史']);
  const [tourDuration, setTourDuration] = useState('120 分鐘');
  const [language, setLanguage] = useState('中文');
  
  const [meetingPoint, setMeetingPoint] = useState('鼓山輪渡站');
  const [customMeetingPoint, setCustomMeetingPoint] = useState('');
  
  const [selectedSpecialNeeds, setSelectedSpecialNeeds] = useState<string[]>(['無特殊需求']);
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successId, setSuccessId] = useState('');

  // Auto populate helper when clicking a recommended route card
  const handleSelectRouteTemplate = (route: RouteOption) => {
    setSelectedRoute(route);
    setTourDuration(route.duration);
    setSelectedDistricts(route.districts);
    setSelectedThemes(route.themes);
    if (MEETING_POINT_OPTIONS.includes(route.meetingPoint)) {
      setMeetingPoint(route.meetingPoint);
    } else {
      setMeetingPoint('其他（自行填寫）');
      setCustomMeetingPoint(route.meetingPoint);
    }
    
    // Smooth scroll down to form
    const formElement = document.getElementById('booking-form-start');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleAudience = (aud: string) => {
    setSelectedAudiences(prev => 
      prev.includes(aud) ? prev.filter(a => a !== aud) : [...prev, aud]
    );
  };

  const toggleDistrict = (dist: string) => {
    setSelectedDistricts(prev => 
      prev.includes(dist) ? prev.filter(d => d !== dist) : [...prev, dist]
    );
  };

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const toggleSpecialNeed = (need: string) => {
    setSelectedSpecialNeeds(prev => {
      if (need === '無特殊需求') return ['無特殊需求'];
      const filtered = prev.filter(n => n !== '無特殊需求');
      return filtered.includes(need) ? filtered.filter(n => n !== need) : [...filtered, need];
    });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!name.trim()) { setErrorMsg('請填寫預約人姓名'); return; }
    if (!phone.trim()) { setErrorMsg('請填寫聯絡電話'); return; }
    if (!email.trim()) { setErrorMsg('請填寫電子郵件信箱'); return; }
    if (!tourDate) { setErrorMsg('請選擇希望導覽日期'); return; }
    if (!startTime || !endTime) { setErrorMsg('請設定導覽開始與結束時間'); return; }
    if (partySizeRange === '40 人以上（請填寫實際人數）' && !customPartySize.trim()) {
      setErrorMsg('請填寫實際人數');
      return;
    }
    if (selectedDistricts.length === 0) { setErrorMsg('請至少勾選一個想走讀的區域'); return; }
    if (selectedThemes.length === 0) { setErrorMsg('請至少勾選一個導覽主題'); return; }
    if (meetingPoint === '其他（自行填寫）' && !customMeetingPoint.trim()) {
      setErrorMsg('請填寫自訂的集合地點');
      return;
    }
    if (!agreed) { setErrorMsg('您必須勾選同意預約須知'); return; }

    setIsSubmitting(true);
    const bookingCollection = 'bookings';

    const bookingPayload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      lineId: lineId.trim() || null,
      organization: organization.trim() || null,
      date: tourDate,
      altDate1: altDate1 || null,
      altDate2: altDate2 || null,
      startTime,
      endTime,
      partySizeRange,
      customPartySize: partySizeRange === '40 人以上（請填寫實際人數）' ? customPartySize.trim() : null,
      targetAudience: selectedAudiences,
      districts: selectedDistricts,
      themes: selectedThemes,
      duration: tourDuration,
      language,
      meetingPoint: meetingPoint === '其他（自行填寫）' ? customMeetingPoint.trim() : meetingPoint,
      specialNeeds: selectedSpecialNeeds,
      notes: notes.trim() || null,
      agreed,
      routeTitle: selectedRoute.title,
      status: '待確認',
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, bookingCollection), bookingPayload);
      setSuccessId(docRef.id);
      setSubmitted(true);

      // Trigger a spectacular celebratory confetti sequence!
      // Center burst
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Left side burst
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.7 }
        });
      }, 250);

      // Right side burst
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.7 }
        });
      }, 400);
    } catch (err) {
      console.error('Firestore Booking Error:', err);
      const errMsgDetail = err instanceof Error ? err.message : String(err);
      setErrorMsg(`儲存預約申請失敗，請檢查您的網路或重新送出。(詳細原因: ${errMsgDetail})`);
      handleFirestoreError(err, OperationType.WRITE, bookingCollection);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setLineId('');
    setOrganization('');
    setTourDate('');
    setAltDate1('');
    setAltDate2('');
    setStartTime('09:00');
    setEndTime('11:00');
    setPartySizeRange('1–5 人');
    setCustomPartySize('');
    setSelectedAudiences(['一般民眾']);
    setSelectedDistricts(['鼓山']);
    setSelectedThemes(['高雄歷史']);
    setTourDuration('120 分鐘');
    setLanguage('中文');
    setMeetingPoint('哈瑪星鐵道文化園區');
    setCustomMeetingPoint('');
    setSelectedSpecialNeeds(['無特殊需求']);
    setNotes('');
    setAgreed(false);
    setSubmitted(false);
    setErrorMsg('');
  };

  return (
    <div className="space-y-10 animate-fade-in" id="calendar-section">
      {/* Editorial Header Banner */}
      <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-950 text-amber-50 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl border border-amber-900/20 text-left">
        <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=1200")' }}></div>
        <div className="relative z-10 max-w-4xl space-y-4">
          <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] bg-amber-500/10 px-3 py-1 rounded-full border border-amber-400/20 inline-block">WALK RESERVATION SYSTEM</span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
            文史走讀．專屬預約系統
          </h2>
          <p className="text-amber-100/80 text-sm md:text-base leading-relaxed font-serif max-w-3xl">
            星野洋洋帶您穿梭大港時光！無論是學校校外教學、企業團體包裝或親子家庭聚會，
            請在此填寫您的預約細節，收到您的需求後，我們將與您主動聯繫，客製化打造專屬的高雄文化導覽。
          </p>
        </div>
      </div>

      {/* STEP 1: Route Template Selector */}
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          <Sparkles className="w-5 h-5 text-amber-800" />
          <h3 className="font-serif font-bold text-stone-900 text-lg md:text-xl">推薦走讀主題路線</h3>
        </div>
        <p className="text-stone-500 text-xs md:text-sm">
          點擊下方任一推薦主題路線，系統將自動預填該路線的「區域」、「主題」、「時間」與「集合地點」等基礎配置，讓您快速送出預約！
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="recommended-routes-grid">
          {RECOMMENDED_ROUTES.map((route, idx) => {
            const isSelected = selectedRoute.title === route.title;
            return (
              <button
                key={idx}
                onClick={() => handleSelectRouteTemplate(route)}
                className={`text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-48 cursor-pointer group ${
                  isSelected
                    ? 'bg-amber-50/50 border-amber-700 shadow-sm ring-1 ring-amber-700/20'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {route.duration}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 已選定
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base group-hover:text-amber-800 transition-colors line-clamp-1">
                    {route.title}
                  </h4>
                  <p className="text-stone-500 text-xs line-clamp-3 leading-relaxed font-serif">
                    {route.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                  <span className="truncate">地點：{route.districts.join('、')}</span>
                  <span className="text-amber-800 font-bold group-hover:underline flex items-center gap-0.5 shrink-0">
                    預填此路線 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Reservation Form container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden text-left" id="booking-form-start">
        {submitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center py-16 px-6 max-w-xl mx-auto space-y-6" 
            id="booking-success-container"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
              className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border border-emerald-100/50"
            >
              <CheckCircle2 className="w-12 h-12" />
            </motion.div>
            <div className="space-y-2">
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-2xl font-serif font-bold text-stone-950"
              >
                預約申請已送出！
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.45 }}
                className="text-emerald-800 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block"
              >
                目前的預約狀態：待確認
              </motion.p>
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="text-stone-600 text-sm leading-relaxed font-serif"
            >
              感謝您的預約申請！您的預約代碼為 <span className="font-mono font-bold bg-stone-100 px-2 py-1 rounded text-stone-800 text-xs">{successId}</span>。<br />
              <strong>請注意：送出預約後，需待管理員與您主動聯絡並確認細節，才算預約成功。</strong><br />
              星野洋洋會盡快於 24 小時內，透過您留下的聯絡電話或電子信箱與您確認走讀細節。
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="bg-stone-50 rounded-2xl p-5 border border-stone-100 text-left text-xs text-stone-700 space-y-2 font-serif shadow-xs"
            >
              <h4 className="font-bold border-b border-stone-200 pb-1 text-stone-900">預約摘要明細</h4>
              <div><strong>預訂路線：</strong> {selectedRoute.title}</div>
              <div><strong>主要日期：</strong> {tourDate} ({startTime} ~ {endTime})</div>
              {altDate1 && <div><strong>備選日期一：</strong> {altDate1}</div>}
              {altDate2 && <div><strong>備選日期二：</strong> {altDate2}</div>}
              <div><strong>預約人：</strong> {name} ({phone})</div>
              <div><strong>電子郵件：</strong> {email}</div>
              <div><strong>導覽時間：</strong> {tourDuration}</div>
              <div><strong>導覽人數：</strong> {partySizeRange === '40 人以上（請填寫實際人數）' ? `${customPartySize} 人` : partySizeRange}</div>
              <div><strong>集合地點：</strong> {meetingPoint === '其他（自行填寫）' ? customMeetingPoint : meetingPoint}</div>
              <div><strong>導覽語言：</strong> {language}</div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, delay: 0.9 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleResetForm}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              繼續填寫其他走讀預約 <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="divide-y divide-stone-150">
            {/* Form Section Header */}
            <div className="p-6 md:p-8 bg-stone-50/50">
              <div className="flex items-center gap-3 mb-1">
                <Calendar className="w-6 h-6 text-amber-800" />
                <h3 className="text-xl font-bold font-serif text-stone-900">填寫深度走讀預約單</h3>
              </div>
              <p className="text-stone-500 text-xs md:text-sm">
                目前選定走讀路線模板：<strong className="text-amber-900 font-serif">{selectedRoute.title}</strong>
              </p>
            </div>

            {/* 一、預約人資料 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">1</span>
                <span>預約人聯絡資料（必填）</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="請輸入姓名 (例：王小明)"
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    聯絡電話 *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="請輸入聯絡手機"
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    電子郵件 *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="請輸入聯絡 Email"
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    LINE ID（選填）
                  </label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="請輸入 LINE ID 以便即時溝通聯絡"
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    單位 / 公司 / 學校（選填）
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="例：國立中山大學歷史系、XX文史工作室"
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 二、導覽日期與時間 */}
            <div className="p-6 md:p-8 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">2</span>
                  <span>導覽日期與時間規劃</span>
                </h4>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 text-[10px] text-amber-900 font-bold flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>提示：送出預約後，需待確認才算預約成功</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    第一首選導覽日期 *
                  </label>
                  <input
                    type="date"
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    備選日期一
                  </label>
                  <input
                    type="date"
                    value={altDate1}
                    onChange={(e) => setAltDate1(e.target.value)}
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    備選日期二
                  </label>
                  <input
                    type="date"
                    value={altDate2}
                    onChange={(e) => setAltDate2(e.target.value)}
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    希望開始時間 *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                    預計結束時間 *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 三、人數 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">3</span>
                <span>預估導覽人數</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-2 uppercase">
                    選擇人數級距 *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['1–5 人', '6–10 人', '11–20 人', '21–30 人', '31–40 人', '40 人以上（請填寫實際人數）'].map((range) => {
                      const isSelected = partySizeRange === range;
                      return (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setPartySizeRange(range)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          {range.replace('（請填寫實際人數）', '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {partySizeRange === '40 人以上（請填寫實際人數）' && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                      請填寫實際預估人數 *
                    </label>
                    <input
                      type="number"
                      min={40}
                      value={customPartySize}
                      onChange={(e) => setCustomPartySize(e.target.value)}
                      placeholder="例：55"
                      className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 四、導覽對象 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">4</span>
                <span>導覽對象屬性（可複選）</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {AUDIENCE_OPTIONS.map((aud) => {
                  const isChecked = selectedAudiences.includes(aud);
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => toggleAudience(aud)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50/60 border-amber-700 text-amber-950 shadow-2xs font-bold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-amber-800" /> : <Square className="w-4 h-4 text-stone-300" />}
                      <span>{aud}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 五、想走讀的區域 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">5</span>
                <span>想走讀的區域（可複選）</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {DISTRICT_OPTIONS.map((dist) => {
                  const isChecked = selectedDistricts.includes(dist);
                  return (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => toggleDistrict(dist)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50/60 border-amber-700 text-amber-950 shadow-2xs font-bold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-amber-800" /> : <Square className="w-4 h-4 text-stone-300" />}
                      <span>{dist}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 六、主題 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">6</span>
                <span>導覽文史主題（可複選）</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {THEME_OPTIONS.map((theme) => {
                  const isChecked = selectedThemes.includes(theme);
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => toggleTheme(theme)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50/60 border-amber-700 text-amber-950 shadow-2xs font-bold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-amber-800" /> : <Square className="w-4 h-4 text-stone-300" />}
                      <span>{theme}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 七、導覽時間 & 八、語言 */}
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 導覽時間 */}
                <div className="space-y-4">
                  <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">7</span>
                    <span>預估導覽時間</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIME_DURATION_OPTIONS.map((dur) => {
                      const isSelected = tourDuration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setTourDuration(dur)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          {dur}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 導覽語言 */}
                <div className="space-y-4">
                  <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">8</span>
                    <span>解說使用語言</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const isSelected = language === lang;
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setLanguage(lang)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 九、集合地點 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">9</span>
                <span>期望集合地點</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-2 uppercase">
                    選擇集合地點 *
                  </label>
                  <select
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs focus:border-amber-700 outline-none cursor-pointer"
                  >
                    {MEETING_POINT_OPTIONS.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>

                {meetingPoint === '其他（自行填寫）' && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase">
                      請填寫自訂的集合地點 *
                    </label>
                    <input
                      type="text"
                      value={customMeetingPoint}
                      onChange={(e) => setCustomMeetingPoint(e.target.value)}
                      placeholder="例如：鹽埕埔捷運站 1 號出口"
                      className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 十、特殊需求 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">10</span>
                <span>特殊攜帶或行動協助需求（可複選）</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SPECIAL_NEEDS_OPTIONS.map((need) => {
                  const isChecked = selectedSpecialNeeds.includes(need);
                  return (
                    <button
                      key={need}
                      type="button"
                      onClick={() => toggleSpecialNeed(need)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50/60 border-amber-700 text-amber-950 shadow-2xs font-bold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-amber-800" /> : <Square className="w-4 h-4 text-stone-300" />}
                      <span>{need}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 十一、備註 */}
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">11</span>
                <span>額外備註或客製行程許願</span>
              </h4>

              <div>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="請自由填寫。例如：特別希望介紹哪些歷史建物、是否需要安排大量拍照時間、特定餐點推薦許願或是否需要完全客製化路線規劃..."
                  className="w-full bg-stone-50/40 border border-stone-200 focus:border-amber-700 focus:bg-white rounded-xl p-4 text-xs outline-none transition-all font-serif resize-none"
                ></textarea>
              </div>
            </div>

            {/* 十二、同意事項 & Submit */}
            <div className="p-6 md:p-8 bg-stone-50/30 space-y-6">
              <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-800 text-amber-50 text-xs rounded-full flex items-center justify-center font-mono font-bold">12</span>
                <span>同意事項與確認送出</span>
              </h4>

              {/* Terms Checkbox */}
              <div className="border border-amber-900/10 bg-amber-50/20 rounded-2xl p-5 space-y-3 max-w-2xl">
                <h5 className="font-serif font-bold text-xs text-amber-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-800" /> 預約須知與條款同意：
                </h5>
                <ul className="text-stone-600 text-[11px] leading-relaxed space-y-1 list-disc list-inside font-serif">
                  <li>本預約單送出後僅代表送出預約申請，<strong>不代表預約已正式成功</strong>。</li>
                  <li>管理員星野洋洋將會親自評估導覽路線、日期、氣候及當前名額，核可後會與您聯絡，才算預約成功。</li>
                  <li>走讀路線可能因不可抗力、颱風暴雨等天候因素適度調整或取消，屆時將提前通知。</li>
                  <li>若您有任何突發狀況需要取消或改期，請務必提前來信或聯絡通知我們。</li>
                </ul>

                <button
                  type="button"
                  onClick={() => setAgreed(!agreed)}
                  className="flex items-center gap-2 pt-2 text-stone-900 text-xs font-bold cursor-pointer transition-all self-start"
                >
                  {agreed ? <CheckSquare className="w-5 h-5 text-amber-800" /> : <Square className="w-5 h-5 text-stone-300" />}
                  <span>我已詳細閱讀、理解並同意上述預約須知。 *</span>
                </button>
              </div>

              {/* Error warning banner */}
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 max-w-xl">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSubmitting
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                      : 'bg-amber-800 text-amber-50 hover:bg-amber-900 shadow-amber-950/10'
                  }`}
                >
                  {isSubmitting ? '正在連線 Firestore 寫入資料庫中...' : '送出走讀預約申請'}
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-3.5 rounded-xl font-bold text-xs bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition-all cursor-pointer"
                >
                  重設表單
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
