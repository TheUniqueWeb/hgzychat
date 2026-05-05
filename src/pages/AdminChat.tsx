import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  File, 
  Smile, 
  Paperclip, 
  ChevronLeft, 
  MoreVertical,
  Download,
  Check,
  CheckCheck,
  Trash2,
  XCircle,
  Copy,
  Bot,
  User
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { Message, Chat } from '../types';
import { cn, formatTime } from '../lib/utils';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

import { useDropzone, DropzoneOptions } from 'react-dropzone';

export default function AdminChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true,
    disabled: chatInfo?.status === 'closed'
  } as any);

  useEffect(() => {
    if (!chatId) return;

    const chatRef = doc(db, 'chats', chatId);
    updateDoc(chatRef, { adminOnline: true, unreadCount: 0 })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`));

    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

    const handleVisibilityChange = () => {
      updateDoc(chatRef, { adminOnline: document.visibilityState === 'visible' })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`));
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unsubscribeChat = onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        const data = doc.id === chatId ? { id: doc.id, ...doc.data() } as Chat : null;
        if (data) setChatInfo(data);
      }
    });

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));

      // Play sound if new user message arrives
      if (msgs.length > messages.length) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.sender === 'user' && !lastMsg.seen) {
          notificationSound.play().catch(() => {});
          // If we are looking at the chat, mark it as read immediately
          updateDoc(chatRef, { unreadCount: 0 });
        }
      }

      setMessages(msgs);
      
      // Mark user messages as seen
      snapshot.docs.forEach(d => {
        if (d.data().sender === 'user' && !d.data().seen) {
          updateDoc(doc(db, 'chats', chatId, 'messages', d.id), { seen: true })
            .catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${d.id}`));
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeChat();
      unsubscribeMessages();
      updateDoc(chatRef, { adminOnline: false });
    };
  }, [chatId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatInfo?.userTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chatId) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(false);
    updateDoc(doc(db, 'chats', chatId), { adminTyping: false, lastMessage: messageText, lastMessageTime: Date.now() });

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        sender: 'admin',
        text: messageText,
        timestamp: Date.now(),
        seen: false
      });
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFile = (file: File) => {
    if (!chatId) return;

    const storageRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error(error);
        setUploadProgress(null);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setUploadProgress(null);
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          sender: 'admin',
          text: '',
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type,
          timestamp: Date.now(),
          seen: false
        });
        updateDoc(doc(db, 'chats', chatId), { lastMessage: 'File: ' + file.name, lastMessageTime: Date.now() });
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const deleteMessage = async (msgId: string) => {
    if (!chatId || !confirm('এই বার্তাটি কি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', msgId));
      setSelectedMessage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}/messages/${msgId}`);
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setSelectedMessage(null);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping && chatId) {
      setIsTyping(true);
      updateDoc(doc(db, 'chats', chatId), { adminTyping: true });
      setTimeout(() => {
        setIsTyping(false);
        if (chatId) updateDoc(doc(db, 'chats', chatId), { adminTyping: false });
      }, 3000);
    }
  };

  const finishChat = async () => {
    if (!chatId) return;
    if (confirm('আপনি কি এই চ্যাটটি শেষ করতে চান?')) {
      await updateDoc(doc(db, 'chats', chatId), { status: 'closed' });
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        sender: 'admin',
        text: 'চ্যাটটি অ্যাডমিন দ্বারা শেষ করা হয়েছে। ধন্যবাদ!',
        timestamp: Date.now(),
        seen: false
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0b0b0b]" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-neon-purple/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-neon-purple m-4 rounded-3xl">
          <div className="text-center">
            <Paperclip size={48} className="mx-auto mb-4 animate-bounce text-neon-purple" />
            <p className="text-2xl font-bold">ফাইল এখানে ছাড়ুন</p>
          </div>
        </div>
      )}
      {/* Navbar */}
      <div className="glass p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-white/5 rounded-full transition-colors font-sans">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neon-blue border border-white/10">
                <User size={20} />
              </div>
              {chatInfo?.userOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b0b0b]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white leading-tight">{chatInfo?.userName || 'User'}</h3>
              <p className="text-xs text-white/50">
                {chatInfo?.userOnline ? 'অনলাইন' : 'অফলাইন'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {chatInfo?.status === 'active' && (
            <button 
              onClick={finishChat}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-bold border border-red-500/20 transition-all flex items-center gap-2"
            >
              <XCircle size={16} />
              Finish Chat
            </button>
          )}
          <button className="p-2 hover:bg-white/5 rounded-full">
            <MoreVertical size={20} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative">
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col max-w-[70%] space-y-1 relative group",
              msg.sender === 'admin' ? "ml-auto items-end" : "mr-auto items-start"
            )}
            onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : (msg.id || null))}
          >
            <div className={cn(
              "relative px-4 py-3 rounded-2xl text-sm font-sans transition-all",
              msg.sender === 'admin' 
                ? "bg-neon-purple/20 border border-neon-purple/30 text-white rounded-tr-none" 
                : "bg-white/5 border border-white/10 text-white shadow-xl rounded-tl-none",
              selectedMessage === msg.id && "ring-2 ring-neon-purple ring-offset-2 ring-offset-[#0b0b0b]"
            )}>
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

              {/* Message Actions Mini Menu */}
              <AnimatePresence>
                {selectedMessage === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className={cn(
                      "absolute bottom-full mb-2 flex items-center gap-1 glass p-1 rounded-xl z-30 shadow-2xl",
                      msg.sender === 'admin' ? "right-0" : "left-0"
                    )}
                  >
                    {msg.text && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyMessage(msg.text); }}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                        title="Copy"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id!); }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-500/60 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {msg.fileUrl && (
                <div className="mt-2">
                  {msg.fileType?.startsWith('image/') ? (
                    <img 
                      src={msg.fileUrl} 
                      alt="Attachment" 
                      className="rounded-xl max-w-full border border-white/10 cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => window.open(msg.fileUrl, '_blank')}
                    />
                  ) : (
                    <a 
                      href={msg.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-black/40 p-3 rounded-xl hover:bg-black/60 transition-colors border border-white/5"
                    >
                      <File size={20} className="text-neon-purple" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{msg.fileName}</p>
                      </div>
                      <Download size={16} className="text-white/40" />
                    </a>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-white/30 font-medium">{formatTime(msg.timestamp)}</span>
              {msg.sender === 'admin' && (
                msg.seen 
                  ? <CheckCheck size={12} className="text-neon-purple" />
                  : <Check size={12} className="text-white/20" />
              )}
            </div>
          </motion.div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {chatInfo?.userTyping && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 text-xs text-white/40 italic ml-2"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce delay-75" />
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce delay-150" />
              </div>
              ব্যবহারকারী লিখছেন...
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-transparent relative">
        {uploadProgress !== null && (
          <div className="absolute -top-1 left-0 right-0 h-1 bg-white/5">
            <motion.div 
              className="h-full bg-gradient-to-r from-neon-purple to-neon-blue shadow-[0_0_10px_rgba(157,0,255,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {chatInfo?.status === 'active' ? (
          <div className="glass rounded-3xl p-2 flex items-end gap-2 border-white/5">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <Smile size={22} />
              </button>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <Paperclip size={22} />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="flex-1">
              <input
                value={inputText}
                onChange={handleTyping}
                placeholder="একটি উত্তর লিখুন..."
                className="w-full bg-transparent border-none py-3 px-2 text-white placeholder:text-white/30 focus:outline-none"
              />
            </form>

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className={cn(
                "p-3 rounded-2xl transition-all duration-300",
                inputText.trim()
                  ? "bg-gradient-to-br from-neon-purple to-neon-blue neon-glow-purple text-white shadow-[0_0_20px_rgba(157,0,255,0.3)]"
                  : "bg-white/5 text-white/20"
              )}
            >
              <Send size={22} />
            </button>
          </div>
        ) : (
          <div className="glass p-6 rounded-3xl text-center border-red-500/10">
            <p className="text-red-400 font-bold flex items-center justify-center gap-2">
              <XCircle size={18} />
              এই চ্যাটটি শেষ করা হয়েছে।
            </p>
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-full mb-4 left-4 z-50 shadow-2xl">
            <EmojiPicker 
              theme={Theme.DARK} 
              onEmojiClick={(e) => {
                setInputText(prev => prev + e.emoji);
                setShowEmojiPicker(false);
              }}
              width={300}
              height={400}
            />
          </div>
        )}
      </div>
    </div>
  );
}
