import { io, Socket } from 'socket.io-client';
import { authService } from './authService';
import {
  ChatMessage,
  ChatConversation,
  ChatContact,
  ChatMessageType,
} from '../types/itPark';

export interface IncomingCallEvent {
  callerId: string;
  callerName: string;
  callerRole: string;
  conversationId: string;
  callType: 'video' | 'audio';
}

export interface CallEndedEvent {
  fromUserId: string;
  conversationId: string;
  durationSec?: number;
}

type MessageListener = (message: ChatMessage) => void;
type ConversationListener = (conversations: ChatConversation[]) => void;
type OnlineUsersListener = (onlineUserIds: string[]) => void;
type TypingListener = (event: { userId: string; userName: string; conversationId: string; isTyping: boolean }) => void;
type CallListener = (event: IncomingCallEvent | null) => void;
type UnreadCountListener = (count: number) => void;

class ChatService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private onlineUsers: Set<string> = new Set();
  private conversations: ChatConversation[] = [];
  private currentActiveConversationId: string | null = null;
  private totalUnreadCount: number = 0;

  // Listeners
  private messageListeners: Set<MessageListener> = new Set();
  private conversationListeners: Set<ConversationListener> = new Set();
  private onlineUsersListeners: Set<OnlineUsersListener> = new Set();
  private typingListeners: Set<TypingListener> = new Set();
  private callListeners: Set<CallListener> = new Set();
  private unreadCountListeners: Set<UnreadCountListener> = new Set();

  constructor() {
    // Listen for auth state changes to auto-connect or disconnect socket
    authService.subscribe(() => {
      if (authService.isAuthenticated()) {
        this.initSocket();
        this.refreshConversations();
        this.refreshUnreadCount();
      } else {
        this.disconnectSocket();
      }
    });

    if (authService.isAuthenticated()) {
      this.initSocket();
      this.refreshConversations();
      this.refreshUnreadCount();
      this.fetchOnlineUsers();
    }
  }

  public async fetchOnlineUsers(): Promise<string[]> {
    try {
      const token = authService.getAccessToken();
      if (!token) return Array.from(this.onlineUsers);
      const res = await fetch('/api/messages/online-users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.onlineUserIds)) {
          this.onlineUsers = new Set(data.onlineUserIds);
          this.notifyOnlineUsersListeners();
          return data.onlineUserIds;
        }
      }
    } catch (e) {
      console.warn('[CHAT] Failed to fetch online users via REST:', e);
    }
    return Array.from(this.onlineUsers);
  }

  // Play subtle modern audio notification chime using Web Audio API (zero external file dependency)
  public playNotificationSound() {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const now = ctx.currentTime;
      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2 (Higher note)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.08); // A5
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    } catch (e) {
      // Audio playback may be restricted if user hasn't interacted yet
    }
  }

  // Play phone ringing / dialing sound loop for calls
  public playRingTone(): () => void {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) return () => {};
      const ctx = new AudioContextClass();
      let isPlaying = true;

      const playChime = () => {
        if (!isPlaying || ctx.state === 'closed') return;
        try {
          const now = ctx.currentTime;
          // Dual frequency tone (440Hz + 480Hz) - standard telephony ring tone
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.4);
          osc2.stop(now + 1.4);
        } catch (e) {}
      };

      // Play immediately once
      playChime();
      // Repeat every 2.5 seconds
      const ringInterval = setInterval(playChime, 2500);

      return () => {
        isPlaying = false;
        clearInterval(ringInterval);
        try {
          ctx.close();
        } catch (err) {}
      };
    } catch (e) {
      return () => {};
    }
  }

  public initSocket() {
    const user = authService.getUser();
    if (!user) return;

    // If already connected or actively connecting for the same user, do not recreate
    if (this.socket) {
      if (this.socket.connected) return;
      // If currently connecting, avoid thrashing
      if ((this.socket as any).connecting) return;
    }

    const token = authService.getAccessToken();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io({
      auth: { 
        token: token || undefined, 
        userId: user.id 
      },
      query: { 
        userId: user.id 
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.fetchOnlineUsers();

      if (this.currentActiveConversationId) {
        this.joinConversationRoom(this.currentActiveConversationId);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('online_users_list', (userIds: string[]) => {
      if (Array.isArray(userIds)) {
        this.onlineUsers = new Set(userIds.map(String));
        this.notifyOnlineUsersListeners();
      }
    });

    this.socket.on('user_status_changed', (data: { userId: string; status: 'online' | 'offline'; onlineUserIds?: string[] }) => {
      if (data.onlineUserIds && Array.isArray(data.onlineUserIds)) {
        this.onlineUsers = new Set(data.onlineUserIds.map(String));
      } else {
        const uId = String(data.userId);
        if (data.status === 'online') {
          this.onlineUsers.add(uId);
        } else {
          this.onlineUsers.delete(uId);
        }
      }
      this.notifyOnlineUsersListeners();
    });

    this.socket.on('new_message', (message: ChatMessage) => {
      if (!message) return;
      const currentUser = authService.getUser();
      const isFromMe = currentUser && String(message.senderId) === String(currentUser.id);

      if (!isFromMe) {
        this.playNotificationSound();
      }

      this.updateLocalConversationWithNewMessage(message);
      this.notifyMessageListeners(message);
      this.refreshUnreadCount();
    });

    this.socket.on('message_notification', (data: any) => {
      if (!data) return;
      if (data.message) {
        this.updateLocalConversationWithNewMessage(data.message);
        this.notifyMessageListeners(data.message);
      }
      this.playNotificationSound();
      this.refreshConversations();
      this.refreshUnreadCount();
    });

    this.socket.on('conversation_updated', (updatedConv: any) => {
      if (updatedConv && (updatedConv.id || updatedConv._id)) {
        const convId = String(updatedConv.id || updatedConv._id);
        const idx = this.conversations.findIndex((c) => String(c.id || (c as any)._id) === convId);
        if (idx >= 0) {
          this.conversations[idx] = { ...this.conversations[idx], ...updatedConv };
        } else {
          this.conversations.unshift(updatedConv);
        }
        this.notifyConversationListeners();
      }
    });

    this.socket.on('messages_read', (_data: { conversationId: string; readByUserId: string }) => {
      this.refreshConversations();
      this.refreshUnreadCount();
    });

    this.socket.on('user_typing', (data: { userId: string; userName: string; conversationId: string }) => {
      this.typingListeners.forEach(listener =>
        listener({ ...data, isTyping: true })
      );
    });

    this.socket.on('user_stop_typing', (data: { userId: string; conversationId: string }) => {
      this.typingListeners.forEach(listener =>
        listener({ ...data, userName: '', isTyping: false })
      );
    });

    // Call signaling
    this.socket.on('incoming_call', (data: IncomingCallEvent) => {
      this.callListeners.forEach(listener => listener(data));
      window.dispatchEvent(new CustomEvent('parcit_incoming_call', { detail: data }));
    });

    this.socket.on('call_ended', (data: CallEndedEvent) => {
      this.callListeners.forEach(listener => listener(null));
      window.dispatchEvent(new CustomEvent('parcit_call_ended', { detail: data }));
      this.refreshConversations();
    });

    this.socket.on('call_rejected', (data: any) => {
      window.dispatchEvent(new CustomEvent('parcit_call_rejected', { detail: data }));
    });

    this.socket.on('call_accepted', (data: any) => {
      window.dispatchEvent(new CustomEvent('parcit_call_accepted', { detail: data }));
    });

    this.socket.on('webrtc_signal', (data: any) => {
      window.dispatchEvent(new CustomEvent('parcit_webrtc_signal', { detail: data }));
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join Room
  public joinConversationRoom(conversationId: string) {
    this.currentActiveConversationId = conversationId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  public leaveConversationRoom(conversationId: string) {
    if (this.currentActiveConversationId === conversationId) {
      this.currentActiveConversationId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  // REST API Methods
  public async getContacts(): Promise<ChatContact[]> {
    try {
      const token = authService.getAccessToken();
      const res = await fetch('/api/messages/contacts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des contacts');
      return await res.json();
    } catch (err) {
      console.error('[CHAT SERVICE] getContacts error:', err);
      return [];
    }
  }

  public async getConversations(): Promise<ChatConversation[]> {
    try {
      const token = authService.getAccessToken();
      const res = await fetch('/api/messages/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Erreur chargement des conversations');
      const data = await res.json();
      this.conversations = data;
      this.notifyConversationListeners();
      return data;
    } catch (err) {
      console.error('[CHAT SERVICE] getConversations error:', err);
      return this.conversations;
    }
  }

  public async createOrGetConversation(recipientId: string): Promise<ChatConversation> {
    const token = authService.getAccessToken();
    const res = await fetch('/api/messages/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipientId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Erreur création discussion' }));
      throw new Error(errorData.message || 'Impossible d\'ouvrir la discussion');
    }

    const conv = await res.json();
    await this.refreshConversations();
    return conv;
  }

  public async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const token = authService.getAccessToken();
      const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Erreur chargement des messages');
      return await res.json();
    } catch (err) {
      console.error('[CHAT SERVICE] getMessages error:', err);
      return [];
    }
  }

  public async sendMessage(
    conversationId: string,
    payload: {
      recipientId?: string;
      text?: string;
      messageType?: ChatMessageType;
      mediaUrl?: string;
      mediaName?: string;
      mediaSize?: number;
      mediaMimeType?: string;
      mediaDuration?: number;
      callData?: any;
      clientTempId?: string;
    }
  ): Promise<ChatMessage> {
    const clientTempId =
      payload.clientTempId ||
      `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullPayload = { ...payload, clientTempId, conversationId };

    // Try ultra-fast WebSocket emit if connected (< 15ms)
    if (this.socket && this.socket.connected) {
      try {
        const socketPromise = new Promise<ChatMessage>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket timeout')), 2500);
          this.socket!.emit('send_message', fullPayload, (res: any) => {
            clearTimeout(timeout);
            if (res && res.success && res.message) {
              resolve(res.message);
            } else {
              reject(new Error(res?.error || 'Socket send error'));
            }
          });
        });

        const savedMsg = await socketPromise;
        this.updateLocalConversationWithNewMessage(savedMsg);
        return savedMsg;
      } catch (e) {
        console.warn('[CHAT] Socket send fallback to REST:', e);
      }
    }

    // Fallback: REST API
    const token = authService.getAccessToken();
    const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(fullPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erreur envoi message' }));
      throw new Error(err.message || 'Erreur lors de l\'envoi');
    }

    const savedMsg = await res.json();
    this.updateLocalConversationWithNewMessage(savedMsg);
    return savedMsg;
  }

  public async markAsRead(conversationId: string): Promise<void> {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_read', { conversationId });
    }

    try {
      const token = authService.getAccessToken();
      await fetch(`/api/messages/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.refreshUnreadCount();
      this.refreshConversations();
    } catch (err) {
      console.error('[CHAT SERVICE] markAsRead error:', err);
    }
  }

  public async refreshUnreadCount(): Promise<number> {
    try {
      const token = authService.getAccessToken();
      const res = await fetch('/api/messages/unread-count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        this.totalUnreadCount = data.unreadCount || 0;
        this.notifyUnreadCountListeners();
        return this.totalUnreadCount;
      }
    } catch (err) {}
    return this.totalUnreadCount;
  }

  public async refreshConversations() {
    await this.getConversations();
  }

  public sendTyping(conversationId: string, isTyping: boolean) {
    const user = authService.getUser();
    if (!this.socket || !this.socket.connected || !user) return;

    if (isTyping) {
      this.socket.emit('typing_start', {
        conversationId,
        userName: user.beneficiaire,
      });
    } else {
      this.socket.emit('typing_stop', {
        conversationId,
      });
    }
  }

  // Call Signaling
  public initiateCall(data: {
    recipientId: string;
    conversationId: string;
    callType: 'video' | 'audio';
  }) {
    const user = authService.getUser();
    if (!this.socket || !this.socket.connected || !user) return;

    this.socket.emit('call_initiate', {
      recipientId: data.recipientId,
      conversationId: data.conversationId,
      callerName: user.beneficiaire,
      callerRole: user.role || 'Responsable IT',
      callType: data.callType,
    });
  }

  public acceptCall(callerId: string, conversationId: string) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('call_accept', { callerId, conversationId });
  }

  public rejectCall(callerId: string, conversationId: string, reason?: string) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('call_reject', { callerId, conversationId, reason });
  }

  public endCall(targetUserId: string, conversationId: string, durationSec: number = 0) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('call_end', { targetUserId, conversationId, durationSec });
  }

  public sendWebRTCSignal(targetUserId: string, signal: any) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('webrtc_signal', { targetUserId, signal });
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getTotalUnreadCount(): number {
    return this.totalUnreadCount;
  }

  // Subscriptions
  public subscribeMessages(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public subscribeConversations(listener: ConversationListener) {
    this.conversationListeners.add(listener);
    listener(this.conversations);
    return () => this.conversationListeners.delete(listener);
  }

  public subscribeOnlineUsers(listener: OnlineUsersListener) {
    this.onlineUsersListeners.add(listener);
    listener(Array.from(this.onlineUsers));
    return () => this.onlineUsersListeners.delete(listener);
  }

  public subscribeTyping(listener: TypingListener) {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  public subscribeIncomingCalls(listener: CallListener) {
    this.callListeners.add(listener);
    return () => this.callListeners.delete(listener);
  }

  public subscribeUnreadCount(listener: UnreadCountListener) {
    this.unreadCountListeners.add(listener);
    listener(this.totalUnreadCount);
    return () => this.unreadCountListeners.delete(listener);
  }

  private notifyMessageListeners(message: ChatMessage) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('[CHAT] Listener error:', err);
      }
    });
  }

  private updateLocalConversationWithNewMessage(message: ChatMessage) {
    if (!message || !message.conversationId) return;
    const convId = String(message.conversationId);
    const idx = this.conversations.findIndex((c) => String(c.id || (c as any)._id) === convId);
    const currentUserId = authService.getUser()?.id;

    let preview = message.text;
    if (message.messageType === 'image') preview = '📷 Photo partagée';
    else if (message.messageType === 'video') preview = '🎥 Vidéo partagée';
    else if (message.messageType === 'audio') preview = '🎙️ Message vocal';
    else if (message.messageType === 'file') preview = `📎 Fichier: ${message.mediaName || 'Document'}`;
    else if (message.messageType === 'call') preview = `📞 Appel ${message.callData?.type || ''}`;

    if (idx >= 0) {
      const conv = this.conversations[idx];
      const isCurrentActive = this.currentActiveConversationId && String(this.currentActiveConversationId) === convId;
      const isFromMe = currentUserId && String(message.senderId) === String(currentUserId);
      const newUnread = isCurrentActive || isFromMe ? 0 : (conv.unreadCount || 0) + 1;

      const updated: ChatConversation = {
        ...conv,
        lastMessageText: preview || '',
        lastMessageType: message.messageType,
        lastMessageAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
        lastMessageSenderId: message.senderId,
        unreadCount: newUnread,
      };

      // Move to top of conversations list
      this.conversations.splice(idx, 1);
      this.conversations.unshift(updated);
      this.notifyConversationListeners();
    } else {
      this.refreshConversations();
    }
  }

  private notifyConversationListeners() {
    this.conversationListeners.forEach(listener => listener(this.conversations));
  }

  private notifyOnlineUsersListeners() {
    const list = Array.from(this.onlineUsers);
    this.onlineUsersListeners.forEach(listener => listener(list));
  }

  private notifyUnreadCountListeners() {
    this.unreadCountListeners.forEach(listener => listener(this.totalUnreadCount));
  }
}

export const chatService = new ChatService();
