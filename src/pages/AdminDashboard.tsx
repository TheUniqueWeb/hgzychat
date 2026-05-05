import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  MessageSquare, 
  LogOut, 
  Search, 
  Circle,
  ChevronRight,
  Clock,
  Dot
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Chat } from '../types';
import { cn, formatTime } from '../lib/utils';

export default function AdminDashboard() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const filteredChats = chats.filter(chat => 
    chat.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Sidebar-ish Navbar */}
      <div className="glass sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center neon-glow-purple">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-xs text-white/40">{chats.length} Active Conversations</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-red-400"
        >
          <LogOut size={22} />
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Users', value: chats.length, icon: Users, color: 'text-neon-blue' },
            { label: 'Active Chats', value: chats.filter(c => c.status === 'active').length, icon: MessageSquare, color: 'text-green-400' },
            { label: 'Unread', value: chats.filter(c => c.unreadCount > 0).length, icon: Circle, color: 'text-neon-purple' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-3xl flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-white/40 font-medium mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold">{stat.value}</h3>
              </div>
              <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                <stat.icon size={24} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="ব্যবহারকারীর নাম বা আইডি দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-neon-blue transition-all"
          />
        </div>

        {/* Chat List */}
        <div className="space-y-3 pb-12">
          {filteredChats.map((chat, i) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/admin/chat/${chat.id}`}>
                <div className={cn(
                  "glass p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all",
                  chat.unreadCount > 0 ? "border-l-4 border-l-neon-blue" : ""
                )}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-neon-blue font-bold text-xl">
                        {chat.userName?.charAt(0) || 'U'}
                      </div>
                      {chat.userOnline && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#0e0e0e]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg truncate">{chat.userName || 'Unknown User'}</h4>
                        {chat.status === 'closed' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                            Closed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/40 truncate mt-0.5">
                        {chat.userTyping ? (
                          <span className="text-neon-blue animate-pulse">লিখছেন...</span>
                        ) : (
                          chat.lastMessage || 'কোনো বার্তা নেই'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className="text-xs text-white/30 flex items-center gap-1">
                      <Clock size={12} />
                      {chat.lastMessageTime ? formatTime(chat.lastMessageTime) : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      {chat.unreadCount > 0 && (
                        <span className="bg-neon-blue text-black font-bold text-xs px-2 py-0.5 rounded-full neon-glow">
                          {chat.unreadCount} Unread
                        </span>
                      )}
                      <ChevronRight size={20} className="text-white/20 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {!loading && filteredChats.length === 0 && (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <MessageSquare size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40 italic">কোনো চ্যাট খুঁজে পাওয়া যায়নি।</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
