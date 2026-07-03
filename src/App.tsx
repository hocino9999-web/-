import React, { useState, useEffect } from 'react';
import { INITIAL_TOUR_NOTES } from './seedData';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Message, TourNote, Video } from './types';
import CalendarSection from './components/CalendarSection';
import CMSPanel from './components/CMSPanel';
import ChatBot from './components/ChatBot';
import HistoryMap from './components/HistoryMap';
import { BookOpen, Map, Calendar, MessageSquare, Shield, Compass, Heart, Share2, Plus, Star, AlertCircle, Trash2, Youtube, Eye, ThumbsUp, X, User as UserIcon, Edit, Save, CheckCircle2, ArrowRight, Search } from 'lucide-react';

const INITIAL_VIDEOS: Video[] = [
  {
    id: 'vid-1',
    title: '【打狗時光】鼓山篇 EP01：探尋哈瑪星鐵道與昔日高雄港驛',
    videoId: 'LBnUxf2pzQQ',
    series: '鼓山篇',
    description: '走訪高雄鐵路的發祥地「舊打狗驛」，細數扇形車庫與哈瑪星臨港線的興衰故事。我們漫步在舊軌道上，重溫昔日進出口香蕉、木材的繁華歲月，看見這座城市如何以港建市。',
    date: '2026-06-10',
    imageUrl: 'https://img.youtube.com/vi/LBnUxf2pzQQ/maxresdefault.jpg',
    views: 128,
    likes: 45,
    hearts: 32
  },
  {
    id: 'vid-2',
    title: '【大港采風】鳳山篇 EP02：穿梭龍山寺與曹公圳的古城歲月',
    videoId: 'dQw4w9WgXcQ',
    series: '鳳山篇',
    description: '鳳山是高雄歷史最悠久的聚落之一。跟著星野洋洋的鏡頭，探訪國定古蹟鳳山龍山寺，看精美的剪黏與彩繪藝術；沿著曹公圳散步，聆聽清代水利工程如何灌溉這片富饒的平原。',
    date: '2026-06-18',
    imageUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    views: 89,
    likes: 31,
    hearts: 20
  },
  {
    id: 'vid-3',
    title: '【導覽心情】鹽埕區 EP03：大溝頂舶來品街與美軍酒吧的午後',
    videoId: '9bZkp7q19f0',
    series: '鹽埕區',
    description: '鹽埕大溝頂是高雄最早的現代化商業街廓。在這裡，我們拜訪了幾家傳承三代的鐘錶老店，探尋當年美軍第七艦隊進港時，酒吧一條街的歡騰景象，以及如今老屋活化後的新生。',
    date: '2026-06-25',
    imageUrl: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
    views: 154,
    likes: 62,
    hearts: 48
  },
  {
    id: 'vid-4',
    title: '【星野專欄】心內話 EP04：為什麼我堅持在高雄做文史走讀？',
    videoId: 'tgbNymZ7vqY',
    series: '星野洋洋的心內話',
    description: '「走讀，不僅僅是看風景，更是與歷史和生命對話。」星野洋洋真誠告白，分享他多年來探查高雄街廓、收集老屋故事的心路歷程，以及對這片土地最深沉的愛與寄託。',
    date: '2026-07-01',
    imageUrl: 'https://img.youtube.com/vi/tgbNymZ7vqY/maxresdefault.jpg',
    views: 240,
    likes: 110,
    hearts: 95
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'notes' | 'videos' | 'calendar' | 'guestbook' | 'about' | 'admin'>('home');
  const [dbArticles, setDbArticles] = useState<TourNote[]>([]);
  const [dbVideos, setDbVideos] = useState<Video[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<TourNote | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Subcategory filters
  const [selectedArticleCategory, setSelectedArticleCategory] = useState<string>('全部');
  const articleCategories = ['全部', '導覽心情', '歷史建物', '文史采風', '私房景點', '高雄歷史', '人物誌'];

  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('全部');
  const videoCategories = ['全部', '鼓山篇', '鳳山篇', '鹽埕區', '鹽埕篇', '左營舊城', '星野洋洋的心內話', '精選影音'];

  // Search query states
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [videoSearchQuery, setVideoSearchQuery] = useState('');

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [localComments, setLocalComments] = useState<any[]>(() => {
    const saved = localStorage.getItem('local_comments');
    return saved ? JSON.parse(saved) : [];
  });
  
  const displayComments = [
    ...comments,
    ...localComments.filter(local => !comments.some(c => c.author === local.author && c.content === local.content && c.itemId === local.itemId))
  ];

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');

  // Comment input forms
  const [articleCommentAuthor, setArticleCommentAuthor] = useState('');
  const [articleCommentContent, setArticleCommentContent] = useState('');
  const [videoCommentAuthor, setVideoCommentAuthor] = useState('');
  const [videoCommentContent, setVideoCommentContent] = useState('');

  // Guestbook inputs
  const [guestName, setGuestName] = useState('');
  const [guestTitle, setGuestTitle] = useState('');
  const [guestContent, setGuestContent] = useState('');
  const [guestCategory, setGuestCategory] = useState('走讀回饋');
  const [guestRating, setGuestRating] = useState(5);
  const [guestEmoji, setGuestEmoji] = useState('🧭');
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState({ text: '', type: 'success' });

  // Custom non-blocking sandbox-safe dialogs
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'message' | 'comment_article' | 'comment_video' | null>(null);

  // Quick state for local admin testing - disabled for production secure deployment
  const [demoAdmin, setDemoAdmin] = useState(false);

  // States for inline guestbook reply
  const [replyInputs, setReplyInputs] = useState<{ [msgId: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Monitor Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const isAdminAuthorized = (currentUser && currentUser.email === 'hocino9999@gmail.com') || demoAdmin;

  // Monitor Articles from Firestore
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: TourNote[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const title = data.title || '';
          // Filter out the requested deleted articles
          if (
            title.includes('鹽埕舊埕的時光切片') ||
            title.includes('鹽埕的時光切片') ||
            title.includes('哈瑪星的洋風與和魂') ||
            title.includes('渡船頭與洋行遺跡') ||
            title.includes('鳳山縣舊城')
          ) {
            return;
          }
          loaded.push({
            id: docSnap.id,
            title,
            category: data.category || '走讀筆記',
            content: data.content || '',
            summary: data.summary || (data.content ? data.content.substring(0, 150) + '...' : ''),
            imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=800&q=80',
            date: data.date || '2026-07-01',
            author: data.author || '星野洋洋',
            likes: data.likes || 0,
            hearts: data.hearts || 0,
            views: data.views || 0,
            location: data.location || '',
            district: data.district || ''
          });
        });
        if (loaded.length === 0) {
          setDbArticles(INITIAL_TOUR_NOTES);
        } else {
          setDbArticles(loaded);
        }
      },
      (error) => {
        console.error('Firestore articles load error:', error);
        setDbArticles(INITIAL_TOUR_NOTES);
      }
    );
    return () => unsubscribe();
  }, []);

  // Monitor Videos from Firestore
  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Video[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            title: data.title || '',
            videoId: data.videoId || '',
            series: data.series || '精選影音',
            description: data.description || '',
            date: data.date || '2026-07-01',
            imageUrl: data.imageUrl || `https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`,
            views: data.views || 0,
            likes: data.likes || 0,
            hearts: data.hearts || 0
          });
        });
        if (loaded.length === 0) {
          setDbVideos(INITIAL_VIDEOS);
        } else {
          setDbVideos(loaded);
        }
      },
      (error) => {
        console.error('Firestore videos load error:', error);
        setDbVideos(INITIAL_VIDEOS);
      }
    );
    return () => unsubscribe();
  }, []);

  // Monitor Comments from Firestore
  useEffect(() => {
    const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let dateStr = '';
          if (data.createdAt) {
            if (data.createdAt instanceof Timestamp) {
              dateStr = data.createdAt.toDate().toLocaleString('zh-TW');
            } else if (data.createdAt.seconds) {
              dateStr = new Date(data.createdAt.seconds * 1000).toLocaleString('zh-TW');
            } else {
              dateStr = String(data.createdAt);
            }
          } else {
            dateStr = new Date().toLocaleString('zh-TW');
          }
          loaded.push({
            id: docSnap.id,
            itemId: data.itemId || '',
            itemType: data.itemType || '', // 'article' or 'video'
            author: data.author || '匿名遊客',
            content: data.content || '',
            createdAt: dateStr
          });
        });
        setComments(loaded);
      },
      (error) => {
        console.error('Comments subscription error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Monitor Messages (Guestbook)
  useEffect(() => {
    const messagesCollection = 'messages';
    const q = query(collection(db, messagesCollection), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let dateStr = '';
          if (data.createdAt) {
            if (data.createdAt instanceof Timestamp) {
              dateStr = data.createdAt.toDate().toLocaleString('zh-TW');
            } else if (data.createdAt.seconds) {
              dateStr = new Date(data.createdAt.seconds * 1000).toLocaleString('zh-TW');
            } else {
              dateStr = String(data.createdAt);
            }
          } else {
            dateStr = new Date().toLocaleString('zh-TW');
          }

          loaded.push({
            id: docSnap.id,
            name: data.name || '無名氏',
            title: data.title || '一般留言',
            content: data.content || '',
            rating: data.rating || 5,
            avatarEmoji: data.avatarEmoji || '🧭',
            createdAt: dateStr,
            category: data.category || '走讀回饋',
            reply: data.reply || undefined,
            replyAt: data.replyAt ? (data.replyAt instanceof Timestamp ? data.replyAt.toDate().toLocaleString('zh-TW') : String(data.replyAt)) : undefined
          });
        });
        setMessages(loaded);
      },
      (error) => {
        console.error('Firestore messages sync error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLikeArticle = async (id: string, currentLikes: number) => {
    try {
      const isSeed = INITIAL_TOUR_NOTES.some(note => note.id === id);
      const isDocExists = dbArticles.some(art => art.id === id && art.id !== 'note-1' && art.id !== 'note-2' && art.id !== 'note-3' && art.id !== 'note-4');
      
      if (isSeed && !isDocExists) {
        setDbArticles(prev =>
          prev.map(note => (note.id === id ? { ...note, likes: note.likes + 1 } : note))
        );
      } else {
        await updateDoc(doc(db, 'articles', id), {
          likes: currentLikes + 1
        });
      }
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  const handleHeartArticle = async (id: string, currentHearts: number) => {
    try {
      await updateDoc(doc(db, 'articles', id), {
        hearts: (currentHearts || 0) + 1
      });
    } catch (error) {
      console.error('Error hearting article:', error);
    }
  };

  const handleLikeVideo = async (id: string, currentLikes: number) => {
    try {
      const isSeed = INITIAL_VIDEOS.some(v => v.id === id);
      const isDocExists = dbVideos.some(v => v.id === id && !v.id.startsWith('vid-'));

      if (isSeed && !isDocExists) {
        setDbVideos(prev =>
          prev.map(v => (v.id === id ? { ...v, likes: (v.likes || 0) + 1 } : v))
        );
      } else {
        await updateDoc(doc(db, 'videos', id), {
          likes: (currentLikes || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleHeartVideo = async (id: string, currentHearts: number) => {
    try {
      const isSeed = INITIAL_VIDEOS.some(v => v.id === id);
      const isDocExists = dbVideos.some(v => v.id === id && !v.id.startsWith('vid-'));

      if (isSeed && !isDocExists) {
        setDbVideos(prev =>
          prev.map(v => (v.id === id ? { ...v, hearts: (v.hearts || 0) + 1 } : v))
        );
      } else {
        await updateDoc(doc(db, 'videos', id), {
          hearts: (currentHearts || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error hearting video:', error);
    }
  };

  const handleViewVideo = async (id: string, currentViews: number) => {
    try {
      const isSeed = INITIAL_VIDEOS.some(v => v.id === id);
      const isDocExists = dbVideos.some(v => v.id === id && !v.id.startsWith('vid-'));

      if (isSeed && !isDocExists) {
        setDbVideos(prev =>
          prev.map(v => (v.id === id ? { ...v, views: (v.views || 0) + 1 } : v))
        );
      } else {
        await updateDoc(doc(db, 'videos', id), {
          views: (currentViews || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error updating views:', error);
    }
  };

  // Add Comment to Firestore with local fallback
  const handleAddComment = async (itemId: string, itemType: 'article' | 'video', author: string, content: string) => {
    if (!author.trim() || !content.trim()) {
      showPostStatus('請填寫暱稱及留言內容！', 'error');
      return;
    }

    const localId = `local-${Date.now()}`;
    const newLocal = {
      id: localId,
      itemId,
      itemType,
      author: author.trim(),
      content: content.trim(),
      createdAt: new Date().toLocaleString('zh-TW')
    };

    // Pre-save to local memory for instant success feedback
    const updatedLocal = [newLocal, ...localComments];
    setLocalComments(updatedLocal);
    localStorage.setItem('local_comments', JSON.stringify(updatedLocal));

    if (itemType === 'article') {
      setArticleCommentAuthor('');
      setArticleCommentContent('');
    } else {
      setVideoCommentAuthor('');
      setVideoCommentContent('');
    }

    try {
      await addDoc(collection(db, 'comments'), {
        itemId,
        itemType,
        author: author.trim(),
        content: content.trim(),
        createdAt: new Date()
      });
      showPostStatus('已成功送出留言！', 'success');
    } catch (error) {
      console.error('Error adding comment to Firestore:', error);
      // We still treat it as success because the comment is safely saved in local state for the user
      showPostStatus('已送出留言！(已儲存於瀏覽器)', 'success');
    }
  };

  // Trigger custom delete confirmation dialog
  const triggerDeleteConfirm = (id: string, type: 'message' | 'comment_article' | 'comment_video') => {
    setDeleteConfirmId(id);
    setDeleteConfirmType(type);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId || !deleteConfirmType) return;
    try {
      if (deleteConfirmType === 'message') {
        await deleteDoc(doc(db, 'messages', deleteConfirmId));
        setMessages(prev => prev.filter(m => m.id !== deleteConfirmId));
        showPostStatus('管理員已成功刪除該筆不適當的留言！', 'success');
      } else {
        if (deleteConfirmId.startsWith('local-')) {
          const updated = localComments.filter(c => c.id !== deleteConfirmId);
          setLocalComments(updated);
          localStorage.setItem('local_comments', JSON.stringify(updated));
          showPostStatus('已成功刪除該筆留言。', 'success');
        } else {
          await deleteDoc(doc(db, 'comments', deleteConfirmId));
          setComments(prev => prev.filter(c => c.id !== deleteConfirmId));
          showPostStatus('已成功刪除該筆留言迴響。', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showPostStatus('刪除失敗，可能缺少權限或網路問題。', 'error');
    } finally {
      setDeleteConfirmId(null);
      setDeleteConfirmType(null);
    }
  };

  // Edit Comment State Triggers
  const handleStartEditComment = (commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };

  // Save Comment Edits
  const handleUpdateComment = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) {
      showPostStatus('留言內容不可為空白！', 'error');
      return;
    }
    try {
      if (commentId.startsWith('local-')) {
        const updated = localComments.map(c => c.id === commentId ? { ...c, content: newContent.trim() } : c);
        setLocalComments(updated);
        localStorage.setItem('local_comments', JSON.stringify(updated));
        setEditingCommentId(null);
        setEditingCommentText('');
        showPostStatus('已成功更新留言。', 'success');
      } else {
        await updateDoc(doc(db, 'comments', commentId), {
          content: newContent.trim()
        });
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newContent.trim() } : c));
        setEditingCommentId(null);
        setEditingCommentText('');
        showPostStatus('已成功更新留言。', 'success');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      showPostStatus('編輯留言失敗，可能缺少權限。', 'error');
    }
  };

  // Post new guestbook message to Firestore
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestTitle.trim() || !guestContent.trim()) {
      showPostStatus('請完整填寫姓名、標題與留言內容！', 'error');
      return;
    }

    setIsPosting(true);
    const path = 'messages';

    try {
      await addDoc(collection(db, path), {
        name: guestName.trim(),
        title: guestTitle.trim(),
        content: guestContent.trim(),
        category: guestCategory,
        rating: guestRating,
        avatarEmoji: guestEmoji,
        createdAt: serverTimestamp()
      });

      // Clear form on success
      setGuestName('');
      setGuestTitle('');
      setGuestContent('');
      setGuestRating(5);
      setGuestEmoji('🧭');
      
      showPostStatus('留言成功！感謝您的誠摯分享與支持。', 'success');
    } catch (error) {
      console.error('Error writing message to Firestore:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
      showPostStatus('留言寫入失敗，這可能是暫時性網路問題或安全規則不符。', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  // Delete Message from Firestore
  const handleDeleteMessage = (messageId: string) => {
    triggerDeleteConfirm(messageId, 'message');
  };

  // Save inline guestbook reply from admin
  const handleSaveReply = async (messageId: string) => {
    const replyText = replyInputs[messageId]?.trim();
    if (!replyText) {
      showPostStatus('請填寫回覆內容！', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        reply: replyText,
        replyAt: new Date().toLocaleString('zh-TW')
      });
      setReplyInputs(prev => ({ ...prev, [messageId]: '' }));
      setActiveReplyId(null);
      showPostStatus('管理員專屬回覆已成功送出！', 'success');
    } catch (error) {
      console.error('Failed to save inline reply:', error);
      showPostStatus('儲存回覆失敗，請確認是否具備管理員權限。', 'error');
    }
  };

  const showPostStatus = (text: string, type: 'success' | 'error') => {
    setPostStatus({ text, type });
    setTimeout(() => setPostStatus({ text: '', type: 'success' }), 4000);
  };

  // Dynamic filter lists
  const filteredArticles = dbArticles.filter(art => {
    const matchesCategory = selectedArticleCategory === '全部' || art.category === selectedArticleCategory;
    const matchesSearch = !articleSearchQuery.trim() || 
      art.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) || 
      (art.content || '').toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      (art.summary || '').toLowerCase().includes(articleSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredVideos = dbVideos.filter(vid => {
    let matchesCategory = false;
    if (selectedVideoCategory === '全部') {
      matchesCategory = true;
    } else if (selectedVideoCategory === '鹽埕區' || selectedVideoCategory === '鹽埕篇') {
      matchesCategory = vid.series === '鹽埕區' || vid.series === '鹽埕篇';
    } else {
      matchesCategory = vid.series === selectedVideoCategory;
    }
    const matchesSearch = !videoSearchQuery.trim() || 
      vid.title.toLowerCase().includes(videoSearchQuery.toLowerCase()) || 
      (vid.description || '').toLowerCase().includes(videoSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-amber-50/15 flex flex-col justify-between" id="app-root-container">
      {/* Platform Header */}
      <header className="bg-white border-b border-stone-150/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-800 text-amber-50 rounded-2xl flex items-center justify-center shadow-md shadow-amber-800/10">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div className="text-left">
              <h1 className="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-none">星野洋洋的導覽筆記</h1>
              <span className="text-xs text-amber-800 tracking-wider font-medium uppercase mt-1 inline-block">高雄深度歷史走讀 • 城市角落探尋</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap gap-1 bg-stone-100 p-1.5 rounded-xl border border-stone-200/50">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'home' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-home"
            >
              <Compass className="w-4 h-4 text-amber-700" />
              <span>首頁</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'notes' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-notes"
            >
              <BookOpen className="w-4 h-4 text-amber-700" />
              <span>文章</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'videos' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-videos"
            >
              <Youtube className="w-4 h-4 text-amber-700" />
              <span>影片</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'calendar' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-calendar"
            >
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>預約走讀</span>
            </button>
            <button
              onClick={() => setActiveTab('guestbook')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'guestbook' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-guestbook"
            >
              <MessageSquare className="w-4 h-4 text-amber-700" />
              <span>留言板</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'about' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-about"
            >
              <UserIcon className="w-4 h-4 text-amber-700" />
              <span>關於我</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'admin' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-stone-600 hover:bg-stone-50'
              }`}
              id="tab-btn-admin"
            >
              <Shield className="w-4 h-4 text-amber-700" />
              <span>管理後台</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        
        {/* TAB: Home (首頁) */}
        {activeTab === 'home' && (
          <div className="space-y-12 animate-fade-in text-left" id="tab-home-view">
            {/* Elegant Editorial Hero */}
            <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-950 text-amber-50 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl border border-amber-900/20">
              <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=1200")' }}></div>
              <div className="relative z-10 max-w-3xl space-y-4">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-xs bg-amber-500/10 px-3 py-1 rounded-full border border-amber-400/20 inline-block">PORTAL HOMEPAGE</span>
                <h2 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
                  跟著星野洋洋，<br className="sm:hidden" />走讀最深度的打狗時光
                </h2>
                <p className="text-amber-100/80 text-sm md:text-base leading-relaxed font-serif max-w-2xl">
                  「我們不只記錄歷史，更在歷史發生的街廓裡漫步。」這裡是高雄深度史料、常民故事與影音導覽的時空沙龍。在這裡，您可以探索每一條老街的溫度。
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('notes')}
                    className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>開始閱讀文章</span>
                  </button>
                  <a
                    href="https://www.youtube.com/@%E6%98%9F%E9%87%8E%E6%B4%8B%E6%B4%8B%E7%9A%84%E5%B0%8E%E8%A6%BD%E7%AD%86%E8%A8%98"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Youtube className="w-4 h-4 text-red-500" />
                    <span>查看近期影片</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Interactive Kaohsiung History Map */}
            <HistoryMap
              dbArticles={dbArticles}
              onSelectArticle={setSelectedArticle}
              onSearchArticles={setArticleSearchQuery}
              setActiveTab={setActiveTab}
            />

            {/* Latest Articles and Videos Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: Latest Articles (2/3 width on desktop) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-xl flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-800" />
                    <span>最新發布文章</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>閱讀更多</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {dbArticles.length === 0 ? (
                  <p className="text-stone-400 py-12 text-center text-sm bg-white rounded-2xl border border-stone-100 shadow-3xs">尚無發布文章，您可以至管理後台新增！</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dbArticles.slice(0, 2).map((note) => (
                      <article 
                        key={note.id} 
                        onClick={() => setSelectedArticle(note)}
                        className="bg-white rounded-2xl shadow-xs hover:shadow-md border border-stone-150 overflow-hidden flex flex-col justify-between text-left cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        <div>
                          <div className="h-44 w-full bg-stone-100 overflow-hidden relative border-b border-stone-100">
                            <img src={note.imageUrl} alt={note.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <span className="absolute top-3 left-3 bg-amber-800 text-amber-50 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm shadow-sm">
                              {note.category}
                            </span>
                          </div>
                          <div className="p-5 space-y-2">
                            <h4 className="font-serif font-bold text-stone-900 text-base leading-snug hover:text-amber-800 transition-colors line-clamp-2">
                              {note.title}
                            </h4>
                            <p className="text-stone-500 text-xs line-clamp-3 leading-relaxed font-serif">
                              {note.excerpt}
                            </p>
                          </div>
                        </div>
                        <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-stone-50 text-[11px] text-stone-400">
                          <span>{note.date}</span>
                          <span className="text-amber-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                            詳細閱讀 →
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Latest Videos & Fast Path */}
              <div className="lg:col-span-4 space-y-8">
                {/* Latest Video */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <h3 className="font-serif font-bold text-stone-900 text-xl flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-red-700" />
                      <span>精選影音導覽</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('videos')}
                      className="text-xs font-bold text-red-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>看更多影片</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {dbVideos.length === 0 ? (
                    <p className="text-stone-400 py-12 text-center text-sm bg-white rounded-2xl border border-stone-100 shadow-3xs">尚無發布影片。</p>
                  ) : (
                    <div className="space-y-4">
                      {dbVideos.slice(0, 2).map((vid) => (
                        <div 
                          key={vid.id}
                          onClick={() => {
                            setActiveTab('videos');
                            setSelectedVideo(vid);
                          }}
                          className="bg-white rounded-2xl border border-stone-150 overflow-hidden shadow-2xs hover:shadow-xs cursor-pointer transition-all hover:border-red-800/20 group"
                        >
                          <div className="aspect-video w-full bg-stone-100 relative overflow-hidden">
                            <img 
                              src={vid.imageUrl} 
                              alt={vid.title} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src.includes('maxresdefault.jpg')) {
                                  target.src = target.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/15 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                              <Youtube className="w-10 h-10 text-red-600 drop-shadow-md group-hover:scale-110 transition-transform" />
                            </div>
                          </div>
                          <div className="p-4 text-left">
                            <span className="text-[10px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-sm font-serif">
                              {vid.series}
                            </span>
                            <h4 className="font-serif font-bold text-stone-900 text-sm leading-snug mt-1.5 group-hover:text-red-800 transition-colors line-clamp-1">
                              {vid.title}
                            </h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Local Spotlights */}
                <div className="bg-amber-800/5 rounded-2xl border border-amber-800/10 p-6 space-y-4">
                  <h4 className="font-serif font-bold text-amber-950 text-base">
                    📅 預約專屬歷史走讀
                  </h4>
                  <p className="text-stone-600 text-xs leading-relaxed font-serif">
                    星野洋洋特別設計了高雄鹽埕、哈瑪星、左營等各大歷史街廓導覽。您可以隨時點選<strong>「預約走讀」</strong>預約下一場有溫度的城市散步。
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="w-full px-3 py-2.5 bg-amber-850 hover:bg-amber-900 text-white text-center text-xs font-bold rounded-xl transition-all cursor-pointer block"
                    >
                      線上預約走讀
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0: About Me (關於我) */}
        {activeTab === 'about' && (
          <div className="space-y-8 animate-fade-in text-left" id="tab-about-view">
            {/* Biography Banner */}
            <div className="bg-linear-to-r from-amber-900 to-amber-950 text-amber-50 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=1200")' }}></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {/* Profile Picture */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-amber-100/30 overflow-hidden shrink-0 shadow-lg bg-stone-100">
                  <img
                    src="/hoshino_avatar.png"
                    onError={(e) => {
                      // Fallback to a professional gentleman avatar if the local file is not found
                      e.currentTarget.src = "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=400&q=80";
                    }}
                    alt="星野洋洋"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="text-center md:text-left flex-1 space-y-3">
                  <span className="text-amber-300 font-bold uppercase tracking-wider text-xs bg-amber-500/10 px-3 py-1 rounded-full border border-amber-300/20 inline-block">ABOUT THE AUTHOR</span>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">星野洋洋 (Hoshino Yangyang)</h2>
                  <p className="text-amber-200 text-sm md:text-base max-w-xl leading-relaxed">
                    深度文化導覽者，用溫度紀錄都港時光，用腳步喚醒城市記憶。
                  </p>
                </div>
              </div>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Bio and Mission */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 space-y-5 shadow-sm">
                  <h3 className="font-serif font-bold text-stone-900 text-xl border-b border-stone-100 pb-3">
                    用腳步喚醒打狗的百年記憶
                  </h3>
                  <div className="text-stone-700 text-sm md:text-base leading-relaxed font-serif space-y-4">
                    <p>我是一位熱愛高雄歷史與文化的導覽工作者，也是一位持續記錄城市故事的創作者。</p>
                    
                    <p>多年來，我走訪高雄各地的古蹟、歷史建築、老街、港口與聚落，透過實地踏查、查閱史料與導覽經驗，將城市的發展脈絡整理成容易理解的文章與影片，希望讓更多人看見高雄深厚的歷史底蘊。</p>
                    
                    <p>創立 《星野洋洋的導覽筆記》，源自一個簡單的想法：每一座古蹟、每一條街道、每一位歷史人物，都值得被更多人認識。</p>
                    
                    <p>這個網站不只是分享旅遊景點，更希望成為一座介紹高雄歷史文化的知識平台。內容涵蓋歷史沿革、文化資產、重要人物、地方故事、導覽路線，以及《高雄風華錄》系列影片，希望讓不同年齡層的讀者，都能用輕鬆的方式認識這座城市。</p>
                    
                    <div className="bg-amber-50/40 border border-amber-900/10 rounded-xl p-4 md:p-5 my-2 text-left">
                      <p className="font-bold text-amber-950 mb-2">目前網站主要內容包括：</p>
                      <ul className="list-none space-y-2 text-stone-700 text-sm">
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-800">❖</span>
                          <span><strong>《高雄風華錄》</strong>：以影片與文章記錄高雄的人文、歷史與城市發展。</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-800">❖</span>
                          <span><strong>古蹟巡禮</strong>：介紹高雄各地的古蹟、歷史建築與文化資產。</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-800">❖</span>
                          <span><strong>人物誌</strong>：記錄影響高雄發展的重要人物及其故事。</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-800">❖</span>
                          <span><strong>導覽資訊</strong>：分享導覽知識、路線規劃與活動資訊。</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-800">❖</span>
                          <span><strong>AI 導覽員</strong>：透過網站知識庫，協助大家快速查詢高雄歷史與文化資訊。</span>
                        </li>
                      </ul>
                    </div>
                    
                    <p>我始終相信，歷史不只是課本上的文字，而是真實發生在我們生活周遭的故事。當我們了解一座城市的過去，也更能珍惜它的現在，並一起迎向未來。</p>
                    
                    <p>如果您喜歡網站的內容，歡迎持續關注《星野洋洋的導覽筆記》，也歡迎透過留言或預約導覽與我交流。</p>
                    
                    <p>期待有一天，能與您一起漫步高雄的街頭，在每一段歷史足跡中，重新發現這座港灣城市的風華。</p>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                <div className="bg-amber-800/5 rounded-2xl border border-amber-800/10 p-6 space-y-4">
                  <h3 className="font-serif font-bold text-amber-950 text-base">
                    聯絡資訊與交流
                  </h3>
                  <div className="text-stone-700 text-xs space-y-4 leading-relaxed text-left">
                    <p className="font-bold text-stone-850">
                      感謝您造訪 《星野洋洋的導覽筆記》！
                    </p>
                    <p>
                      如果您對網站內容、高雄歷史文化、導覽活動，或《高雄風華錄》系列有任何問題、建議或合作想法，都歡迎與我聯繫。我很樂意與大家交流，一起分享高雄的人文故事與歷史文化。
                    </p>
                    
                    <div className="space-y-1.5">
                      <p className="font-bold text-stone-800">您可以透過以下方式與我聯繫</p>
                      <div className="flex flex-wrap gap-2 pt-1 pb-1">
                        <button
                          onClick={() => setActiveTab('guestbook')}
                          className="px-3 py-2 bg-white hover:bg-amber-50 text-amber-900 border border-stone-200 hover:border-amber-700/50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                        >
                          <span>💬 留言板</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('calendar')}
                          className="px-3 py-2 bg-amber-850 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                        >
                          <span>📅 預約導覽</span>
                        </button>
                      </div>
                    </div>

                    <p className="pt-2 border-t border-stone-150/60">
                      📧 <strong>電子郵件：</strong><br />
                      <a href="mailto:hocino9999@gmail.com" className="font-mono text-amber-900 text-sm font-bold hover:underline">
                        hocino9999@gmail.com
                      </a>
                    </p>

                    <div className="space-y-2 pt-2 border-t border-stone-150/60">
                      <p className="font-bold text-stone-800">📱 社群平台</p>
                      <ul className="space-y-2 text-stone-700 text-xs">
                        <li className="flex items-start gap-1">
                          <span className="text-stone-400">▪</span>
                          <div>
                            <span className="text-stone-500">YouTube：</span>
                            <a
                              href="https://www.youtube.com/@%E6%98%9F%E9%87%8E%E6%B4%8B%E6%B4%8B%E7%9A%84%E5%B0%8E%E8%A6%BD%E7%AD%86%E8%A8%98"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-800 hover:underline hover:text-amber-950 font-bold"
                            >
                              星野洋洋的導覽筆記
                            </a>
                          </div>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-stone-400">▪</span>
                          <div>
                            <span className="text-stone-500">Facebook：</span>
                            <a
                              href="https://www.facebook.com/xing.ye.yang.yang"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-800 hover:underline hover:text-amber-950 font-bold"
                            >
                              星野洋洋
                            </a>
                          </div>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-stone-400">▪</span>
                          <div>
                            <span className="text-stone-500">Facebook粉絲頁：</span>
                            <a
                              href="https://www.facebook.com/HOCINO9999"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-800 hover:underline hover:text-amber-950 font-bold"
                            >
                              星野的高雄景點行程導覽解說天地
                            </a>
                          </div>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-stone-400">▪</span>
                          <div>
                            <span className="text-stone-500">LINE 帳號：</span>
                            <a
                              href="https://line.me/ti/p/~b12373"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-800 hover:underline hover:text-amber-950 font-mono font-bold"
                            >
                              b12373
                            </a>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <p className="pt-2 border-t border-stone-150/60 text-stone-500 text-[11px] leading-relaxed">
                      如果您有任何高雄在地史料、舊相片欲分享，或希望安排團體客製化的深度走讀、文史講座、校園推廣等，歡迎來信或在「留言板」留下您的訊息！
                    </p>
                    <p className="text-stone-500 text-[11px] leading-relaxed">
                      也可以點擊右下角「與星野洋洋對話」，我的 AI 助理隨時為您進行即時的高雄歷史解答與景點諮詢。
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base text-left">
                    導覽小叮嚀
                  </h3>
                  <ul className="text-stone-600 text-xs space-y-2.5 list-disc list-inside text-left">
                    <li>走讀時請穿著舒適的步行鞋。</li>
                    <li>請準備充足的防曬、飲水，夏季防蚊。</li>
                    <li>部分室內文史場館嚴禁高聲喧嘩。</li>
                    <li>共同維護地方歷史建物的清潔與保存。</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Tour Notes & Articles */}
        {activeTab === 'notes' && (
          <div className="space-y-8 animate-fade-in" id="tab-notes-view">
            {/* Banner */}
            <div className="bg-linear-to-r from-amber-950 to-stone-900 text-amber-100/90 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl text-left">
              <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=1200")' }}></div>
              <div className="relative z-10 max-w-2xl">
                <span className="text-amber-500 font-bold uppercase tracking-wider text-xs bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">TAIWAN HISTORICAL WALK</span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mt-4 mb-3">走讀高雄：翻開打狗城的歲月扉頁</h2>
                <p className="text-stone-300 text-sm md:text-base leading-relaxed">
                  高雄，這座承載百年繁華的港都，不僅有現代化的港口，在鹽埕老巷、哈瑪星鐵道、旗後沙灘以及左營咾咕石舊城裡，更藏著無數常民的生活切片。跟著星野洋洋的筆記，來一場洗滌靈魂的時空漫遊。
                </p>
              </div>
            </div>

            {/* Subcategory Filtering Tabs & Search Input */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div className="flex flex-wrap gap-2 justify-start">
                {articleCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedArticleCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedArticleCategory === cat
                        ? 'bg-amber-800 text-amber-50 border-amber-800 shadow-sm'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {cat === '全部' ? '全部文章' : cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72 shrink-0">
                <input
                  type="text"
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  placeholder="搜尋文章標題或內文..."
                  className="w-full bg-white border border-stone-200 focus:border-amber-800 rounded-xl pl-9 pr-8 py-2 text-xs outline-none transition-all shadow-xs"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                {articleSearchQuery && (
                  <button 
                    onClick={() => setArticleSearchQuery('')}
                    className="text-stone-400 hover:text-stone-600 absolute right-3 top-2.5 text-xs font-bold cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Articles Grid */}
            {dbArticles.length === 0 ? (
              <p className="text-center py-16 text-stone-400 text-sm font-medium">目前暫無文章。</p>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl shadow-xs">
                <p className="text-stone-500 text-sm font-medium">無符合篩選或搜尋條件的走讀文章。</p>
                <button 
                  onClick={() => {
                    setArticleSearchQuery('');
                    setSelectedArticleCategory('全部');
                  }}
                  className="mt-3 text-xs bg-amber-800 text-amber-50 font-bold px-4 py-2 rounded-xl hover:bg-amber-900 transition-colors cursor-pointer"
                >
                  重設篩選條件
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredArticles.map((note) => (
                  <article key={note.id} className="bg-white rounded-2xl shadow-xl shadow-stone-100 border border-stone-100 overflow-hidden flex flex-col justify-between text-left animate-fade-in" id={`note-article-${note.id}`}>
                    <div>
                      {/* Cover image */}
                      <div className="h-56 w-full relative">
                        <img src={note.imageUrl} alt={note.title} className="w-full h-full object-cover" />
                        <span className="absolute top-4 left-4 bg-amber-800 text-amber-50 text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                          {note.category}
                        </span>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
                          <span>{note.date}</span>
                          {note.location && (
                            <>
                              <span>•</span>
                              <span>{note.location}</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-stone-900 text-lg md:text-xl leading-snug mb-3 hover:text-amber-800 transition-colors">
                          {note.title}
                        </h3>
                        <p className="text-stone-600 text-sm leading-relaxed font-serif line-clamp-3">
                          {note.summary || (note.content ? note.content.substring(0, 150) + '...' : '')}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 pt-0 border-t border-stone-100 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-400">
                          作者：<strong className="text-stone-600">{note.author || '星野洋洋'}</strong>
                        </span>
                        <button
                          onClick={() => {
                            setSelectedArticle(note);
                            // Increment views dynamically
                            updateDoc(doc(db, 'articles', note.id), {
                              views: (note.views || 0) + 1
                            }).catch(() => {});
                          }}
                          className="text-xs text-amber-800 font-bold hover:underline cursor-pointer"
                        >
                          閱讀全文 &rarr;
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-stone-50 pt-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleLikeArticle(note.id, note.likes)}
                            className="flex items-center gap-1.5 text-stone-500 hover:text-amber-800 transition-colors text-xs font-medium cursor-pointer"
                            id={`btn-like-${note.id}`}
                          >
                            <ThumbsUp className="w-4 h-4 text-amber-700" />
                            <span>{note.likes} 讚</span>
                          </button>
                          <button
                            onClick={() => handleHeartArticle(note.id, note.hearts || 0)}
                            className="flex items-center gap-1.5 text-stone-500 hover:text-rose-600 transition-colors text-xs font-medium cursor-pointer"
                            id={`btn-heart-${note.id}`}
                          >
                            <Heart className="w-4 h-4 text-rose-500 fill-current" />
                            <span>{note.hearts || 0} 愛心</span>
                          </button>
                        </div>

                        <button
                          onClick={() => showPostStatus(`已為您複製「${note.title}」的走讀筆記連結，快分享給好友吧！`, 'success')}
                          className="text-stone-400 hover:text-amber-800 transition-colors cursor-pointer"
                          id={`btn-share-${note.id}`}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 1.5: Curated Video Tours */}
        {activeTab === 'videos' && (
          <div className="space-y-8 animate-fade-in" id="tab-videos-view">
            {/* Banner */}
            <div className="bg-linear-to-r from-red-950 to-stone-900 text-red-100/90 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl text-left">
              <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200")' }}></div>
              <div className="relative z-10 max-w-2xl">
                <span className="text-red-500 font-bold uppercase tracking-wider text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">VIDEO HISTORICAL WALK</span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mt-4 mb-3">《高雄風華錄》影音導覽</h2>
                <div className="text-stone-300 text-sm md:text-base leading-relaxed space-y-4 font-serif">
                  <p>歡迎來到 《高雄風華錄》影音導覽專區。</p>
                  <p>這裡收錄了一系列以高雄歷史、古蹟、港口發展與人物故事為主題的影音導覽內容，透過實地拍攝與故事敘述，帶您一步一步走進高雄的城市記憶。</p>
                </div>
              </div>
            </div>

            {/* Subcategory Filtering Tabs & Search Input */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div className="flex flex-wrap gap-2 justify-start">
                {videoCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedVideoCategory(cat);
                      const categoryVideos = cat === '全部'
                        ? dbVideos
                        : dbVideos.filter(v => {
                            if (cat === '鹽埕區' || cat === '鹽埕篇') {
                              return v.series === '鹽埕區' || v.series === '鹽埕篇';
                            }
                            return v.series === cat;
                          });
                      if (categoryVideos.length > 0) {
                        setSelectedVideo(categoryVideos[0]);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedVideoCategory === cat
                        ? 'bg-red-800 text-white border-red-800 shadow-sm'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {cat === '全部' ? '全部影片' : cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72 shrink-0">
                <input
                  type="text"
                  value={videoSearchQuery}
                  onChange={(e) => setVideoSearchQuery(e.target.value)}
                  placeholder="搜尋影片標題或介紹..."
                  className="w-full bg-white border border-stone-200 focus:border-red-800 rounded-xl pl-9 pr-8 py-2 text-xs outline-none transition-all shadow-xs"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                {videoSearchQuery && (
                  <button 
                    onClick={() => setVideoSearchQuery('')}
                    className="text-stone-400 hover:text-stone-600 absolute right-3 top-2.5 text-xs font-bold cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {dbVideos.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-stone-150 shadow-xs">
                <Youtube className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-pulse" />
                <p className="text-stone-500 text-base font-medium">影片即時加載中，或目前後台尚未上傳影片...</p>
                {isAdminAuthorized && <p className="text-xs text-amber-700 mt-2">請至管理後台新增您的第一個 YouTube 導覽影片！</p>}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-stone-150 shadow-xs">
                <p className="text-stone-500 text-sm font-medium">無符合篩選或搜尋條件的導覽影片。</p>
                <button 
                  onClick={() => {
                    setVideoSearchQuery('');
                    setSelectedVideoCategory('全部');
                  }}
                  className="mt-3 text-xs bg-red-800 text-white font-bold px-4 py-2 rounded-xl hover:bg-red-900 transition-colors cursor-pointer"
                >
                  重設篩選條件
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Active Player & Details */}
                <div className="lg:col-span-8 space-y-6" id="video-player-section">
                  {/* Video Player */}
                  {(() => {
                    const activeVideo = (selectedVideo && filteredVideos.some(v => v.id === selectedVideo.id))
                      ? selectedVideo
                      : (filteredVideos[0] || dbVideos[0]);

                    if (!activeVideo) {
                      return <p className="text-stone-400 py-12 text-center text-sm">此分類暫無影片。</p>;
                    }

                    return (
                      <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xl text-left">
                          {/* Aspect Ratio Box */}
                          <div className="aspect-video bg-black w-full relative">
                            {activeVideo.videoId ? (
                              <iframe
                                key={activeVideo.id}
                                className="w-full h-full absolute inset-0"
                                src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=0&rel=0`}
                                title={activeVideo.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              ></iframe>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400">
                                無效的影片 ID
                              </div>
                            )}
                          </div>

                          {/* Video Info */}
                          <div className="p-6">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="bg-red-800 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                                {activeVideo.series}
                              </span>
                              <span className="text-xs text-stone-400">{activeVideo.date}</span>
                            </div>
                            
                            <h3 className="font-serif font-bold text-xl md:text-2xl text-stone-900 leading-snug mb-3">
                              {activeVideo.title}
                            </h3>

                            {/* Stats & Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-stone-100 mb-4">
                              <div className="flex items-center gap-4 text-xs text-stone-500">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-stone-400" />
                                  <span>觀看：<strong>{activeVideo.views || 0}</strong> 次</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4 text-amber-700" />
                                  <span>按讚：<strong>{activeVideo.likes || 0}</strong> 次</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="w-4 h-4 text-rose-500" />
                                  <span>愛心：<strong>{activeVideo.hearts || 0}</strong> 個</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleLikeVideo(activeVideo.id, activeVideo.likes || 0)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-100 cursor-pointer transition-all flex items-center gap-1.5"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>按讚</span>
                                </button>
                                <button
                                  onClick={() => handleHeartVideo(activeVideo.id, activeVideo.hearts || 0)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-950 text-xs font-bold border border-rose-100 cursor-pointer transition-all flex items-center gap-1.5"
                                >
                                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                                  <span>給愛心</span>
                                </button>
                                <a
                                  href={`https://www.youtube.com/watch?v=${activeVideo.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Youtube className="w-3.5 h-3.5" />
                                  <span>在 YouTube 播放</span>
                                </a>
                              </div>
                            </div>

                            <div className="text-stone-700 text-sm leading-relaxed font-serif whitespace-pre-wrap max-h-[350px] overflow-y-auto pr-2">
                              {activeVideo.description}
                            </div>
                          </div>
                        </div>

                        {/* Comments Section under Video */}
                        <div className="border border-stone-200 bg-white rounded-2xl p-6 md:p-8 space-y-6 text-left shadow-xs">
                          <h4 className="font-serif font-bold text-stone-900 text-lg flex items-center gap-1.5">
                            <MessageSquare className="w-5 h-5 text-red-800" />
                            <span>影片留言迴響 ({displayComments.filter(c => c.itemId === activeVideo.id && c.itemType === 'video').length})</span>
                          </h4>

                          {/* Submit Comment Form */}
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50 space-y-3">
                            <h5 className="text-xs font-bold text-stone-700">撰寫您的影音留言：</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <input
                                type="text"
                                placeholder="您的暱稱 *"
                                value={videoCommentAuthor}
                                onChange={(e) => setVideoCommentAuthor(e.target.value)}
                                className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-700"
                              />
                              <input
                                type="text"
                                placeholder="留言內容... *"
                                value={videoCommentContent}
                                onChange={(e) => setVideoCommentContent(e.target.value)}
                                className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-700 sm:col-span-2"
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleAddComment(activeVideo.id, 'video', videoCommentAuthor, videoCommentContent)}
                                className="px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                送出留言
                              </button>
                            </div>
                          </div>

                          {/* Comments List */}
                          <div className="space-y-3">
                            {displayComments.filter(c => c.itemId === activeVideo.id && c.itemType === 'video').length === 0 ? (
                              <p className="text-xs text-stone-400 text-center py-4">目前尚無影音留言，快來留下您的觀影感想吧！</p>
                            ) : (
                              displayComments
                                .filter(c => c.itemId === activeVideo.id && c.itemType === 'video')
                                .map((comment) => (
                                  <div key={comment.id} className="bg-stone-50/50 border border-stone-100 rounded-xl p-3.5 flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-bold text-xs text-stone-800">{comment.author}</span>
                                        <span className="text-[10px] text-stone-400">{comment.createdAt}</span>
                                      </div>

                                      {editingCommentId === comment.id ? (
                                        <div className="space-y-2 mt-1">
                                          <textarea
                                            value={editingCommentText}
                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                            className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs outline-none focus:border-red-700 resize-none h-16"
                                          />
                                          <div className="flex gap-2 justify-end">
                                            <button
                                              onClick={() => setEditingCommentId(null)}
                                              className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] font-bold"
                                            >
                                              取消
                                            </button>
                                            <button
                                              onClick={() => handleUpdateComment(comment.id, editingCommentText)}
                                              className="px-2 py-1 bg-red-800 hover:bg-red-900 text-white rounded text-[10px] font-bold"
                                            >
                                              儲存
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-stone-700 font-serif leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleStartEditComment(comment.id, comment.content)}
                                        className="text-[10px] text-red-800 hover:underline cursor-pointer flex items-center gap-0.5"
                                        title="編輯留言"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>編輯</span>
                                      </button>
                                      <button
                                        onClick={() => triggerDeleteConfirm(comment.id, 'comment_video')}
                                        className="text-[10px] text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5"
                                        title="刪除留言"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>刪除</span>
                                      </button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Side: Playlist Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                  <h4 className="font-serif font-bold text-stone-900 text-lg border-b border-stone-100 pb-2 text-left">
                    影片播放清單 ({filteredVideos.length} 支影片)
                  </h4>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {filteredVideos.length === 0 ? (
                      <p className="text-stone-400 py-8 text-center text-xs">此分類暫無影片。</p>
                    ) : (
                      filteredVideos.map((video) => {
                        const activeVideo = selectedVideo || filteredVideos[0] || dbVideos[0];
                        const isActive = activeVideo && activeVideo.id === video.id;
                        return (
                          <div
                            key={video.id}
                            onClick={() => {
                              setSelectedVideo(video);
                              handleViewVideo(video.id, video.views || 0);
                              document.getElementById('video-player-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                              isActive
                                ? 'bg-amber-50/60 border-amber-700/60 shadow-xs ring-1 ring-amber-700/20'
                                : 'bg-white border-stone-200 hover:bg-stone-50/80 hover:border-stone-300'
                            }`}
                          >
                            {/* Thumbnail */}
                            <div className="w-24 shrink-0 aspect-video rounded-lg overflow-hidden bg-stone-100 relative border border-stone-100">
                              <img 
                                src={video.imageUrl} 
                                alt={video.title} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (target.src.includes('maxresdefault.jpg')) {
                                    target.src = target.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/10 flex items-center justify-center hover:bg-black/0 transition-colors">
                                <Youtube className={`w-6 h-6 ${isActive ? 'text-red-600 animate-pulse' : 'text-stone-100'}`} />
                              </div>
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                              <h5 className={`text-xs font-bold leading-tight line-clamp-2 ${isActive ? 'text-amber-950' : 'text-stone-800'}`}>
                                {video.title}
                              </h5>
                              <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                                <span className="font-medium bg-stone-100 px-1.5 py-0.5 rounded-md text-[9px] text-stone-500">{video.series}</span>
                                <span>{video.date}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Curated Walk Schedules */}
        {activeTab === 'calendar' && <CalendarSection />}

        {/* TAB 4: Public Guestbook Board */}
        {activeTab === 'guestbook' && (
          <div className="space-y-8 text-left" id="tab-guestbook-view">
            {/* Status alerts */}
            {postStatus.text && (
              <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
                postStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
              }`} id="guestbook-alert-banner">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{postStatus.text}</span>
              </div>
            )}

            {/* Title & Slogan */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="font-serif font-bold text-stone-900 text-2xl md:text-3xl">遊客訪客留言板</h2>
              <p className="text-stone-500 text-xs md:text-sm">
                不論是走讀活動的心得回饋、對高雄文史的延伸探討，或是期待後續開辦的導覽路線，都歡迎在此暢所欲言，星野洋洋將會親自為您進行官方答覆！
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Side: Submit Message Form */}
              <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-4 border-b border-stone-150 pb-3">
                  <Plus className="w-5 h-5 text-amber-800" />
                  <h3 className="font-serif font-bold text-stone-900 text-lg">撰寫您的留言</h3>
                </div>

                <form onSubmit={handlePostMessage} className="space-y-4 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">您的暱稱 *</label>
                      <input
                        type="text"
                        placeholder="例：大港旅人"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-amber-700 outline-none transition-all"
                        required
                        id="guest-input-name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">選擇代表大頭貼 *</label>
                      <select
                        value={guestEmoji}
                        onChange={(e) => setGuestEmoji(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:border-amber-700 outline-none cursor-pointer"
                        id="guest-select-emoji"
                      >
                        <option value="🧭">🧭 旅行指南針</option>
                        <option value="🎒">🎒 探險背包</option>
                        <option value="📸">📸 復古相機</option>
                        <option value="🚲">🚲 鐵馬單車</option>
                        <option value="🍵">🍵 鹽埕老茶</option>
                        <option value="🌅">🌅 西子夕陽</option>
                        <option value="🏮">🏮 廟口紅燈</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">留言主題標題 *</label>
                    <input
                      type="text"
                      placeholder="例：參加哈瑪星走讀活動有感"
                      value={guestTitle}
                      onChange={(e) => setGuestTitle(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-amber-700 outline-none transition-all"
                      required
                      id="guest-input-title"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">心得評分 (1-5 星) *</label>
                      <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setGuestRating(star)}
                            className="text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                            id={`star-btn-${star}`}
                          >
                            <Star className={`w-5 h-5 ${star <= guestRating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">留言類別 *</label>
                      <select
                        value={guestCategory}
                        onChange={(e) => setGuestCategory(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:border-amber-700 outline-none cursor-pointer"
                        id="guest-select-category"
                      >
                        <option value="走讀回饋">走讀回饋</option>
                        <option value="文史討論">文史討論</option>
                        <option value="路線許願">路線許願</option>
                        <option value="一般交流">一般交流</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">心得內容詳述 *</label>
                    <textarea
                      rows={5}
                      placeholder="請在此留下您對走讀導覽的寶貴建議、文史問題或是心得感受..."
                      value={guestContent}
                      onChange={(e) => setGuestContent(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs focus:bg-white focus:border-amber-700 outline-none transition-all font-serif leading-relaxed resize-none"
                      required
                      id="guest-textarea-content"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isPosting}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      isPosting
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                        : 'bg-amber-800 text-amber-50 hover:bg-amber-900 shadow-amber-950/10'
                    }`}
                    id="guest-btn-submit"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isPosting ? '即時發送至 Firestore 中...' : '發表留言'}</span>
                  </button>
                </form>
              </div>

              {/* Right Side: Message Board Feed */}
              <div className="lg:col-span-7 space-y-4 max-h-[750px] overflow-y-auto pr-2">
                {messages.length === 0 ? (
                  <div className="bg-white rounded-2xl p-16 text-center border border-stone-150 shadow-2xs">
                    <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-pulse" />
                    <p className="text-stone-500 text-base font-medium">目前尚無遊客留言...</p>
                    <p className="text-xs text-stone-400 mt-1">歡迎填寫左側欄位，留下您的足跡與心得！</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 shadow-2xs space-y-3 relative hover:border-amber-800/20 transition-all animate-fade-in"
                      id={`msg-card-${msg.id}`}
                    >
                      {/* Message header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl bg-amber-50 p-2 rounded-xl border border-amber-100">{msg.avatarEmoji}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-800 text-sm">{msg.name}</span>
                              <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] font-medium border border-stone-200">
                                {msg.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 mt-0.5 block">時間：{msg.createdAt}</span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: msg.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>

                      {/* Content block */}
                      <div className="text-left">
                        <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base mb-1.5">{msg.title}</h4>
                        <p className="text-stone-700 text-xs md:text-sm leading-relaxed font-serif whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Admin replies or actions */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                        {/* 星野洋洋 Official Response */}
                        {msg.reply ? (
                          <div className="bg-amber-800/5 border border-amber-800/10 p-3.5 rounded-xl text-left">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-serif font-bold text-xs text-amber-900 flex items-center gap-1">
                                <Compass className="w-3.5 h-3.5 text-amber-800" />
                                星野洋洋 官方回覆
                              </span>
                              {msg.replyAt && <span className="text-[9px] text-stone-400">回覆時間：{msg.replyAt}</span>}
                            </div>
                            <p className="text-stone-700 text-xs leading-relaxed font-serif whitespace-pre-wrap">{msg.reply}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-400 text-left italic">星野洋洋尚未回覆此筆留言，期待他的分享中...</p>
                        )}

                        {/* Admin Action Bar (Only visible if isAdminAuthorized) */}
                        {isAdminAuthorized && (
                          <div className="mt-2 space-y-3 pt-2 border-t border-dashed border-stone-150">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                管理員專屬操作面板
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setReplyInputs(prev => ({ ...prev, [msg.id]: msg.reply || '' }));
                                    setActiveReplyId(activeReplyId === msg.id ? null : msg.id);
                                  }}
                                  className="text-amber-800 hover:text-amber-950 p-1.5 rounded-lg hover:bg-amber-50 border border-amber-100 hover:border-amber-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{msg.reply ? '編輯回覆' : '回覆留言'}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 border border-stone-100 hover:border-rose-150 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                                  title="管理員刪除這筆訪客留言"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>刪除留言</span>
                                </button>
                              </div>
                            </div>

                            {/* Inline Reply Textarea */}
                            {activeReplyId === msg.id && (
                              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2 text-left">
                                <label className="block text-xs font-bold text-stone-700">官方專屬回覆：</label>
                                <textarea
                                  rows={3}
                                  className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800 bg-white font-serif leading-relaxed"
                                  placeholder="在此填寫給遊客的回覆，送出後將即時顯示於此留言下方..."
                                  value={replyInputs[msg.id] || ''}
                                  onChange={(e) => setReplyInputs(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setActiveReplyId(null)}
                                    className="px-2.5 py-1 rounded bg-stone-200 text-stone-700 hover:bg-stone-300 text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => handleSaveReply(msg.id)}
                                    className="px-3 py-1 rounded bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    送出回覆
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CMS Panel (Admin views & database synchronization) */}
        {activeTab === 'admin' && <CMSPanel />}
      </main>

      {/* Article Details Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-stone-100 relative">
            {/* Floating Close Button */}
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 bg-stone-900/80 hover:bg-stone-950 text-white rounded-full p-2 cursor-pointer transition-colors z-50 shadow-md"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Container */}
            <div className="overflow-y-auto flex-1 text-left">
              {/* Header inside scrollable space */}
              <div className="relative h-64 md:h-80 w-full shrink-0">
                <img src={selectedArticle.imageUrl} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                  <span className="bg-amber-800 text-amber-50 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-md inline-block mb-2">
                    {selectedArticle.category}
                  </span>
                  <h3 className="font-serif font-bold text-xl md:text-3xl leading-snug">
                    {selectedArticle.title}
                  </h3>
                </div>
              </div>

              {/* Modal Content text and comments */}
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 text-xs text-stone-500 border-b border-stone-100 pb-3">
                <span>時間：<strong>{selectedArticle.date}</strong></span>
                {selectedArticle.location && (
                  <>
                    <span>•</span>
                    <span>地點：<strong>{selectedArticle.location}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>作者：<strong>{selectedArticle.author || '星野洋洋'}</strong></span>
              </div>

              <div className="text-stone-800 text-sm md:text-base leading-relaxed font-serif whitespace-pre-wrap border-b border-stone-100 pb-6">
                {selectedArticle.content}
              </div>

              {/* Dynamic Comment Section inside Article Modal */}
              <div className="space-y-6">
                <h4 className="font-serif font-bold text-stone-900 text-lg flex items-center gap-1.5 border-b border-stone-50 pb-2">
                  <MessageSquare className="w-5 h-5 text-amber-700" />
                  <span>文章迴響 ({displayComments.filter(c => c.itemId === selectedArticle.id && c.itemType === 'article').length})</span>
                </h4>

                {/* Post comment input */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50 space-y-3">
                  <h5 className="text-xs font-bold text-stone-700">留下您的感想與討論：</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="暱稱 *"
                      value={articleCommentAuthor}
                      onChange={(e) => setArticleCommentAuthor(e.target.value)}
                      className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-700"
                    />
                    <input
                      type="text"
                      placeholder="留言內容... *"
                      value={articleCommentContent}
                      onChange={(e) => setArticleCommentContent(e.target.value)}
                      className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-700 sm:col-span-2"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAddComment(selectedArticle.id, 'article', articleCommentAuthor, articleCommentContent)}
                      className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      送出留言
                    </button>
                  </div>
                </div>

                {/* Comment feeds */}
                <div className="space-y-3">
                  {displayComments.filter(c => c.itemId === selectedArticle.id && c.itemType === 'article').length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4">目前尚無留言，歡迎留下您的足跡與迴響！</p>
                  ) : (
                    displayComments
                      .filter(c => c.itemId === selectedArticle.id && c.itemType === 'article')
                      .map((comment) => (
                        <div key={comment.id} className="bg-stone-50/50 border border-stone-100 rounded-xl p-3.5 flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-bold text-xs text-stone-800">{comment.author}</span>
                              <span className="text-[10px] text-stone-400">{comment.createdAt}</span>
                            </div>

                            {editingCommentId === comment.id ? (
                              <div className="space-y-2 mt-1">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs outline-none focus:border-amber-700 resize-none h-16"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setEditingCommentId(null)}
                                    className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] font-bold"
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => handleUpdateComment(comment.id, editingCommentText)}
                                    className="px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-[10px] font-bold"
                                  >
                                    儲存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-stone-700 font-serif leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleStartEditComment(comment.id, comment.content)}
                              className="text-[10px] text-amber-800 hover:underline cursor-pointer flex items-center gap-0.5"
                              title="編輯留言"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>編輯</span>
                            </button>
                            <button
                              onClick={() => triggerDeleteConfirm(comment.id, 'comment_article')}
                              className="text-[10px] text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5"
                              title="刪除留言"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>刪除</span>
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLikeArticle(selectedArticle.id, selectedArticle.likes)}
                  className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <ThumbsUp className="w-4 h-4 text-amber-700" />
                  <span>{selectedArticle.likes} 讚</span>
                </button>
                <button
                  onClick={() => handleHeartArticle(selectedArticle.id, selectedArticle.hearts || 0)}
                  className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Heart className="w-4 h-4 text-rose-500 fill-current" />
                  <span>{selectedArticle.hearts || 0} 個愛心</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                關閉閱讀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom delete confirmation modal to bypass sandbox window.confirm blocks */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 text-left space-y-4">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif font-bold text-lg text-stone-900">確認永久刪除</h3>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              您確定要永久刪除此筆留言/留言迴響嗎？此操作將同步自雲端 Firestore 中移除，且無法復原。
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmType(null);
                }}
                className="px-4 py-2 bg-stone-150 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-800 hover:bg-red-950 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                確認永久刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast Banner */}
      {postStatus.text && (
        <div className="fixed bottom-24 right-6 z-50 animate-bounce max-w-sm">
          <div className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-serif font-bold ${
            postStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {postStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{postStatus.text}</span>
          </div>
        </div>
      )}

      {/* Floating Chatbot Assistant */}
      <ChatBot />

      {/* Footnote */}
      <footer className="bg-white border-t border-stone-200 py-8 text-center mt-12">
        <p className="text-xs text-stone-400">
          星野洋洋的導覽筆記 © 2026 • 探索高雄文史故事 • 本系統與 Firestore 即時資料庫安全連線中
        </p>
      </footer>
    </div>
  );
}
