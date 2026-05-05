import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // For this requirement, we'll use the hardcoded username/password
    // In a real app, you'd use Firebase Auth properly.
    // We'll map "Admin" to "admin@dkwin.com" for Firebase Auth
    if (password === '@Admin-2000-Ad') {
      try {
        await signInWithEmailAndPassword(auth, 'admin@dkwin.com', '@Admin-2000-Ad');
        navigate('/admin');
      } catch (err) {
        // If account doesn't exist, this might fail unless we pre-created it.
        // For the sake of this prompt, we'll assume the developer handles the first-time setup or we mock verify.
        setError('সিস্টেম ত্রুটি: অ্যাডমিন অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।');
      }
    } else {
      setError('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
    }
    setLoading(false);
  };

  const handleInitializeAdmin = async () => {
    setLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, 'admin@dkwin.com', '@Admin-2000-Ad');
      alert('অ্যাডমিন অ্যাকাউন্ট তৈরি সফল হয়েছে! এখন লগইন করুন।');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('অ্যাডমিন অ্যাকাউন্ট ইতিমধ্যে বিদ্যমান।');
      } else {
        setError('ত্রুটি: ' + err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-10 rounded-3xl max-w-md w-full relative z-10"
      >
        <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
          Admin Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* ... */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60 ml-1">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                defaultValue="Admin"
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none cursor-not-allowed opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60 ml-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-neon-purple transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center font-sans"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-blue rounded-xl font-bold text-lg neon-glow-purple flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'Login'
            )}
          </motion.button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button 
              onClick={handleInitializeAdmin}
              className="text-xs text-white/20 hover:text-white/40 transition-colors"
            >
              First time? Initialize Admin
            </button>
        </div>
      </motion.div>
    </div>
  );
}
