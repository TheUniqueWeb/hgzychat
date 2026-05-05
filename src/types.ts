export interface Message {
  id?: string;
  sender: 'user' | 'admin';
  text: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  timestamp: number;
  seen: boolean;
  edited?: boolean;
  replyTo?: string;
  reactions?: Record<string, string[]>; // emoji: userIds[]
}

export interface Chat {
  id: string;
  status: 'active' | 'closed';
  createdAt: number;
  userOnline: boolean;
  adminOnline: boolean;
  userTyping: boolean;
  adminTyping: boolean;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  userEmail?: string;
  userName?: string;
  lastSeen?: number;
}
