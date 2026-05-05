import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ChatPage from './pages/Chat';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminChat from './pages/AdminChat';
import { useAuthState } from './hooks/useAuthState';

export default function App() {
  const { user, loading } = useAuthState();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin" 
          element={user ? <AdminDashboard /> : <Navigate to="/admin/login" />} 
        />
        <Route 
          path="/admin/chat/:chatId" 
          element={user ? <AdminChat /> : <Navigate to="/admin/login" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
