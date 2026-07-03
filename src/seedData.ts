import { TourNote, Itinerary, ScheduleEvent } from './types';

export const INITIAL_TOUR_NOTES: TourNote[] = [];

export const INITIAL_ITINERARIES: Itinerary[] = [
  {
    id: 'itinerary-1',
    title: '鹽埕時光漫步',
    subtitle: '美軍酒吧、大溝頂老商場與黃金時代的庶民文化之旅',
    description: '深入鹽埕最古老的微型街廓，從戰後舶來品、美軍酒吧文化，到當代青年返鄉老屋修復的溫暖故事，體驗最接地氣的高雄常民文史。',
    district: '鹽埕區',
    duration: '2.5 小時',
    spotsCount: 5,
    difficulty: '輕鬆',
    price: 450,
    recommendFood: ['阿婆冰', '鴨肉珍', '鹽埕碳烤三明治', '金溫州餛飩大王'],
    stops: [
      { name: '鼓山/鹽埕分界愛河舊鐵道', desc: '昔日縱貫鐵路臨港線，串聯高雄大港的工業與繁榮起點。', lat: 22.6214, lng: 120.2861 },
      { name: '大溝頂微型商場', desc: '全台最早舶來品街，磨石子走道與木造閣樓老鋪。', lat: 22.6241, lng: 120.2825 },
      { name: '舊堀江舶來品街', desc: '戰後走私與精緻舶來品集散地，滿滿的異國情懷。', lat: 22.6231, lng: 120.2818 },
      { name: '美軍酒吧遺址散策', desc: '探尋戰後七艦隊停泊留下的爵士樂、調酒與西方餐飲遺風。', lat: 22.6222, lng: 120.2831 },
      { name: '參觀老屋活化茶行', desc: '百歲茶行改建，在檜木香氣中品茗並聽星野洋洋細說大溝頂始末。', lat: 22.6250, lng: 120.2842 }
    ]
  },
  {
    id: 'itinerary-2',
    title: '哈瑪星鐵道與和風風華',
    subtitle: '穿梭百年海陸樞紐的現代化與近代折衷建築走讀',
    description: '「濱線」鐵道帶來了現代化的高雄。本路線聚焦日治時期築港、官署建築與銀行街的洋風建築，重現台灣大正昭和年間的進步與繁華。',
    district: '哈瑪星',
    duration: '3 小時',
    spotsCount: 6,
    difficulty: '中等',
    price: 550,
    recommendFood: ['哈瑪星黑輪', '汕頭麵', '蘇阿嬤雞蛋酥', '新濱駅前咖啡'],
    stops: [
      { name: '舊鼓山驛（舊打狗驛）', desc: '高雄鐵路發祥地，扇形車庫與鐵道文化園區。', lat: 22.6218, lng: 120.2762 },
      { name: '新濱町老金融街（高雄華爾街）', desc: '日治時期三和銀行、商工銀行、郵局等華麗洋風官舍林立。', lat: 22.6211, lng: 120.2738 },
      { name: '愛國婦人會館', desc: '和洋折衷紅磚大正老屋，女性社交與文史展覽場地。', lat: 22.6235, lng: 120.2745 },
      { name: '鼓山代天宮', desc: '昔日高雄市役所遺址，現為哈瑪星信仰中心與著名小吃集散地。', lat: 22.6225, lng: 120.2721 },
      { name: '武德殿', desc: '日本傳統社殿式磚造武道館，神聖的樟樹古木與劍道演武。', lat: 22.6251, lng: 120.2715 }
    ]
  },
  {
    id: 'itinerary-3',
    title: '左營舊城傳奇走讀',
    subtitle: '漫步咾咕石城牆、拱門與眷村古井的跨時代敘事',
    description: '走進全台保存最完整的清代城池「鳳山縣舊城」，從清朝咾咕石城牆、東門護城河，到戰後果貿社區眷村故事，一趟探尋大高雄防衛樞紐的深度歷史課。',
    district: '左營舊城',
    duration: '2.5 小時',
    spotsCount: 4,
    difficulty: '輕鬆',
    price: 480,
    recommendFood: ['寬來順早餐', '果貿吳媽家餃子', '劉家酸白菜火鍋', '左營汾陽餛飩'],
    stops: [
      { name: '舊城東門（鳳儀門）', desc: '咾咕石砌成古城牆，保留完整的門神洗石子雕刻與水門護城河。', lat: 22.6781, lng: 120.2941 },
      { name: '眷村老井與防空洞遺址', desc: '舊城腳下的眷村常民遺跡，清井、日洞、眷民屋。', lat: 22.6795, lng: 120.2925 },
      { name: '果貿圓形住宅社區（小香港）', desc: '獨特蜂巢狀大型眷村國宅，高密度的人民生活縮影。', lat: 22.6765, lng: 120.2885 },
      { name: '舊城北門（拱辰門）', desc: '北門咾咕石牆身與清代石碑，遠眺半屏山與蓮池潭。', lat: 22.6841, lng: 120.2952 }
    ]
  }
];

export const INITIAL_SCHEDULE_EVENTS: ScheduleEvent[] = [];
