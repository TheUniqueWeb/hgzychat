import { motion } from 'motion/react';
import { MessageSquare, ExternalLink, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass p-12 rounded-[2rem] max-w-2xl w-full text-center relative z-10"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          className="w-24 h-24 bg-gradient-to-br from-neon-blue to-neon-purple rounded-3xl mx-auto mb-8 flex items-center justify-center neon-glow"
        >
          <Bot size={48} className="text-white" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tighter bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
          DKWIN HGZY PREDICATOR
        </h1>
        
        <p className="text-xl md:text-2xl text-neon-blue font-medium mb-12 tracking-wide font-sans">
          সাপোর্ট বট
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <motion.a
            href="https://t.me/dkwinhgzypredicator_bot"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 group"
          >
            <span className="text-lg font-semibold">Click Here</span>
            <ExternalLink size={20} className="text-neon-blue group-hover:translate-x-1 transition-transform" />
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center gap-3 font-bold text-lg neon-glow transition-all duration-300"
          >
            <Link to="/chat" className="flex items-center gap-3">
              <span>Start To Chat</span>
              <MessageSquare size={20} />
            </Link>
          </motion.button>
        </div>
      </motion.div>

      <footer className="absolute bottom-8 text-white/30 text-sm font-sans">
        © 2026 DKWIN HGZY PREDICATOR. All rights reserved.
      </footer>
    </div>
  );
}
