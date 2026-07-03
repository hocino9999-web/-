export interface Message {
  id: string;
  name: string;
  title: string;
  content: string;
  rating: number; // 1-5 stars
  avatarEmoji: string;
  createdAt: any; // Can be Firebase Timestamp or JS Date string/number
  category: string; // e.g. '走讀回饋', '文史交流', '活動建議', '一般留言'
  reply?: string; // Optional admin reply
  replyAt?: string;
}

export interface TourNote {
  id: string;
  title: string;
  category: string;
  summary?: string;
  content: string;
  location?: string;
  district?: string;
  imageUrl: string;
  date: string;
  author?: string;
  likes: number;
  hearts?: number;
  views?: number;
}

export interface Video {
  id: string;
  title: string;
  videoId: string;
  series: string;
  description: string;
  date: string;
  imageUrl: string;
  views?: number;
  likes?: number;
  hearts?: number;
}

export interface Itinerary {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  district: string;
  duration: string;
  spotsCount: number;
  stops: { name: string; desc: string; lat: number; lng: number }[];
  difficulty: '輕鬆' | '中等' | '深厚';
  price: number;
  recommendFood: string[];
}

export interface ScheduleEvent {
  id: string;
  itineraryId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  availableSpots: number;
  totalSpots: number;
  status: '報名中' | '即將額滿' | '已額滿';
}

export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  lineId?: string;
  organization?: string;
  date: string;
  altDate1?: string;
  altDate2?: string;
  startTime: string;
  endTime: string;
  partySizeRange: string;
  customPartySize?: string;
  targetAudience: string[]; // e.g. ["一般民眾", "家庭親子"]
  districts: string[]; // 想走讀的區域
  themes: string[]; // 主題
  duration: string;
  language: string;
  meetingPoint: string;
  customMeetingPoint?: string;
  specialNeeds: string[];
  notes?: string;
  agreed: boolean;
  createdAt: any;
  status: '待確認' | '已確認' | '已取消';
  routeTitle: string; // Recommended / chosen route title
}
