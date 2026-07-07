import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TourNote } from '../types';
import { MapPin, Search, Compass, BookOpen, ArrowRight, HelpCircle, Eye, Star } from 'lucide-react';
import { convertGoogleDriveUrl } from '../utils';

interface HistoryMapProps {
  dbArticles: TourNote[];
  onSelectArticle: (article: TourNote) => void;
  onSearchArticles: (query: string) => void;
  setActiveTab: (tab: 'home' | 'notes' | 'videos' | 'calendar' | 'guestbook' | 'about' | 'admin') => void;
}

interface MapSpot {
  id: string;
  name: string;
  category: '歷史建物' | '文史采風' | '私房景點';
  lat: number;
  lng: number;
  district: string;
  description: string;
  imageUrl: string;
  searchKeyword: string;
}

const HISTORIC_SPOTS: MapSpot[] = [
  {
    id: 'spot-武德殿',
    name: '鼓山武德殿',
    category: '歷史建物',
    lat: 22.6251,
    lng: 120.2715,
    district: '哈瑪星',
    description: '興建於1924年（大正13年），為日治時期警察與武道人士修練劍道、柔道的場所。外觀採折衷主義磚造樣式，融合傳統日本社殿與西方磚石語彙，庭院中佇立著一棵巍峨的百年古樟樹，是高雄極具代表性的歷史文化空間。',
    imageUrl: 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '武德殿'
  },
  {
    id: 'spot-金融街',
    name: '新濱町老金融街',
    category: '文史采風',
    lat: 22.6211,
    lng: 120.2738,
    district: '哈瑪星',
    description: '日治時期被譽為「高雄的華爾街」。隨打狗築港與縱貫鐵路開通，此街廓匯聚了舊三和銀行、商工銀行、打狗郵便局等華麗洋風建築，見證了二十世紀初高雄現代化金融、航運與政經中心的崛起。',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '金融街'
  },
  {
    id: 'spot-大溝頂',
    name: '大溝頂微型商場',
    category: '私房景點',
    lat: 22.6241,
    lng: 120.2825,
    district: '鹽埕區',
    description: '建於排水大溝之上的微型老街廓商場，是全台最窄、最長的老商場之一。戰後冷戰時期，隨美軍進駐與港口走私興盛，這裡發展成繁榮的舶來品批發街、老西服店與旗袍鋪，至今仍保留檜木閣樓、傳統磨石子走道與傳承三代的老字號小吃。',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '大溝頂'
  },
  {
    id: 'spot-打狗驛',
    name: '舊打狗驛（舊鼓山驛）',
    category: '歷史建物',
    lat: 22.6218,
    lng: 120.2762,
    district: '哈瑪星',
    description: '高雄港鐵路的發祥地。興建於日治時期，為當時縱貫鐵路「濱線（Hamasen）」的起點，負責將腹地的糖、香蕉與木材經海陸聯運銷往世界。現已活化為哈瑪星鐵道文化園區，保留著完整的弧形鐵軌、古老貨運車廂與鐵道遺跡。',
    imageUrl: 'https://images.unsplash.com/photo-1515165504669-4230c8411e5c?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '打狗驛'
  },
  {
    id: 'spot-東門',
    name: '鳳山縣舊城東門（鳳儀門）',
    category: '歷史建物',
    lat: 22.6781,
    lng: 120.2941,
    district: '左營舊城',
    description: '全台保存最完整的清代咾咕石石城牆。東門又稱「鳳儀門」，興建於清道光年間，城門額石牌保存完好，兩側城垣由海底珊瑚礁咾咕石與內裡三合土夯實。城外仍保有清澈的古護城河、雙雉堞與踏道，流露出古樸雄渾的防衛氣勢。',
    imageUrl: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '舊城'
  },
  {
    id: 'spot-果貿',
    name: '果貿圓形社區（小香港）',
    category: '私房景點',
    lat: 22.6765,
    lng: 120.2885,
    district: '左營舊城',
    description: '興建於1980年代的圓形蜂巢式眷村改建國宅。兩棟大型半圓形公寓面對面圍成完美的圓形中庭，其高密度、對稱性的視覺張力與陽台風光，宛如懷舊香港街廓。中庭內設有古早理髮店、雜貨店與各式北方眷村麵點，是時代生活的活化石。',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '果貿'
  },
  {
    id: 'spot-代天宮',
    name: '鼓山代天宮',
    category: '歷史建物',
    lat: 22.6225,
    lng: 120.2721,
    district: '哈瑪星',
    description: '坐落於日治時期第一代「高雄市役所（市政府）」遺址上。主祀五府千歲，是哈瑪星地區重要的信仰與社交中心。廟宇雕樑畫棟、極具傳統工藝美學。宮前的寬闊廟埕更是鹽埕鼓山著名的小吃集散地，盛載著數十載常民生活的美味記憶。',
    imageUrl: 'https://images.unsplash.com/photo-1541088645395-6f36be127575?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '代天宮'
  },
  {
    id: 'spot-愛國婦人會館',
    name: '哈瑪星愛國婦人會館',
    category: '歷史建物',
    lat: 22.6235,
    lng: 120.2745,
    district: '哈瑪星',
    description: '落成於1921年（大正10年），採二樓磚造、和洋折衷樣式。紅磚砌築的精美外牆搭配精緻洗石子與仿西式圓拱窗，當時提供上流社會女性舉辦文化講習、推廣家政與社交活動。戰後一度作為海員招待所，現已修復為文史展演場地。',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '愛國婦人'
  },
  {
    id: 'spot-英國領事館',
    name: '打狗英國領事館官邸',
    category: '歷史建物',
    lat: 22.6198,
    lng: 120.2642,
    district: '鼓山區',
    description: '建於1879年，座落於哨船頭山丘之上，是台灣現存最古老、保存最完整的西式洋樓官邸。採用精美紅磚半圓拱圈結構，通風避雨性能絕佳。登臨其上，可將整個西子灣夕陽、大港口船隻往來與旗津半島景色盡收眼底，歷史氣息與自然風光交織。',
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '領事館'
  },
  {
    id: 'spot-美軍酒吧',
    name: '美軍酒吧散策遺址',
    category: '文史采風',
    lat: 22.6222,
    lng: 120.2831,
    district: '鹽埕區',
    description: '韓戰與越戰冷戰年間，美國第七艦隊頻繁進駐高雄港度假。在鹽埕鄰港街廓誕生了數十家美軍俱樂部與西洋酒吧。隨霓虹燈閃爍，英文歌謠、美式調酒、牛排餐飲與爵士樂在此大放異彩，為質樸的高雄注入了一段前衛而迷幻的異國文化插曲。',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '美軍'
  },
  {
    id: 'spot-棧二庫',
    name: '棧二庫 (KW2)',
    category: '歷史建物',
    lat: 22.6190,
    lng: 120.2720,
    district: '哈瑪星',
    description: '興建於1914年（大正3年），原為日治時期存放砂糖的雙層磚造倉庫。二戰期間遭美軍轟炸損毀後，於1962年（民國51年）以鋼筋混凝土與力霸鋼架重建，內部獨特的無柱開闊空間極具工業建築遺產價值。現今成功活化為串聯海景與常民記憶的文創商場。',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '棧二庫'
  },
  {
    id: 'spot-駁二',
    name: '駁二藝術特區',
    category: '文史采風',
    lat: 22.6199,
    lng: 120.2813,
    district: '鹽埕區',
    description: '原為高雄港第二號接駁碼頭旁的台糖與台肥港口老倉庫群。於2001年經文史與藝術工作者推動重獲新生，將斑駁的歷史鋼筋水泥、巨型工業鋼鐵雕塑及當代塗鴉藝術交融，打造出南台灣最受矚目的前衛與實驗性藝術聚落。',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '駁二'
  }
];

