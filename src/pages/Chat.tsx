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
  Copy,
  Reply,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { Message, Chat } from '../types';
import { cn, formatTime } from '../lib/utils';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

import { useDropzone, DropzoneOptions } from 'react-dropzone';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string | null>(localStorage.getItem('chatId'));
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

  // Initialize or resume chat
  useEffect(() => {
    if (!chatId) {
      const newChatId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chatId', newChatId);
      setChatId(newChatId);
      
      const initChat = async () => {
        const path = `chats/${newChatId}`;
        try {
          const chatRef = doc(db, 'chats', newChatId);
          const chatData: Omit<Chat, 'id'> = {
            status: 'active',
            createdAt: Date.now(),
            userOnline: true,
            adminOnline: false,
            userTyping: false,
            adminTyping: false,
            unreadCount: 0,
            userName: 'User ' + newChatId.substr(-4),
            lastSeen: Date.now()
          };
          await setDoc(chatRef, chatData);
          
          // Auto welcome message
          const messagesRef = collection(db, 'chats', newChatId, 'messages');
          await addDoc(messagesRef, {
            sender: 'admin',
            text: 'আসসালামু আলাইকুম, আমি সাকিব Admin of DKWIN HGZY predicator Bot. কিভাবে সাহায্য করতে পারি?',
            timestamp: Date.now(),
            seen: false
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      };
      initChat();
    }
  }, [chatId]);

  // Sync online status and typing
  useEffect(() => {
    if (chatId) {
      const chatRef = doc(db, 'chats', chatId);
      updateDoc(chatRef, { userOnline: true, lastSeen: Date.now() });

      const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');

      const handleVisibilityChange = () => {
        updateDoc(chatRef, { userOnline: document.visibilityState === 'visible' });
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      const interval = setInterval(() => {
        updateDoc(chatRef, { lastSeen: Date.now() });
      }, 30000);

      const unsubscribeChat = onSnapshot(chatRef, (doc) => {
        if (doc.exists()) {
          setChatInfo({ id: doc.id, ...doc.data() } as Chat);
        }
      });

      const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
      const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        
        // Play sound if new admin message arrives
        if (msgs.length > messages.length) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.sender === 'admin' && !lastMsg.seen) {
            notificationSound.play().catch(() => {});
          }
        }

        setMessages(msgs);
        
        // Mark admin messages as seen
        snapshot.docs.forEach(d => {
          if (d.data().sender === 'admin' && !d.data().seen) {
            updateDoc(doc(db, 'chats', chatId, 'messages', d.id), { seen: true })
              .catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${d.id}`));
          }
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
      });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(interval);
        unsubscribeChat();
        unsubscribeMessages();
        updateDoc(chatRef, { userOnline: false });
      };
    }
  }, [chatId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatInfo?.adminTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chatId) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(false);

    try {
      const chatRef = doc(db, 'chats', chatId);
      const snap = await getDoc(chatRef);
      const currentUnread = snap.exists() ? (snap.data().unreadCount || 0) : 0;

      updateDoc(chatRef, { 
        userTyping: false, 
        lastMessage: messageText, 
        lastMessageTime: Date.now(),
        unreadCount: currentUnread + 1
      });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        sender: 'user',
        text: messageText,
        timestamp: Date.now(),
        seen: false
      });

      // Simple Auto-Reply / FAQ
      const lowerText = messageText.toLowerCase();
      let botReply = '';
      if (lowerText.includes('হ্যালো') || lowerText.includes('hi') || lowerText.includes('hello')) {
        botReply = 'হ্যালো! DKWIN HGZY PREDICATOR এ আপনাকে স্বাগতম। আমরা কীভাবে আপনাকে সাহায্য করতে পারি?';
      } else if (lowerText.includes('পেমেন্ট') || lowerText.includes('টাকা') || lowerText.includes('payment')) {
        botReply = 'পেমেন্ট সংক্রান্ত সমস্যার জন্য আপনার ট্রানজেকশন আইডি প্রদান করুন। আমাদের অ্যাডমিন শীঘ্রই আপনার সাথে যোগাযোগ করবেন।';
      } else if (lowerText.includes('অফার') || lowerText.includes('offer')) {
        botReply = 'বর্তমানে আমাদের বিশেষ অফার চলছে! বিস্তারিত জানতে আমাদের টেলিগ্রাম বটে চেক করুন: https://t.me/dkwinhgzypredicator_bot';
      }

      if (botReply) {
        setTimeout(async () => {
          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            sender: 'admin',
            text: botReply,
            timestamp: Date.now(),
            seen: false
          });
        }, 1500);
      }
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
          sender: 'user',
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
    // Could add a toast here
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping && chatId) {
      setIsTyping(true);
      updateDoc(doc(db, 'chats', chatId), { userTyping: true });
      setTimeout(() => {
        setIsTyping(false);
        if (chatId) updateDoc(doc(db, 'chats', chatId), { userTyping: false });
      }, 3000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#050505]" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-neon-blue/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-neon-blue m-4 rounded-3xl">
          <div className="text-center">
            <Paperclip size={48} className="mx-auto mb-4 animate-bounce" />
            <p className="text-2xl font-bold">ফাইল এখানে ছাড়ুন</p>
          </div>
        </div>
      )}
      {/* Navbar */}
      <div className="glass p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              {chatInfo?.adminOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white leading-tight">Admin</h3>
              <p className="text-xs text-white/50">
                {chatInfo?.adminOnline ? 'অনলাইন' : 'অফলাইন'}
              </p>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-full">
          <MoreVertical size={20} className="text-white/60" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none" />
        
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id || idx}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex flex-col max-w-[80%] space-y-1 relative group",
              msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
            onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : (msg.id || null))}
          >
            <div className={cn(
              "relative px-4 py-2 rounded-2xl text-sm font-sans transition-all",
              msg.sender === 'user' 
                ? "bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-white/10 text-white rounded-tr-none" 
                : "bg-white/5 border border-white/5 text-white/90 rounded-tl-none",
              selectedMessage === msg.id && "ring-2 ring-neon-blue ring-offset-2 ring-offset-[#050505]"
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
                      msg.sender === 'user' ? "right-0" : "left-0"
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
                    {msg.sender === 'user' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id!); }}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-500/60 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {msg.fileUrl && (
                <div className="mt-1 space-y-2">
                  {msg.fileType?.startsWith('image/') ? (
                    <img 
                      src={msg.fileUrl} 
                      alt="Attachment" 
                      className="rounded-lg max-w-full h-auto border border-white/10 cursor-pointer" 
                      onClick={() => window.open(msg.fileUrl, '_blank')}
                    />
                  ) : (
                    <a 
                      href={msg.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-black/30 p-2 rounded-lg hover:bg-black/50 transition-colors"
                    >
                      <File size={20} className="text-neon-blue" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{msg.fileName}</p>
                      </div>
                      <Download size={16} className="text-white/40" />
                    </a>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] text-white/30">{formatTime(msg.timestamp)}</span>
              {msg.sender === 'user' && (
                msg.seen 
                  ? <CheckCheck size={12} className="text-neon-blue" />
                  : <Check size={12} className="text-white/20" />
              )}
            </div>
          </motion.div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {chatInfo?.adminTyping && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 text-xs text-white/40 italic ml-2"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce delay-75" />
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce delay-150" />
              </div>
              এডমিন লিখছেন...
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-transparent relative z-20">
        {uploadProgress !== null && (
          <div className="absolute -top-1 left-0 right-0 h-1 bg-white/5">
            <motion.div 
              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple shadow-[0_0_10px_rgba(0,242,255,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <div className="glass rounded-3xl p-2 flex items-end gap-2">
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
              placeholder="একটি বার্তা লিখুন..."
              className="w-full bg-transparent border-none py-3 px-2 text-white placeholder:text-white/30 focus:outline-none"
              disabled={chatInfo?.status === 'closed'}
            />
          </form>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || chatInfo?.status === 'closed'}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              inputText.trim() && chatInfo?.status !== 'closed'
                ? "bg-gradient-to-br from-neon-blue to-neon-purple neon-glow text-white"
                : "bg-white/5 text-white/20"
            )}
          >
            <Send size={22} />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-full mb-4 left-4 z-50">
            <div className="relative">
              <EmojiPicker 
                theme={Theme.DARK} 
                onEmojiClick={handleEmojiClick}
                width={300}
                height={400}
              />
              <button 
                onClick={() => setShowEmojiPicker(false)}
                className="absolute -top-3 -right-3 bg-[#050505] rounded-full p-1 border border-white/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {chatInfo?.status === 'closed' && (
          <div className="mt-4 text-center text-sm text-red-400 font-medium">
            অ্যাডমিন এই চ্যাটটি শেষ করেছেন।
          </div>
        )}
      </div>
    </div>
  );
}
