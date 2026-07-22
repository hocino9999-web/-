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
  region: '哈瑪星與鹽埕' | '左營舊城';
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
    region: '哈瑪星與鹽埕',
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
    region: '哈瑪星與鹽埕',
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
    region: '哈瑪星與鹽埕',
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
    region: '哈瑪星與鹽埕',
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
    region: '左營舊城',
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
    region: '左營舊城',
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
    region: '哈瑪星與鹽埕',
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
    region: '哈瑪星與鹽埕',
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
    region: '哈瑪星與鹽埕',
    description: '建於1879年，座落於哨船頭山丘之上，是台灣現存最古老、保存最完整的西式洋樓官邸。採用精美紅磚半圓拱圈結構，通風避雨性能絕佳。登臨其上，可將整個西子灣夕陽、大港口船隻往來與旗津半島景色盡收眼底，歷史氣息與自然風光交織。',
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '領事館'
  },
  {
    id: 'spot-三和銀行',
    name: '舊三和銀行',
    category: '歷史建物',
    lat: 22.6214,
    lng: 120.2732,
    district: '哈瑪星',
    region: '哈瑪星與鹽埕',
    description: '興建於日治時期大正年間，原為三十四銀行高雄支店，戰後合併為三和銀行。建築外觀採洗石子構造與簡練樣式風格，內部保留厚重金庫門、銀行櫃檯與木構造，現已活化為結合精品咖啡與歷史展演的文化空間。',
    imageUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '三和銀行'
  },
  {
    id: 'spot-貿易商大樓',
    name: '貿易商大樓',
    category: '歷史建物',
    lat: 22.6212,
    lng: 120.2736,
    district: '哈瑪星',
    region: '哈瑪星與鹽埕',
    description: '位於哈瑪星舊金融街廓，鄰近舊三和銀行。建築前身曾為華僑大飯店，外觀保有經典洗石子立面與飾帶，見證了高雄港海陸通商貿易的黃金歲月，現轉型為推廣文創商品與在地歷史書籍的文創基地。',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '貿易商'
  },
  {
    id: 'spot-山形屋',
    name: '哈瑪星山形屋',
    category: '歷史建物',
    lat: 22.6220,
    lng: 120.2730,
    district: '哈瑪星',
    region: '哈瑪星與鹽埕',
    description: '興建於日治時期大正年間（約1920年），為哈瑪星紅磚洋樓建築的代表作。昔日由日籍商人經營「山形屋書店」，外觀擁有典雅的紅磚拱圈與精緻山牆飾帶，是昔日打狗文化人與學生聚會的重要書籍文化場域。',
    imageUrl: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '山形屋'
  },
  {
    id: 'spot-棧二庫',
    name: '棧二庫 (KW2)',
    category: '歷史建物',
    lat: 22.6190,
    lng: 120.2720,
    district: '哈瑪星',
    region: '哈瑪星與鹽埕',
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
    region: '哈瑪星與鹽埕',
    description: '原為高雄港第二號接駁碼頭旁的台糖與台肥港口老倉庫群。於2001年經文史與藝術工作者推動重獲新生，將斑駁的歷史鋼筋水泥、巨型工業鋼鐵雕塑及當代塗鴉藝術交融，打造出南台灣最受矚目的前衛與實驗性藝術聚落。',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
    searchKeyword: '駁二'
  }
];