export default function HistoryMap({ dbArticles, onSelectArticle, onSearchArticles, setActiveTab }: HistoryMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [selectedSpot, setSelectedSpot] = useState<MapSpot>(HISTORIC_SPOTS[0]);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Find matching article in the database based on spot keywords
  const getMatchedArticle = (spot: MapSpot): TourNote | null => {
    if (!dbArticles || dbArticles.length === 0) return null;
    const match = dbArticles.find(art => 
      art.title.toLowerCase().includes(spot.searchKeyword.toLowerCase()) ||
      art.title.toLowerCase().includes(spot.name.toLowerCase()) ||
      (art.content && art.content.toLowerCase().includes(spot.searchKeyword.toLowerCase()))
    );
    return match || null;
  };

  const matchedArticle = getMatchedArticle(selectedSpot);

  // Filter spots dynamically
  const filteredSpots = HISTORIC_SPOTS.filter(spot => {
    const matchesCategory = activeCategory === '全部' || spot.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle marker click or sidebar select
  const handleSelectSpot = (spot: MapSpot, zoomTo: boolean = true) => {
    setSelectedSpot(spot);
    
    // Smoothly pan and zoom Leaflet map to the location
    if (zoomTo && mapRef.current) {
      mapRef.current.setView([spot.lat, spot.lng], 16, {
        animate: true,
        duration: 0.8
      });
    }

    // Open popup on the specific marker
    const marker = markersRef.current[spot.id];
    if (marker) {
      marker.openPopup();
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    // Ensure container is ready and not already contaminated
    const container = L.DomUtil.get('kaohsiung-history-map');
    if (container !== null) {
      (container as any)._leaflet_id = null;
    }

    // 1. Create Map Instance centered around Kaohsiung's historic harbor area
    const map = L.map('kaohsiung-history-map', {
      center: [22.6235, 120.276],
      zoom: 14,
      scrollWheelZoom: false,
      zoomControl: true,
      dragging: true,
      tap: true,
      touchZoom: true
    });

    mapRef.current = map;

    // 2. Add beautiful, minimal retro CartoDB tile layer (matches the vintage editorial theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    // Invalidate size shortly after mounting to ensure container width/height are fully resolved by browser rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // 3. Clean up on unmount
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync and update markers based on filters and selections
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Trigger invalidate size to prevent gray zones or missing tiles during updates
    map.invalidateSize();

    // Clear existing markers from references
    Object.values(markersRef.current).forEach(marker => {
      marker.remove();
    });
    markersRef.current = {};

    // Create markers for filtered spots
    filteredSpots.forEach(spot => {
      const isSelected = selectedSpot && selectedSpot.id === spot.id;

      // Beautiful customized SVG Marker Icon using Leaflet L.divIcon
      const markerHtml = `
        <div class="relative flex items-center justify-center transition-all duration-300">
          <!-- Pulse rings for currently selected marker -->
          ${isSelected ? `
            <span class="absolute inline-flex h-10 w-10 rounded-full bg-amber-800/30 animate-ping"></span>
            <span class="absolute inline-flex h-8 w-8 rounded-full bg-amber-800/40"></span>
          ` : ''}
          <!-- Central Marker Pin -->
          <div class="flex items-center justify-center w-8 h-8 rounded-full ${isSelected ? 'bg-amber-800 text-white shadow-lg scale-115' : 'bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-300'} shadow-md border-2 border-white transform transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.2 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <!-- Tiny Label -->
          <span class="absolute -bottom-5 bg-stone-900/85 text-[9px] text-white font-bold whitespace-nowrap px-1.5 py-0.5 rounded shadow-xs pointer-events-none transform scale-90">
            ${spot.name}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: `custom-history-marker-${spot.id}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10]
      });

      // Simple informative popup
      const popupContent = `
        <div class="p-1 font-serif text-left max-w-xs">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-[9px] font-bold bg-amber-800 text-amber-50 px-1.5 py-0.5 rounded-sm">${spot.category}</span>
            <span class="text-[9px] font-bold text-stone-400">${spot.district}</span>
          </div>
          <h4 class="font-bold text-xs text-stone-900 mb-1">${spot.name}</h4>
          <p class="text-[10px] text-stone-500 leading-relaxed line-clamp-2">${spot.description.substring(0, 45)}...</p>
        </div>
      `;

      const marker = L.marker([spot.lat, spot.lng], { icon: customIcon })
        .bindPopup(popupContent, { closeButton: false })
        .addTo(map);

      // Store reference
      markersRef.current[spot.id] = marker;

      // Add click events
      marker.on('click', () => {
        handleSelectSpot(spot, false);
      });
    });

  }, [filteredSpots, selectedSpot?.id]);

  // Adjust map fit bounds or centering when filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || filteredSpots.length === 0) return;

    // Recalculate dimensions before updating view/bounds
    map.invalidateSize();

    if (filteredSpots.length === 1) {
      const spot = filteredSpots[0];
      map.setView([spot.lat, spot.lng], 16);
    } else {
      const bounds = L.latLngBounds(filteredSpots.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [activeCategory]);

  return (
    <div className="bg-white rounded-3xl border border-stone-200/85 p-5 md:p-8 space-y-6 shadow-md shadow-stone-150/40 text-left" id="kaohsiung-history-map-section">
      
      {/* Upper Panel: Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] bg-amber-100/60 px-2.5 py-1 rounded-full border border-amber-200/50 inline-flex items-center gap-1">
            <Compass className="w-3 h-3 text-amber-800" />
            <span>INTERACTIVE HISTORY PORTAL</span>
          </span>
          <h3 className="text-2xl font-serif font-bold text-stone-900 mt-2 leading-tight flex items-center gap-2">
            <span>高雄文史地圖</span>
          </h3>
          <p className="text-stone-500 text-xs mt-1 font-serif">點擊地圖標記、搜尋景點，立即探尋高雄港市、左營舊城與鹽埕街區的百年時光切片</p>
        </div>

        {/* Dynamic Category Chips */}
        <div className="flex flex-wrap gap-1.5">
          {['全部', '歷史建物', '文史采風', '私房景點'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeCategory === cat
                  ? 'bg-amber-800 text-amber-50 border-amber-800 shadow-sm'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {cat === '全部' ? '全部景點' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Map with Search Box (col-span-8) */}
        <div className="lg:col-span-8 relative flex flex-col space-y-3">
          {/* Quick Search */}
          <div className="relative w-full z-15">
            <input
              type="text"
              placeholder="輸入名稱、區域或特色搜尋歷史地點..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 focus:border-amber-800 rounded-xl pl-9 pr-8 py-2.5 text-xs outline-none transition-all shadow-3xs"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-stone-400 hover:text-stone-600 absolute right-3 top-3 text-xs font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Leaflet Stage */}
          <div className="w-full h-96 md:h-[460px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative shadow-inner">
            <div id="kaohsiung-history-map" className="w-full h-full overflow-hidden relative"></div>
            
            {/* Overlay indicators */}
            <div className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-[10px] px-2.5 py-1.5 rounded-lg z-15 pointer-events-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>顯示中的地點數：{filteredSpots.length} 個</span>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Spot Card (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col bg-stone-50/50 border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
          
          {/* Spot Image */}
          <div className="h-40 sm:h-44 w-full relative shrink-0 bg-stone-100 border-b border-stone-200">
            <img 
              src={convertGoogleDriveUrl(selectedSpot.imageUrl)} 
              alt={selectedSpot.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
            <div className="absolute bottom-3 left-3 right-3 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-amber-800 text-amber-50 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm">
                  {selectedSpot.category}
                </span>
                <span className="text-white text-[10px] font-bold font-serif opacity-90">
                  📍 {selectedSpot.district}
                </span>
              </div>
              <h4 className="font-serif font-bold text-white text-base md:text-lg">
                {selectedSpot.name}
              </h4>
            </div>
          </div>

          {/* Spot Details Body */}
          <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-4">
            <div className="space-y-3">
              <h5 className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">HISTORICAL DESCRIPTION</h5>
              <p className="text-stone-700 text-xs md:text-sm leading-relaxed font-serif text-justify line-clamp-6 md:line-clamp-none">
                {selectedSpot.description}
              </p>
            </div>

            {/* Seamless article linkage section */}
            <div className="pt-4 border-t border-stone-200/80">
              {matchedArticle ? (
                <div className="bg-amber-800/5 rounded-xl border border-amber-800/10 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    <div>
                      <h6 className="text-xs font-bold text-stone-900 line-clamp-1">延伸：{matchedArticle.title}</h6>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{matchedArticle.summary || '閱讀詳細高雄文史報導'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectArticle(matchedArticle)}
                    className="w-full py-1.5 bg-amber-800 hover:bg-amber-900 text-amber-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>閱讀此專題文章</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="bg-stone-100 rounded-xl border border-stone-200/60 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <h6 className="text-xs font-bold text-stone-800">尚未發表專屬專題</h6>
                      <p className="text-[10px] text-stone-500">尋找導覽筆記中有關本景點的記載</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSearchArticles(selectedSpot.searchKeyword);
                      setActiveTab('notes');
                    }}
                    className="w-full py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                  >
                    <span>搜尋相關文章</span>
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick spotlight list below bento box: Horizontally scrollable slider with snap points */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-150">
        <div className="flex justify-between items-center mb-2.5">
          <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">精選高雄走讀景點一覽（可左右滑動/拉動橫桿，點擊快速自動定位）</h5>
          <span className="text-[9px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">左右滑動</span>
        </div>
        <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-thin scrollbar-track-stone-100 scrollbar-thumb-stone-300/80 snap-x scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filteredSpots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSelectSpot(spot, true)}
              className={`px-3 py-2 text-xs font-serif rounded-lg border transition-all cursor-pointer shrink-0 snap-center flex items-center gap-1.5 ${
                selectedSpot.id === spot.id
                  ? 'bg-amber-800 text-amber-50 border-amber-800 font-bold shadow-sm scale-102'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200 hover:border-stone-300'
              }`}
            >
              <span className="text-xs">📍</span>
              <span>{spot.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
