import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Message } from '../types';
import { Trash2, Reply, ShieldAlert, CheckCircle, AlertTriangle, Key, LogOut, MessageSquare, Compass, ShieldCheck, Youtube, FileText, Plus, Eye, Heart, ThumbsUp, Calendar, Users, MapPin, Clock, Sparkles, Pencil, Search, Download, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { convertGoogleDriveUrl, compressAndResizeImage } from '../utils';

function extractYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
}

export default function CMSPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Local admin bypass for preview/testing purposes - disabled by default for production secure deployment
  const [isLocalAdminMode, setIsLocalAdminMode] = useState<boolean>(false);
  
  // UI states
  const [cmsTab, setCmsTab] = useState<'messages' | 'articles' | 'videos' | 'bookings'>('bookings');
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'success' });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Articles, Videos & Bookings dynamic CMS state
  const [dbArticles, setDbArticles] = useState<any[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]);
  const [dbBookings, setDbBookings] = useState<any[]>([]);

  // Booking search and status filters for advanced reservation management
  const [bookingFilter, setBookingFilter] = useState<'all' | '待確認' | '已確認' | '已取消'>('all');
  const [bookingSearch, setBookingSearch] = useState('');

  // Article Form States
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState('高雄歷史');
  const [artImageUrl, setArtImageUrl] = useState('');
  const [artContent, setArtContent] = useState('');
  const [isPostingArt, setIsPostingArt] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [isUploadingArtImg, setIsUploadingArtImg] = useState(false);
  const [artImgUploadError, setArtImgUploadError] = useState<string | null>(null);

  // Video Form States
  const [vidTitle, setVidTitle] = useState('');
  const [vidIdOrUrl, setVidIdOrUrl] = useState('');
  const [vidSeries, setVidSeries] = useState('鼓山篇');
  const [vidDescription, setVidDescription] = useState('');
  const [isPostingVid, setIsPostingVid] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // Custom sandbox-safe non-blocking deletion dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'message' | 'article' | 'video' | 'booking' | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Is user the official authorized Firestore admin?
  const isOfficialAdmin = currentUser !== null && currentUser.email === 'hocino9999@gmail.com';
  const hasAdminAccess = isOfficialAdmin || isLocalAdminMode;

  // Real-time listener for guestbook messages
  useEffect(() => {
    setIsLoading(true);
    const messagesCollectionPath = 'messages';
    const q = query(collection(db, messagesCollectionPath), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMessages: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          let createdAtStr = '';
          if (data.createdAt) {
            if (data.createdAt instanceof Timestamp) {
              createdAtStr = data.createdAt.toDate().toLocaleString('zh-TW');
            } else if (data.createdAt.seconds) {
              createdAtStr = new Date(data.createdAt.seconds * 1000).toLocaleString('zh-TW');
            } else {
              createdAtStr = String(data.createdAt);
            }
          }

          loadedMessages.push({
            id: docSnap.id,
            name: data.name || '無名氏',
            title: data.title || '無標題',
            content: data.content || '',
            rating: data.rating || 5,
            avatarEmoji: data.avatarEmoji || '🧭',
            createdAt: createdAtStr,
            category: data.category || '一般留言',
            reply: data.reply || undefined,
            replyAt: data.replyAt ? (data.replyAt instanceof Timestamp ? data.replyAt.toDate().toLocaleString('zh-TW') : String(data.replyAt)) : undefined
          });
        });
        
        setMessages(loadedMessages);
        setIsLoading(false);
      },
      (error) => {
        console.error('onSnapshot messages error:', error);
        handleFirestoreError(error, OperationType.GET, messagesCollectionPath);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Monitor articles
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDbArticles(loaded);
    });
    return () => unsubscribe();
  }, []);

  // Monitor videos
  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDbVideos(loaded);
    });
    return () => unsubscribe();
  }, []);

  // Monitor bookings
  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDbBookings(loaded);
    }, (error) => {
      console.error('onSnapshot bookings error:', error);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: '待確認' | '已確認' | '已取消') => {
    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus
      });
      showStatus(`已成功將預約狀態更新為【${newStatus}】！`, 'success');
    } catch (error) {
      console.error('Failed to update booking status:', error);
      showStatus('狀態更新失敗，請確認具備管理員權限。', 'error');
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      showStatus('管理員登入成功！', 'success');
    } catch (error) {
      console.error('Google Sign In Error:', error);
      showStatus('登入失敗，請稍後再試。', 'error');
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showStatus('已安全登出。', 'success');
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' | 'warning') => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg({ text: '', type: 'success' });
    }, 4000);
  };

  const triggerDeleteConfirm = (id: string, type: 'message' | 'article' | 'video' | 'booking') => {
    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }
    setDeleteConfirmId(id);
    setDeleteConfirmType(type);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId || !deleteConfirmType) return;
    try {
      if (deleteConfirmType === 'message') {
        const docPath = 'messages/' + deleteConfirmId;
        await deleteDoc(doc(db, 'messages', deleteConfirmId));
        setMessages(prev => prev.filter(m => m.id !== deleteConfirmId));
        showStatus('留言已成功由管理員刪除！', 'success');
      } else if (deleteConfirmType === 'article') {
        await deleteDoc(doc(db, 'articles', deleteConfirmId));
        showStatus('文章已成功刪除！', 'success');
      } else if (deleteConfirmType === 'video') {
        await deleteDoc(doc(db, 'videos', deleteConfirmId));
        showStatus('影片已成功刪除！', 'success');
      } else if (deleteConfirmType === 'booking') {
        await deleteDoc(doc(db, 'bookings', deleteConfirmId));
        showStatus('走讀預約申請已成功刪除！', 'success');
      }
    } catch (error) {
      console.error('Failed to delete in CMS:', error);
      showStatus('刪除失敗，請確認具備管理員權限或網路正常。', 'error');
    } finally {
      setDeleteConfirmId(null);
      setDeleteConfirmType(null);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    triggerDeleteConfirm(messageId, 'message');
  };

  const handleSendReply = async (messageId: string) => {
    const reply = replyText[messageId]?.trim();
    if (!reply) return;

    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }

    const docPath = 'messages/' + messageId;

    try {
      await updateDoc(doc(db, 'messages', messageId), {
        reply: reply,
        replyAt: new Date().toISOString()
      });

      setReplyText(prev => ({ ...prev, [messageId]: '' }));
      showStatus('管理員回覆成功！', 'success');
    } catch (error) {
      console.error('Failed to reply on Firestore:', error);
      handleFirestoreError(error, OperationType.UPDATE, docPath);
      showStatus('回覆寫入失敗，請確認具備管理員權限。', 'error');
    }
  };

  // Handle Article Image File Selection and Base64 Compression
  const handleArtImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingArtImg(true);
    setArtImgUploadError(null);

    try {
      // Compress to max 1024px and JPEG quality 0.75 for direct local persistence in Firestore
      const compressedBase64 = await compressAndResizeImage(file, 1024, 0.75);
      setArtImageUrl(compressedBase64);
      showStatus('圖片上傳並優化成功！已轉為內嵌格式儲存。', 'success');
    } catch (err: any) {
      console.error('Failed to compress image:', err);
      setArtImgUploadError(err.message || '圖片處理失敗，請重試。');
      showStatus(err.message || '圖片處理失敗，請確認檔案類型。', 'error');
    } finally {
      setIsUploadingArtImg(false);
    }
  };

  // Add Article Event
  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }
    if (!artTitle.trim() || !artContent.trim()) {
      showStatus('文章標題與內文為必填項目！', 'error');
      return;
    }

    setIsPostingArt(true);
    const docPath = editingArticleId ? `articles/${editingArticleId}` : 'articles';
    const processedUrl = convertGoogleDriveUrl(artImageUrl.trim());
    const finalImageUrl = processedUrl || 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=800&q=80';

    try {
      if (editingArticleId) {
        await updateDoc(doc(db, 'articles', editingArticleId), {
          title: artTitle.trim(),
          category: artCategory,
          imageUrl: finalImageUrl,
          content: artContent.trim()
        });
        showStatus('文章修改成功！', 'success');
        setEditingArticleId(null);
      } else {
        await addDoc(collection(db, 'articles'), {
          title: artTitle.trim(),
          category: artCategory,
          imageUrl: finalImageUrl,
          content: artContent.trim(),
          date: new Date().toISOString().split('T')[0],
          likes: 0,
          hearts: 0,
          views: 0,
          author: '星野洋洋'
        });
        showStatus('成功發表走讀文章！遊客現在可以在「走讀筆記」看到這篇文章。', 'success');
      }

      setArtTitle('');
      setArtImageUrl('');
      setArtContent('');
    } catch (error) {
      console.error('Error saving article:', error);
      handleFirestoreError(error, editingArticleId ? OperationType.UPDATE : OperationType.WRITE, docPath);
      showStatus(editingArticleId ? '修改文章失敗，請確認具備管理員權限。' : '發表文章失敗，請確認具備管理員權限。', 'error');
    } finally {
      setIsPostingArt(false);
    }
  };

  // Add Video Event
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }
    if (!vidTitle.trim() || !vidIdOrUrl.trim() || !vidDescription.trim()) {
      showStatus('影片標題、YouTube ID/連結、與說明為必填項目！', 'error');
      return;
    }

    setIsPostingVid(true);
    const docPath = editingVideoId ? `videos/${editingVideoId}` : 'videos';
    const videoId = extractYouTubeId(vidIdOrUrl.trim());
    const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    try {
      if (editingVideoId) {
        await updateDoc(doc(db, 'videos', editingVideoId), {
          title: vidTitle.trim(),
          videoId,
          series: vidSeries,
          description: vidDescription.trim(),
          imageUrl
        });
        showStatus('影片修改成功！', 'success');
        setEditingVideoId(null);
      } else {
        await addDoc(collection(db, 'videos'), {
          title: vidTitle.trim(),
          videoId,
          series: vidSeries,
          description: vidDescription.trim(),
          date: new Date().toISOString().split('T')[0],
          imageUrl,
          views: 0,
          likes: 0,
          hearts: 0
        });
        showStatus('成功上傳導覽影片！遊客現在可以在「影音導覽」觀看這支影片。', 'success');
      }

      setVidTitle('');
      setVidIdOrUrl('');
      setVidDescription('');
    } catch (error) {
      console.error('Error saving video:', error);
      handleFirestoreError(error, editingVideoId ? OperationType.UPDATE : OperationType.WRITE, docPath);
      showStatus(editingVideoId ? '修改影片失敗，請確認具備管理員權限。' : '新增影片失敗，請確認具備管理員權限。', 'error');
    } finally {
      setIsPostingVid(false);
    }
  };

  const handleDeleteArticle = (id: string) => {
    triggerDeleteConfirm(id, 'article');
  };

  const handleStartEditArticle = (art: any) => {
    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }
    setEditingArticleId(art.id);
    setArtTitle(art.title);
    setArtCategory(art.category || '高雄歷史');
    setArtImageUrl(art.imageUrl || '');
    setArtContent(art.content || '');
    
    const element = document.getElementById('article-form-start');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditArticle = () => {
    setEditingArticleId(null);
    setArtTitle('');
    setArtCategory('高雄歷史');
    setArtImageUrl('');
    setArtContent('');
  };

  const handleDeleteVideo = (id: string) => {
    triggerDeleteConfirm(id, 'video');
  };

  const handleStartEditVideo = (vid: any) => {
    if (!hasAdminAccess) {
      showStatus('請先開啟管理員權限！', 'warning');
      return;
    }
    setEditingVideoId(vid.id);
    setVidTitle(vid.title);
    setVidIdOrUrl(vid.videoId);
    setVidSeries(vid.series || '鼓山篇');
    setVidDescription(vid.description || '');
    
    const element = document.getElementById('video-form-start');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditVideo = () => {
    setEditingVideoId(null);
    setVidTitle('');
    setVidIdOrUrl('');
    setVidSeries('鼓山篇');
    setVidDescription('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-stone-100 border border-stone-100 overflow-hidden text-left" id="cms-panel-container">
      {/* CMS Header Section */}
      <div className="p-6 md:p-8 border-b border-stone-100 bg-linear-to-r from-amber-50/50 to-stone-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-700" />
            <h2 className="text-2xl font-bold text-stone-900 font-serif" id="cms-panel-title">管理員後台控制台</h2>
          </div>
          <p className="text-stone-600 text-sm">
            在此管理全站留言、新增或刪除導覽文章、以及上傳管理 YouTube 走讀影音影片。
          </p>
        </div>

        {/* Admin Authorization Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 w-full lg:w-auto bg-stone-100/50 border border-stone-200/60 p-4 rounded-2xl" id="cms-auth-controls">
          <div className="flex items-center gap-3 min-w-0">
            {isOfficialAdmin ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs font-medium text-emerald-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>已認證專屬管理員 (hocino9999@gmail.com)</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs font-medium text-amber-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span>測試模式已關閉（非專屬管理員不可操作）</span>
              </div>
            )}
          </div>

          {/* Google Authentication Button */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="bg-amber-850 text-amber-50 px-3 py-1.5 rounded-xl border border-amber-900/10 text-xs font-semibold flex items-center gap-1.5 font-mono">
                  <span>{currentUser.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl p-2.5 transition-colors cursor-pointer"
                  title="登出"
                  id="btn-sign-out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-stone-950/10 flex items-center gap-2 cursor-pointer"
                id="btn-google-signin"
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>Google 登入官方管理</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Alerts */}
      {statusMsg.text && (
        <div className={`p-4 border-b text-sm flex items-center gap-3 transition-all ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
            : statusMsg.type === 'warning'
            ? 'bg-amber-50 border-amber-100 text-amber-800'
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`} id="cms-status-alert">
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : statusMsg.type === 'warning' ? (
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Permissions warning banner */}
      {!hasAdminAccess && (
        <div className="m-6 bg-amber-50/50 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong className="block mb-0.5">未授權或無存取權限：</strong>
            若要在本機進行模擬測試，您可以點選右上角的「模擬測試權限」按鈕開啟；
            若要在遠端 Firestore 雲端進行真實刪除與修改，請點選「Google 登入」使用您的官方管理員信箱 (<span className="font-mono">hocino9999@gmail.com</span>) 登入。
          </div>
        </div>
      )}

      {/* CMS Sub-Navigation Tab Bar */}
      <div className="border-b border-stone-100 px-6 md:px-8 bg-stone-50/50 flex space-x-4">
        <button
          onClick={() => setCmsTab('bookings')}
          className={`py-4 px-1 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            cmsTab === 'bookings'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-850'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>走讀預約管理 ({dbBookings.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setCmsTab('messages')}
          className={`py-4 px-1 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            cmsTab === 'messages'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-850'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>留言管理 ({messages.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setCmsTab('articles')}
          className={`py-4 px-1 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            cmsTab === 'articles'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-850'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>走讀文章管理 ({dbArticles.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setCmsTab('videos')}
          className={`py-4 px-1 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            cmsTab === 'videos'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-850'
          }`}
        >
          <Youtube className="w-4 h-4" />
          <span>導覽影片管理 ({dbVideos.length})</span>
        </button>
      </div>

      {/* Main CMS Layout Content Panels */}
      <div className="p-6 md:p-8" id="cms-main-content">
        
        {/* PANEL: Walk Bookings */}
        {cmsTab === 'bookings' && (() => {
          const totalCount = dbBookings.length;
          const pendingCount = dbBookings.filter(b => b.status === '待確認' || !b.status || b.status === '').length;
          const confirmedCount = dbBookings.filter(b => b.status === '已確認').length;
          const canceledCount = dbBookings.filter(b => b.status === '已取消').length;

          const filteredBookings = dbBookings.filter(booking => {
            // Category status filter
            if (bookingFilter === '待確認') {
              const status = booking.status || '待確認';
              if (status !== '待確認') return false;
            } else if (bookingFilter !== 'all' && booking.status !== bookingFilter) {
              return false;
            }
            
            // Keyword search filter
            if (bookingSearch.trim()) {
              const s = bookingSearch.toLowerCase();
              const matchName = booking.name?.toLowerCase().includes(s);
              const matchPhone = booking.phone?.toLowerCase().includes(s);
              const matchEmail = booking.email?.toLowerCase().includes(s);
              const matchRoute = booking.routeTitle?.toLowerCase().includes(s);
              const matchOrg = booking.organization?.toLowerCase().includes(s);
              const matchNotes = booking.notes?.toLowerCase().includes(s);
              return matchName || matchPhone || matchEmail || matchRoute || matchOrg || matchNotes;
            }
            return true;
          });

          const handleExportCSV = (filteredOnly: boolean) => {
            const list = filteredOnly ? filteredBookings : dbBookings;
            if (list.length === 0) return;
            const headers = [
              '預約編號', '預約路線', '狀態', '聯絡人', '電話', '信箱', 'LINE ID', '單位/學校',
              '預估人數', '實際人數(自訂)', '首選日期', '備選日期一', '備選日期二', '開始時間', '結束時間',
              '時長', '解說語言', '集合地點', '區域', '文史主題', '導覽對象', '特殊需求', '備註細節', '提交時間'
            ];
            const rows = list.map(b => [
              b.id || '', b.routeTitle || '客製化走讀路線', b.status || '待確認', b.name || '', b.phone || '', b.email || '', b.lineId || '', b.organization || '',
              b.partySizeRange || '', b.customPartySize || '', b.date || '', b.altDate1 || '', b.altDate2 || '', b.startTime || '', b.endTime || '',
              b.duration || '', b.language || '中文', b.meetingPoint || '', (b.districts || []).join('; '), (b.themes || []).join('; '),
              (b.targetAudience || []).join('; '), (b.specialNeeds || []).join('; '), (b.notes || '').replace(/\r?\n/g, ' '),
              b.createdAt ? new Date(b.createdAt).toLocaleString('zh-TW') : ''
            ]);
            const csvStr = [
              headers.join(','),
              ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            ].join('\r\n');
            const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `文史走讀預約單_${filteredOnly ? '篩選' : '全部'}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };

          return (
            <div className="space-y-6">
              {/* Header section with Stats */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-800/5 p-2 rounded-xl text-amber-900 border border-amber-900/10">
                    <Calendar className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-stone-900">文史走讀預約管理系統</h3>
                    <p className="text-xs text-stone-500">處理全站各條文史路線的團體、學校、遊客客製化走讀導覽預約</p>
                  </div>
                </div>
                {totalCount > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportCSV(true)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-800" />
                      <span>匯出篩選名單 ({filteredBookings.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportCSV(false)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>匯出全部預約 ({totalCount})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status Filters & Counters Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total */}
                <button
                  type="button"
                  onClick={() => setBookingFilter('all')}
                  className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between h-24 ${
                    bookingFilter === 'all'
                      ? 'bg-stone-900 border-stone-950 text-white shadow-sm'
                      : 'bg-stone-50/50 border-stone-200/80 hover:border-stone-300 text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${bookingFilter === 'all' ? 'text-stone-300' : 'text-stone-500'}`}>全部預約名單</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono">{totalCount}</span>
                    <span className="text-xs">筆</span>
                  </div>
                </button>

                {/* Pending */}
                <button
                  type="button"
                  onClick={() => setBookingFilter('待確認')}
                  className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between h-24 ${
                    bookingFilter === '待確認'
                      ? 'bg-amber-600 border-amber-700 text-white shadow-sm animate-pulse'
                      : 'bg-stone-50/50 border-stone-200/80 hover:border-stone-300 text-stone-850 hover:bg-stone-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${bookingFilter === '待確認' ? 'text-amber-100' : 'text-amber-700'}`}>待核准審核</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono">{pendingCount}</span>
                    <span className="text-xs">筆</span>
                  </div>
                </button>

                {/* Confirmed */}
                <button
                  type="button"
                  onClick={() => setBookingFilter('已確認')}
                  className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between h-24 ${
                    bookingFilter === '已確認'
                      ? 'bg-emerald-700 border-emerald-800 text-white shadow-sm'
                      : 'bg-stone-50/50 border-stone-200/80 hover:border-stone-300 text-stone-850 hover:bg-stone-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${bookingFilter === '已確認' ? 'text-emerald-100' : 'text-emerald-700'}`}>已核准確認</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono">{confirmedCount}</span>
                    <span className="text-xs">筆</span>
                  </div>
                </button>

                {/* Cancelled */}
                <button
                  type="button"
                  onClick={() => setBookingFilter('已取消')}
                  className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between h-24 ${
                    bookingFilter === '已取消'
                      ? 'bg-stone-600 border-stone-700 text-white shadow-sm'
                      : 'bg-stone-50/50 border-stone-200/80 hover:border-stone-300 text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${bookingFilter === '已取消' ? 'text-stone-300' : 'text-stone-500'}`}>已取消預約</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black font-mono">{canceledCount}</span>
                    <span className="text-xs">筆</span>
                  </div>
                </button>
              </div>

              {/* Real-time search query box */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center">
                <div className="relative w-full md:flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="輸入關鍵字以搜尋聯絡姓名、電話、信箱、路線名稱、單位學校或備註細節..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800 font-sans"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                  />
                  {bookingSearch && (
                    <button
                      type="button"
                      onClick={() => setBookingSearch('')}
                      className="text-stone-400 hover:text-stone-600 absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono"
                    >
                      ✕ 清除
                    </button>
                  )}
                </div>
                <div className="text-xs text-stone-500 shrink-0 font-medium">
                  符合篩選：<span className="text-amber-800 font-bold font-mono text-sm">{filteredBookings.length}</span> / {totalCount} 筆
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                  <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500 text-sm">找不到符合目前篩選及搜尋關鍵字的預約表單。</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-stone-50/30 border border-stone-200/80 rounded-xl p-5 md:p-6 transition-all hover:bg-white hover:shadow-md relative overflow-hidden text-sm"
                      id={`cms-booking-card-${booking.id}`}
                    >
                      {/* Status Ribbon & Badge */}
                      <div className="absolute top-0 right-0 flex items-center">
                        <span className={`text-xs px-3 py-1.5 rounded-bl-xl font-bold ${
                          booking.status === '已確認'
                            ? 'bg-emerald-600 text-white'
                            : booking.status === '已取消'
                            ? 'bg-stone-400 text-white'
                            : 'bg-amber-600 text-white'
                        }`}>
                          {booking.status || '待確認'}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {/* Booking Route Header */}
                        <div className="border-b border-stone-150 pb-3 pr-16">
                          <h4 className="font-serif font-bold text-base text-stone-900 flex flex-wrap items-center gap-2">
                            <span className="text-amber-800 font-serif">【{booking.routeTitle || '客製化走讀路線'}】</span>
                            <span className="text-xs text-stone-500 font-mono">（代碼：{booking.id}）</span>
                          </h4>
                          <p className="text-xs text-stone-400 mt-1">
                            申請提交時間：{booking.createdAt ? new Date(booking.createdAt).toLocaleString('zh-TW') : '未知'}
                          </p>
                        </div>

                        {/* Main Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                          {/* Column 1: Client Info */}
                          <div className="space-y-2">
                            <h5 className="font-bold text-stone-800 border-b border-stone-100 pb-1 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-stone-500" />
                              <span>聯絡人資料</span>
                            </h5>
                            <ul className="space-y-1 text-xs text-stone-600 list-none pl-0">
                              <li><strong>姓名：</strong> <span className="text-stone-900 font-bold">{booking.name}</span></li>
                              <li><strong>電話：</strong> <span className="text-stone-900 font-mono">{booking.phone}</span></li>
                              <li><strong>信箱：</strong> <span className="text-stone-900 font-mono">{booking.email}</span></li>
                              {booking.lineId && <li><strong>LINE ID：</strong> <span className="text-stone-900 font-mono bg-stone-100 px-1 rounded">{booking.lineId}</span></li>}
                              {booking.organization && <li><strong>單位/學校：</strong> <span className="text-stone-900">{booking.organization}</span></li>}
                            </ul>
                          </div>

                          {/* Column 2: Date & Time */}
                          <div className="space-y-2">
                            <h5 className="font-bold text-stone-800 border-b border-stone-100 pb-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-stone-500" />
                              <span>導覽時間安排</span>
                            </h5>
                            <ul className="space-y-1 text-xs text-stone-600 list-none pl-0">
                              <li><strong>第一首選日期：</strong> <span className="text-amber-800 font-bold">{booking.date}</span></li>
                              {booking.altDate1 && <li><strong>備選日期一：</strong> <span className="text-stone-700">{booking.altDate1}</span></li>}
                              {booking.altDate2 && <li><strong>備選日期二：</strong> <span className="text-stone-700">{booking.altDate2}</span></li>}
                              <li><strong>預估時段：</strong> <span className="text-stone-900">{booking.startTime} ~ {booking.endTime}</span></li>
                              <li><strong>期望時長：</strong> <span className="text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-bold">{booking.duration}</span></li>
                            </ul>
                          </div>

                          {/* Column 3: Logistics */}
                          <div className="space-y-2">
                            <h5 className="font-bold text-stone-800 border-b border-stone-100 pb-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-stone-500" />
                              <span>人數與地點</span>
                            </h5>
                            <ul className="space-y-1 text-xs text-stone-600 list-none pl-0">
                              <li>
                                <strong>預估人數：</strong> 
                                <span className="text-stone-900 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                  {booking.partySizeRange === '40 人以上（請填寫實際人數）' ? `${booking.customPartySize} 人 (40人以上)` : booking.partySizeRange}
                                </span>
                              </li>
                              <li><strong>集合地點：</strong> <span className="text-stone-900 font-bold">{booking.meetingPoint}</span></li>
                              <li><strong>解說語言：</strong> <span className="text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-bold">{booking.language || '中文'}</span></li>
                            </ul>
                          </div>
                        </div>

                        {/* Tags & Arrays Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-100/40 p-3.5 rounded-xl border border-stone-200/50 text-left">
                          {/* Target Audience, Districts, Themes */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <strong className="text-stone-500 shrink-0">走讀區域：</strong>
                              {booking.districts?.map((d: string) => (
                                <span key={d} className="bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-700">{d}</span>
                              )) || <span className="text-stone-400">無</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <strong className="text-stone-500 shrink-0">文史主題：</strong>
                              {booking.themes?.map((t: string) => (
                                <span key={t} className="bg-amber-50 text-amber-900 border border-amber-100/50 px-1.5 py-0.5 rounded text-[10px] font-medium">{t}</span>
                              )) || <span className="text-stone-400">無</span>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <strong className="text-stone-500 shrink-0">導覽對象：</strong>
                              {booking.targetAudience?.map((a: string) => (
                                <span key={a} className="bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-700">{a}</span>
                              )) || <span className="text-stone-400">無</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <strong className="text-stone-500 shrink-0">特殊需求：</strong>
                              {booking.specialNeeds?.map((n: string) => (
                                <span key={n} className="bg-rose-50 text-rose-900 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] font-medium">{n}</span>
                              )) || <span className="text-stone-400">無</span>}
                            </div>
                          </div>
                        </div>

                        {/* Client Custom Notes */}
                        {booking.notes && (
                          <div className="bg-amber-50/20 border-l-4 border-amber-800 rounded-r-xl p-4 text-xs font-serif leading-relaxed text-stone-700 text-left">
                            <strong>✎ 遊客許願/備註細節：</strong>
                            <p className="mt-1 whitespace-pre-wrap">{booking.notes}</p>
                          </div>
                        )}

                        {/* Admin Controls */}
                        <div className="border-t border-stone-150 pt-3 flex flex-wrap items-center justify-between gap-3">
                          {/* Status controllers */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-stone-500 font-bold">更新狀態:</span>
                            {booking.status !== '已確認' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(booking.id, '已確認')}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 ${
                                  !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                                }`}
                                disabled={!hasAdminAccess}
                              >
                                核准確認
                              </button>
                            )}
                            {booking.status !== '已取消' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(booking.id, '已取消')}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200 ${
                                  !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                                }`}
                                disabled={!hasAdminAccess}
                              >
                                取消預約
                              </button>
                            )}
                            {booking.status !== '待確認' && booking.status !== undefined && booking.status !== '' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(booking.id, '待確認')}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 ${
                                  !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                                }`}
                                disabled={!hasAdminAccess}
                              >
                                設為待審核
                              </button>
                            )}
                          </div>

                          {/* Complete Deletion */}
                          <button
                            type="button"
                            onClick={() => triggerDeleteConfirm(booking.id, 'booking')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 ${
                              !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                            }`}
                            disabled={!hasAdminAccess}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>徹底刪除此預約</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* PANEL A: Guest messages */}
        {cmsTab === 'messages' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-stone-500" />
              <h3 className="font-serif font-bold text-lg text-stone-900">
                留言管理列表 ({messages.length} 筆)
              </h3>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-stone-500 text-sm">
                正在即時載入 Firestore 留言數據中...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-stone-200 rounded-2xl">
                <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 text-sm">目前留言板尚無任何遊客留言。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="bg-stone-50/50 border border-stone-150 rounded-xl p-5 md:p-6 transition-all hover:bg-white hover:shadow-md relative overflow-hidden"
                    id={`cms-message-card-${message.id}`}
                  >
                    <span className="absolute top-0 right-0 bg-stone-100 text-stone-600 text-[10px] px-3 py-1 rounded-bl-lg font-medium">
                      {message.category}
                    </span>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 border border-stone-100">
                        {message.avatarEmoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-2">
                          <div>
                            <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                              <span>{message.title}</span>
                              <span className="text-xs text-amber-500 font-serif">{'★'.repeat(message.rating)}</span>
                            </h4>
                            <p className="text-xs text-stone-400 mt-0.5">
                              發表人：<strong className="text-stone-700">{message.name}</strong> • 時間：{message.createdAt}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 mt-2 md:mt-0">
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                                hasAdminAccess
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800'
                                  : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-60'
                              }`}
                              title="管理員刪除此筆留言"
                              id={`btn-admin-delete-${message.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>管理員刪除</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                          {message.content}
                        </p>

                        {message.reply ? (
                          <div className="bg-amber-50/40 border-l-4 border-amber-700 rounded-r-xl p-4 text-xs mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-amber-900 font-serif">★ 星野洋洋 官方回覆：</strong>
                              <span className="text-stone-400 font-mono text-[10px]">{message.replyAt}</span>
                            </div>
                            <p className="text-stone-700 leading-relaxed font-serif">{message.reply}</p>
                          </div>
                        ) : (
                          <div className="mt-4 border-t border-stone-100 pt-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyText[message.id] || ''}
                                onChange={(e) => setReplyText({ ...replyText, [message.id]: e.target.value })}
                                placeholder="回覆此遊客留言... (限管理員)"
                                className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-600 focus:bg-white transition-all"
                                disabled={!hasAdminAccess}
                                id={`input-reply-${message.id}`}
                              />
                              <button
                                onClick={() => handleSendReply(message.id)}
                                disabled={!replyText[message.id]?.trim() || !hasAdminAccess}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                  replyText[message.id]?.trim() && hasAdminAccess
                                    ? 'bg-amber-800 text-white hover:bg-amber-900 shadow-xs'
                                    : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                                }`}
                                id={`btn-reply-submit-${message.id}`}
                              >
                                <Reply className="w-3.5 h-3.5" />
                                <span>發送回覆</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL B: Articles management */}
        {cmsTab === 'articles' && (
          <div className="space-y-8">
            {/* Create Article Form */}
            <div id="article-form-start" className="bg-stone-50 p-6 md:p-8 rounded-2xl border border-stone-200 scroll-mt-6">
              <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-3">
                {editingArticleId ? (
                  <Pencil className="w-5 h-5 text-amber-800 animate-pulse" />
                ) : (
                  <Plus className="w-5 h-5 text-amber-800" />
                )}
                <h4 className="font-serif font-bold text-stone-900 text-lg">
                  {editingArticleId ? '編輯走讀筆記/文章' : '發布新走讀筆記/文章'}
                </h4>
              </div>

              <form onSubmit={handleAddArticle} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-stone-500 mb-1.5">文章標題 *</label>
                    <input
                      type="text"
                      value={artTitle}
                      onChange={(e) => setArtTitle(e.target.value)}
                      placeholder="例：發現鹽埕第一公有市場的歷史身世"
                      className="w-full bg-white border border-stone-200 focus:border-amber-700 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1.5">文章分類 *</label>
                    <select
                      value={artCategory}
                      onChange={(e) => setArtCategory(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-700 outline-none cursor-pointer"
                    >
                      <option value="導覽心情">導覽心情</option>
                      <option value="歷史建物">歷史建物</option>
                      <option value="文史采風">文史采风</option>
                      <option value="私房景點">私房景點</option>
                      <option value="高雄歷史">高雄歷史</option>
                      <option value="人物誌">人物誌</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-stone-500">封面圖片 (可直接上傳本機 PNG/JPG 檔案，或填寫網址)</label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    {/* Left side: Local Upload */}
                    <div className="flex flex-col justify-center items-center p-4 border border-dashed border-stone-300 rounded-xl bg-white hover:bg-stone-50/50 transition-colors relative group min-h-[120px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleArtImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={isUploadingArtImg}
                      />
                      
                      {isUploadingArtImg ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
                          <span className="text-xs text-stone-500 font-medium animate-pulse">正在優化與上傳圖片...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-amber-900 block">上傳本機圖片 (PNG / JPG)</span>
                            <span className="text-[11px] text-stone-400 block mt-0.5">點擊或拖曳檔案至此，系統將自動最佳化並儲存</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right side: URL Input & Preview */}
                    <div className="flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-stone-500 block mb-1">或是貼上圖片網址：</span>
                        <input
                          type="url"
                          value={artImageUrl}
                          onChange={(e) => setArtImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/... 或貼上雲端硬碟連結"
                          className="w-full bg-white border border-stone-200 focus:border-amber-700 rounded-xl px-3 py-2 text-xs outline-none transition-all"
                        />
                      </div>

                      {artImageUrl ? (
                        <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100/80 rounded-xl p-2 min-h-[50px]">
                          {/* Image preview thumbnail */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-amber-200 bg-stone-100 relative group/preview">
                            <img
                              src={convertGoogleDriveUrl(artImageUrl)}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=800&q=80';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-amber-900 font-bold block">圖片預覽</span>
                            <span className="text-[9px] text-stone-400 truncate block">
                              {artImageUrl.startsWith('data:') ? '已成功載入自訂上傳圖片 (Base64)' : artImageUrl}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setArtImageUrl('')}
                            className="text-stone-400 hover:text-red-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-stone-100/50 border border-stone-200/50 rounded-xl p-2 text-stone-400 text-[11px] justify-center min-h-[50px] italic">
                          目前使用默認典雅圖
                        </div>
                      )}
                    </div>
                  </div>

                  {artImgUploadError && (
                    <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{artImgUploadError}</span>
                    </div>
                  )}

                  <p className="mt-1.5 text-xs text-stone-400 flex items-center gap-1 leading-normal">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                    <span>支援貼上 <strong>Google 雲端硬碟連結</strong>（系統會自動轉換）；或是<strong>點擊左側直接上傳您的 PNG / JPG 檔案</strong>，這是最不易出錯且 100% 成功顯示的推薦方式！</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5">文章內容內文 *</label>
                  <textarea
                    rows={8}
                    value={artContent}
                    onChange={(e) => setArtContent(e.target.value)}
                    placeholder="請在此處撰寫或貼上您精彩、故事性豐富的走讀筆記文章..."
                    className="w-full bg-white border border-stone-200 focus:border-amber-700 rounded-xl p-4 text-sm outline-none transition-all font-serif"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3">
                  {editingArticleId && (
                    <button
                      type="button"
                      onClick={handleCancelEditArticle}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-stone-200 text-stone-700 hover:bg-stone-300 transition-all cursor-pointer"
                    >
                      取消編輯
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isPostingArt || !hasAdminAccess}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      hasAdminAccess
                        ? 'bg-amber-800 text-white hover:bg-amber-900'
                        : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                    }`}
                  >
                    {!editingArticleId && <Plus className="w-4 h-4" />}
                    <span>
                      {isPostingArt 
                        ? (editingArticleId ? '更新中...' : '發布中...') 
                        : (editingArticleId ? '儲存修改' : '發布走讀筆記')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-base border-b border-stone-100 pb-2">
                現有文章列表 ({dbArticles.length} 篇)
              </h4>

              {dbArticles.length === 0 ? (
                <p className="text-center py-8 text-stone-400 text-xs">目前暫無文章。</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dbArticles.map((art) => (
                    <div key={art.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex gap-4 items-start justify-between">
                      <div className="flex gap-3 items-start min-w-0">
                        <img src={convertGoogleDriveUrl(art.imageUrl)} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-stone-100" alt="" />
                        <div className="min-w-0">
                          <h5 className="font-serif font-bold text-stone-800 text-sm truncate">{art.title}</h5>
                          <span className="inline-block bg-amber-50 text-amber-900 border border-amber-100 px-1.5 py-0.5 rounded text-[10px] font-medium mt-1">
                            {art.category}
                          </span>
                          <p className="text-[10px] text-stone-400 mt-1">發表日期：{art.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEditArticle(art)}
                          className={`text-amber-800 hover:text-amber-950 p-2 rounded-lg bg-white border border-stone-200 shadow-xs hover:border-amber-150 shrink-0 cursor-pointer ${
                            !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                          }`}
                          title="編輯文章"
                          disabled={!hasAdminAccess}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(art.id)}
                          className={`text-rose-600 hover:text-rose-800 p-2 rounded-lg bg-white border border-stone-200 shadow-xs hover:border-rose-150 shrink-0 cursor-pointer ${
                            !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                          }`}
                          title="刪除文章"
                          disabled={!hasAdminAccess}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL C: Videos management */}
        {cmsTab === 'videos' && (
          <div className="space-y-8">
            {/* Create Video Form */}
            <div id="video-form-start" className="bg-stone-50 p-6 md:p-8 rounded-2xl border border-stone-200 scroll-mt-6">
              <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-3">
                {editingVideoId ? (
                  <Pencil className="w-5 h-5 text-red-800 animate-pulse" />
                ) : (
                  <Plus className="w-5 h-5 text-red-800" />
                )}
                <h4 className="font-serif font-bold text-stone-900 text-lg">
                  {editingVideoId ? '編輯 YouTube 影音導覽' : '新增 YouTube 影音導覽'}
                </h4>
              </div>

              <form onSubmit={handleAddVideo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-stone-500 mb-1.5">影片標題 *</label>
                    <input
                      type="text"
                      value={vidTitle}
                      onChange={(e) => setVidTitle(e.target.value)}
                      placeholder="例：高雄風華錄｜鼓山篇 EP.01 消失的國聲報"
                      className="w-full bg-white border border-stone-200 focus:border-red-700 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1.5">影片系列/分類 *</label>
                    <select
                      value={vidSeries}
                      onChange={(e) => setVidSeries(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:border-red-700 outline-none cursor-pointer"
                    >
                      <option value="鼓山篇">鼓山篇</option>
                      <option value="鼓鼓山篇">鼓鼓山篇</option>
                      <option value="鳳山篇">鳳山篇</option>
                      <option value="鹽埕區">鹽埕區</option>
                      <option value="鹽埕篇">鹽埕篇</option>
                      <option value="左營舊城">左營舊城</option>
                      <option value="星野洋洋的心內話">星野洋洋的心內話</option>
                      <option value="精選影音">精選影音</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5">YouTube 影片 ID 或完整網址 *</label>
                  <input
                    type="text"
                    value={vidIdOrUrl}
                    onChange={(e) => setVidIdOrUrl(e.target.value)}
                    placeholder="例如：LBnUxf2pzQQ 或 https://www.youtube.com/watch?v=LBnUxf2pzQQ"
                    className="w-full bg-white border border-stone-200 focus:border-red-700 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                    required
                  />
                  <p className="text-[10px] text-stone-400 mt-1">系統將會自動為您剖析並擷取 YouTube 11字元的影片唯一識別碼 ID 欄位。</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5">影片詳細說明/內容介紹 *</label>
                  <textarea
                    rows={5}
                    value={vidDescription}
                    onChange={(e) => setVidDescription(e.target.value)}
                    placeholder="請簡述這部走讀導覽影片介紹、大綱、拍攝地點、考證文獻或心得..."
                    className="w-full bg-white border border-stone-200 focus:border-red-700 rounded-xl p-4 text-sm outline-none transition-all font-serif"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3">
                  {editingVideoId && (
                    <button
                      type="button"
                      onClick={handleCancelEditVideo}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-stone-200 text-stone-700 hover:bg-stone-300 transition-all cursor-pointer"
                    >
                      取消編輯
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isPostingVid || !hasAdminAccess}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      hasAdminAccess
                        ? 'bg-red-800 text-white hover:bg-red-900'
                        : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                    }`}
                  >
                    {!editingVideoId && <Plus className="w-4 h-4" />}
                    <span>
                      {isPostingVid 
                        ? (editingVideoId ? '更新中...' : '新增中...') 
                        : (editingVideoId ? '儲存修改' : '新增導覽影片')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Videos List */}
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-stone-900 text-base border-b border-stone-100 pb-2">
                現有影片列表 ({dbVideos.length} 支)
              </h4>

              {dbVideos.length === 0 ? (
                <p className="text-center py-8 text-stone-400 text-xs">目前暫無影片。</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dbVideos.map((vid) => (
                    <div key={vid.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex gap-4 items-start justify-between">
                      <div className="flex gap-3 items-start min-w-0">
                        {/* Thumbnail */}
                        <div className="w-20 shrink-0 aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-100 relative">
                          <img 
                            src={vid.imageUrl} 
                            className="w-full h-full object-cover" 
                            alt="" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src.includes('maxresdefault.jpg')) {
                                target.src = target.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                              }
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-serif font-bold text-stone-800 text-sm truncate">{vid.title}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block bg-red-50 text-red-900 border border-red-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {vid.series}
                            </span>
                            <span className="font-mono text-[9px] text-stone-400">ID: {vid.videoId}</span>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-1">發表日期：{vid.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEditVideo(vid)}
                          className={`text-red-800 hover:text-red-950 p-2 rounded-lg bg-white border border-stone-200 shadow-xs hover:border-red-150 shrink-0 cursor-pointer ${
                            !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                          }`}
                          title="編輯影片"
                          disabled={!hasAdminAccess}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(vid.id)}
                          className={`text-rose-600 hover:text-rose-800 p-2 rounded-lg bg-white border border-stone-200 shadow-xs hover:border-rose-150 shrink-0 cursor-pointer ${
                            !hasAdminAccess && 'opacity-50 cursor-not-allowed'
                          }`}
                          title="刪除影片"
                          disabled={!hasAdminAccess}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

       {/* Custom delete confirmation modal for iframe sandbox compliance */}
       {deleteConfirmId && (
         <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-150 text-left space-y-4">
             <div className="flex items-center gap-3 text-red-700">
               <AlertTriangle className="w-6 h-6 shrink-0" />
               <h3 className="font-serif font-bold text-lg text-stone-900">確認永久刪除</h3>
             </div>
             <p className="text-stone-600 text-sm leading-relaxed">
               您確認要永久刪除此項目（
               {deleteConfirmType === 'message' && '留言內容'}
               {deleteConfirmType === 'article' && '走讀筆記文章'}
               {deleteConfirmType === 'video' && '影音導覽影片'}
               {deleteConfirmType === 'booking' && '走讀預約申請紀錄'}
               ）嗎？此動作將同步從雲端 Firestore 資料庫中永久清除，且無法復原。
             </p>
             <div className="flex gap-3 justify-end pt-2">
               <button
                 onClick={() => {
                   setDeleteConfirmId(null);
                   setDeleteConfirmType(null);
                 }}
                 className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
               >
                 取消
               </button>
               <button
                 onClick={executeDelete}
                 className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
               >
                 確認刪除
               </button>
             </div>
           </div>
         </div>
       )}

      </div>
    </div>
  );
}