export default function HistoryMap({ dbArticles, onSelectArticle, onSearchArticles, setActiveTab }: HistoryMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [selectedSpot, setSelectedSpot] = useState<MapSpot>(HISTORIC_SPOTS[0]);
  const [activeRegion, setActiveRegion] = useState<string>('哈瑪星與鹽埕');
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

  // Filter spots dynamically by Region, Category, and Search
  const filteredSpots = HISTORIC_SPOTS.filter(spot => {
    const matchesRegion = activeRegion === '全區' || spot.region === activeRegion;
    const matchesCategory = activeCategory === '全部' || spot.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesCategory && matchesSearch;
  });

  // Handle marker click or sidebar select
  const handleSelectSpot = (spot: MapSpot, zoomTo: boolean = true) => {
    setSelectedSpot(spot);
    
    // Smoothly pan and zoom Leaflet map directly to the spot with comfortably high zoom
    if (zoomTo && mapRef.current) {
      mapRef.current.setView([spot.lat, spot.lng], 16.5, {
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
    const container = L.DomUtil.get('kaohsiung-history-map');
    if (container !== null) {
      (container as any)._leaflet_id = null;
    }

    // 1. Create Map Instance initialized closely at Hamasen/Yancheng cluster (Zoom 15.5) so pins are spaced out!
    const map = L.map('kaohsiung-history-map', {
      center: [22.6225, 120.2745],
      zoom: 15.5,
      scrollWheelZoom: false,
      zoomControl: true,
      dragging: true,
      touchZoom: true
    });

    mapRef.current = map;

    // 2. Tile Layer: CartoDB Voyager
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    // Invalidate size multiple times after mounting to resolve container height accurately
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync markers & tooltips when filters or selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.invalidateSize();

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Create markers for filtered spots
    filteredSpots.forEach(spot => {
      const isSelected = selectedSpot && selectedSpot.id === spot.id;

      // Clean SVG Marker Pin
      const markerHtml = `
        <div class="relative flex items-center justify-center transition-all duration-300 transform group cursor-pointer">
          ${isSelected ? `
            <span class="absolute inline-flex h-9 w-9 rounded-full bg-amber-800/30 animate-ping"></span>
            <span class="absolute inline-flex h-7 w-7 rounded-full bg-amber-800/40 animate-pulse"></span>
          ` : `
            <span class="absolute inline-flex h-7 w-7 rounded-full bg-amber-800/0 transition-all duration-300 group-hover:bg-amber-800/20 group-hover:scale-110"></span>
          `}
          <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-md border-2 border-white transform transition-all duration-300 ${
            isSelected 
              ? 'bg-amber-800 text-white shadow-lg scale-115' 
              : 'bg-stone-100 text-stone-800 border border-stone-300 group-hover:bg-amber-800 group-hover:text-white group-hover:border-amber-800 group-hover:shadow-lg'
          }">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.2 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker-wrapper',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -12]
      });

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

      const marker = L.marker([spot.lat, spot.lng], { 
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0
      })
      .bindPopup(popupContent, { closeButton: false })
      .addTo(map);

      // Native Leaflet permanent tooltip sitting directly above each marker pin
      marker.bindTooltip(spot.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -16],
        className: isSelected ? 'history-map-tooltip history-map-tooltip-selected' : 'history-map-tooltip'
      });

      markersRef.current[spot.id] = marker;

      marker.on('click', () => {
        handleSelectSpot(spot, true);
      });
    });

  }, [filteredSpots, selectedSpot?.id]);

  // Adjust map bounds smoothly whenever region or category filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || filteredSpots.length === 0) return;

    map.invalidateSize();

    if (filteredSpots.length === 1) {
      const spot = filteredSpots[0];
      map.setView([spot.lat, spot.lng], 16.5, { animate: true });
    } else {
      const bounds = L.latLngBounds(filteredSpots.map(s => [s.lat, s.lng]));
      // Set appropriate padding and maxZoom so spots are spaced out clearly
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }, [activeRegion, activeCategory]);

  return (
    <div className="bg-white rounded-3xl border border-stone-200/85 p-5 md:p-8 space-y-6 shadow-md shadow-stone-150/40 text-left" id="kaohsiung-history-map-section">
      
      {/* Upper Panel: Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] bg-amber-100/60 px-2.5 py-1 rounded-full border border-amber-200/50 inline-flex items-center gap-1">
            <Compass className="w-3 h-3 text-amber-800" />
            <span>INTERACTIVE HISTORY PORTAL</span>
          </span>
          <h3 className="text-2xl font-serif font-bold text-stone-900 mt-2 leading-tight flex items-center gap-2">
            <span>高雄文史地圖</span>
          </h3>
          <p className="text-stone-500 text-xs mt-1 font-serif">地圖自動聚焦並標示各區文史景點名稱，點擊標籤或景點即可即時瀏覽詳細考據</p>
        </div>

        {/* Region & Category Selection Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Region Selector (地區導覽) */}
          <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
            {[
              { id: '哈瑪星與鹽埕', label: '📍 哈瑪星・鹽埕' },
              { id: '左營舊城', label: '🏯 左營舊城' },
              { id: '全區', label: '🗺️ 高雄全區' }
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => {
                  setActiveRegion(reg.id);
                  // Default select first spot of that region
                  const firstOfRegion = HISTORIC_SPOTS.find(s => reg.id === '全區' || s.region === reg.id);
                  if (firstOfRegion) setSelectedSpot(firstOfRegion);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeRegion === reg.id
                    ? 'bg-amber-800 text-white shadow-xs font-serif'
                    : 'text-stone-600 hover:text-amber-900'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* 2. Category Chips (主題分類) */}
          <div className="flex flex-wrap gap-1">
            {['全部', '歷史建物', '文史采風', '私房景點'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                  activeCategory === cat
                    ? 'bg-stone-800 text-white border-stone-800 shadow-3xs'
                    : 'bg-stone-50 hover:bg-amber-50/50 text-stone-600 hover:text-amber-900 border-stone-200'
                }`}
              >
                {cat === '全部' ? '全部主題' : cat}
              </button>
            ))}
          </div>
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
              placeholder="搜尋地點名稱、街道或文史關鍵字..."
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
          <div className="w-full h-96 md:h-[480px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative shadow-inner">
            <div id="kaohsiung-history-map" className="w-full h-full overflow-hidden relative"></div>
            
            {/* Overlay indicators */}
            <div className="absolute bottom-3 left-3 bg-stone-900/85 text-amber-100 text-[10px] px-3 py-1.5 rounded-lg z-15 pointer-events-none flex items-center gap-2 shadow-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>目前區域：<strong>{activeRegion}</strong> ({filteredSpots.length} 個標註景點)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Spot Card (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col bg-stone-50/60 border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
          
          {/* Spot Image */}
          <div className="h-44 sm:h-48 w-full relative shrink-0 bg-stone-100 border-b border-stone-200">
            <img 
              src={convertGoogleDriveUrl(selectedSpot.imageUrl)} 
              alt={selectedSpot.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent"></div>
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
            <div className="space-y-2.5">
              <h5 className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">HISTORICAL DESCRIPTION</h5>
              <p className="text-stone-700 text-xs md:text-sm leading-relaxed font-serif text-justify line-clamp-6">
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

      {/* Quick spotlight list below bento box */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-150">
        <div className="flex justify-between items-center mb-2.5">
          <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">點擊下方景點卡片，即刻平滑對焦地圖景點</h5>
          <span className="text-[9px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">可左右滑動</span>
        </div>
        <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-thin scrollbar-track-stone-100 scrollbar-thumb-stone-300/80 snap-x scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filteredSpots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSelectSpot(spot, true)}
              className={`px-3 py-2 text-xs font-serif rounded-lg border transition-all duration-300 cursor-pointer shrink-0 snap-center flex items-center gap-1.5 transform active:scale-95 ${
                selectedSpot.id === spot.id
                  ? 'bg-amber-800 text-amber-50 border-amber-800 font-bold shadow-md scale-105 -translate-y-0.5'
                  : 'bg-white hover:bg-amber-50/60 text-stone-700 hover:text-amber-900 border-stone-200 hover:border-amber-300/80 hover:shadow-sm hover:-translate-y-0.5'
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
