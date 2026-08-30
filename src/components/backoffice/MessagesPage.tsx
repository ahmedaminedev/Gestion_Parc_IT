import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Mic,
  Camera,
  Smile,
  Phone,
  Video as VideoCall,
  Check,
  CheckCheck,
  ShieldCheck,
  Users,
  Download,
  Play,
  Pause,
  X,
  MessageSquare,
  Sparkles,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  ArrowLeft
} from 'lucide-react';
import { authService, AuthUser } from '../../services/authService';
import { chatService, IncomingCallEvent } from '../../services/chatService';
import {
  ChatMessage,
  ChatConversation,
  ChatContact,
  ChatMessageType,
} from '../../types/itPark';
import { VoiceRecorder } from './chat/VoiceRecorder';
import { CameraCaptureModal } from './chat/CameraCaptureModal';
import { LiveCallModal } from './chat/LiveCallModal';
import { MediaLightboxModal } from './chat/MediaLightboxModal';
import { UsersPresenceSidebar } from './chat/UsersPresenceSidebar';

const QUICK_EMOJIS = ['👍', '👋', '❤️', '😊', '✅', '⚠️', '💻', '🚀', '🙏', '🔥'];

export const MessagesPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [isPresenceSidebarOpen, setIsPresenceSidebarOpen] = useState(true);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, _setIsSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contactFilter, setContactFilter] = useState<'all' | 'it' | 'collab'>('all');
  const [contactSearch, setContactSearch] = useState('');
  
  // Rich media states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  
  // Lightbox
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string;
    type: 'image' | 'video' | 'file';
    name?: string;
  }>({
    isOpen: false,
    url: '',
    type: 'image',
  });

  // Live Video / Audio Call
  const [callModalData, setCallModalData] = useState<{
    isOpen: boolean;
    isIncoming?: boolean;
    incomingCallData?: IncomingCallEvent | null;
    recipientUser?: {
      id: string;
      beneficiaire: string;
      email: string;
      role: string;
    } | null;
    conversationId?: string;
    callType: 'video' | 'audio';
  }>({
    isOpen: false,
    callType: 'video',
  });

  // Pending Attachment (Image, Video, File) waiting for user to click send
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    dataUrl: string;
    type: 'image' | 'video' | 'file';
    name: string;
    size: number;
    mimeType: string;
  } | null>(null);

  // Audio Playback state for voice messages
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Hidden file inputs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isDSIAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      authService.isResponsableIT() ||
      authService.isAdmin() ||
      currentUser.role === 'Responsable IT' ||
      currentUser.accesApp === 'GLOBAL_BACKOFFICE'
    );
  }, [currentUser]);

  // Keep active conversation ref for realtime message listeners
  const activeConversationRef = useRef<ChatConversation | null>(activeConversation);
  activeConversationRef.current = activeConversation;
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Load initial data and subscribe to realtime events
  useEffect(() => {
    chatService.initSocket();
    loadConversations();
    loadContacts();

    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getUser());
      loadContacts();
    });

    const unsubConvs = chatService.subscribeConversations((updated) => {
      setConversations(updated);
    });

    const unsubOnline = chatService.subscribeOnlineUsers((users) => {
      setOnlineUserIds(users);
    });

    const unsubTyping = chatService.subscribeTyping((event) => {
      if (event.isTyping) {
        setTypingUsers((prev) => ({ ...prev, [event.userId]: event.userName }));
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[event.userId];
          return next;
        });
      }
    });

    const unsubMessages = chatService.subscribeMessages((newMsg) => {
      const currentActive = activeConversationRef.current;
      if (
        currentActive &&
        (String(newMsg.conversationId) === String(currentActive.id) ||
          String(newMsg.conversationId) === String((currentActive as any)._id))
      ) {
        setMessages((prev) => {
          const msgId = String(newMsg.id || (newMsg as any)._id || '');
          const tempId = (newMsg as any).clientTempId;

          // 1. If we have an optimistic message matching clientTempId, replace it
          if (tempId && prev.some((m) => m.id === tempId || (m as any).clientTempId === tempId)) {
            return prev.map((m) =>
              m.id === tempId || (m as any).clientTempId === tempId
                ? { ...newMsg, id: msgId || tempId, status: 'sent' }
                : m
            );
          }

          // 2. If it's already in the list by real ID, don't duplicate
          if (msgId && prev.some((m) => String(m.id || (m as any)._id) === msgId)) {
            return prev;
          }

          // 3. If sent by current user and matches optimistic temp message
          const currentUser = authService.getUser();
          if (currentUser && String(newMsg.senderId) === String(currentUser.id)) {
            const tempIdx = prev.findIndex(
              (m) =>
                m.id.startsWith('temp_') &&
                m.messageType === newMsg.messageType &&
                (m.text === newMsg.text || m.mediaUrl === newMsg.mediaUrl)
            );
            if (tempIdx >= 0) {
              const next = [...prev];
              next[tempIdx] = { ...newMsg, id: msgId, status: 'sent' };
              return next;
            }
          }

          return [...prev, newMsg];
        });
        chatService.markAsRead(currentActive.id);
        setTimeout(scrollToBottom, 20);
      }
    });

    const unsubCalls = chatService.subscribeIncomingCalls((call) => {
      if (call) {
        setCallModalData({
          isOpen: true,
          isIncoming: true,
          incomingCallData: call,
          recipientUser: {
            id: call.callerId,
            beneficiaire: call.callerName,
            email: '',
            role: call.callerRole,
          },
          conversationId: call.conversationId,
          callType: call.callType,
        });

        // If not on this conversation, automatically switch to it or fetch it
        if (call.conversationId && (!activeConversation || activeConversation.id !== call.conversationId)) {
          chatService.getConversations().then((convs) => {
            setConversations(convs);
            const found = convs.find(c => String(c.id || (c as any)._id) === String(call.conversationId));
            if (found) {
              setActiveConversation(found);
            }
          });
        }
      }
    });

    // Real-time presence heartbeat refresh every 5 seconds
    chatService.fetchOnlineUsers();
    const presenceInterval = setInterval(() => {
      chatService.fetchOnlineUsers();
      loadContacts();
    }, 5000);

    // Continuous silent background synchronization for active conversation
    const syncInterval = setInterval(async () => {
      const currentActive = activeConversationRef.current;
      if (currentActive && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const freshMessages = await chatService.getMessages(currentActive.id);
          if (Array.isArray(freshMessages) && freshMessages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => String(m.id || (m as any)._id || '')));
              const newOnes = freshMessages.filter((m) => {
                const id = String(m.id || (m as any)._id || '');
                return id && !existingIds.has(id);
              });
              if (newOnes.length > 0) {
                setTimeout(scrollToBottom, 50);
                return [...prev, ...newOnes];
              }
              return prev;
            });
          }
        } catch (e) {}
      }
    }, 3000);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(syncInterval);
      unsubAuth();
      unsubConvs();
      unsubOnline();
      unsubTyping();
      unsubMessages();
      unsubCalls();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // When active conversation changes, load messages & join socket room
  useEffect(() => {
    if (activeConversation) {
      chatService.joinConversationRoom(activeConversation.id);
      loadMessagesForConversation(activeConversation.id);
      chatService.markAsRead(activeConversation.id);
    }
  }, [activeConversation?.id]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      if (data.length > 0 && !activeConversation) {
        setActiveConversation(data[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async () => {
    const data = await chatService.getContacts();
    setContacts(data);
  };

  const loadMessagesForConversation = async (convId: string) => {
    const data = await chatService.getMessages(convId);
    // Ensure strict deduplication by ID
    const seen = new Set<string>();
    const uniqueMessages: ChatMessage[] = [];
    for (const m of data) {
      const key = String(m.id || (m as any)._id || '');
      if (key) {
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMessages.push(m);
        }
      } else {
        uniqueMessages.push(m);
      }
    }
    setMessages(uniqueMessages);
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Start new conversation with contact
  const handleStartChatWith = async (contact: ChatContact) => {
    try {
      const conv = await chatService.createOrGetConversation(contact.id);
      setShowNewChatModal(false);
      await loadConversations();
      setActiveConversation(conv);
    } catch (err: any) {
      alert(err.message || 'Impossible de démarrer la discussion');
    }
  };

  // Select contact from Users Presence Sidebar
  const handleSelectContactFromSidebar = async (contact: ChatContact) => {
    try {
      // Find if conversation already exists in memory
      const existing = conversations.find(
        (c) => c.participants && c.participants.includes(contact.id)
      );
      if (existing) {
        setActiveConversation(existing);
      } else {
        await handleStartChatWith(contact);
      }
    } catch (err) {
      console.error('Error selecting contact from sidebar:', err);
    }
  };

  // Start call from sidebar
  const handleStartCallFromSidebar = async (contact: ChatContact, type: 'video' | 'audio') => {
    try {
      let conv = conversations.find((c) => c.participants && c.participants.includes(contact.id));
      if (!conv) {
        conv = await chatService.createOrGetConversation(contact.id);
        await loadConversations();
      }
      setActiveConversation(conv);
      setCallModalData({
        isOpen: true,
        isIncoming: false,
        callType: type,
      });
    } catch (err: any) {
      alert(err.message || 'Erreur lancement appel');
    }
  };

  // Handle typing debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageText(val);

    if (activeConversation) {
      if (val.trim()) {
        chatService.sendTyping(activeConversation.id, true);
      } else {
        chatService.sendTyping(activeConversation.id, false);
      }
    }
  };

  // Send Text or Media Message
  const handleSendMessage = async () => {
    const textToSend = messageText.trim();
    if (!textToSend && !pendingAttachment) return;
    if (!activeConversation) return;

    // Stop typing indicator
    chatService.sendTyping(activeConversation.id, false);

    // Case 1: An attachment is pending -> send as rich media with optional caption
    if (pendingAttachment) {
      const att = pendingAttachment;
      setPendingAttachment(null);
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }

      await handleSendMedia(
        att.dataUrl,
        att.type,
        att.name,
        att.size,
        att.mimeType,
        undefined,
        textToSend
      );
      return;
    }

    // Case 2: Text only message
    setMessageText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 1. Generate client temp ID & immediate optimistic message
    const clientTempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recipientId = activeConversation.participants.find((p) => p !== currentUser?.id);

    const optimisticMsg: ChatMessage = {
      id: clientTempId,
      conversationId: activeConversation.id,
      senderId: currentUser?.id || '',
      senderNom: currentUser?.beneficiaire || 'Moi',
      senderEmail: currentUser?.email || '',
      senderRole: currentUser?.role || 'Collaborateur',
      recipientId,
      text: textToSend,
      messageType: 'text',
      readBy: [currentUser?.id || ''],
      isRead: false,
      clientTempId,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    // Instant local state update (0 ms latency!)
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 10);

    // Instant update of left sidebar conversation preview
    setConversations((prev) => {
      const idx = prev.findIndex((c) => String(c.id || (c as any)._id) === String(activeConversation.id));
      if (idx >= 0) {
        const next = [...prev];
        const updated = {
          ...next[idx],
          lastMessageText: textToSend,
          lastMessageType: 'text' as ChatMessageType,
          lastMessageAt: new Date().toISOString(),
          lastMessageSenderId: currentUser?.id,
        };
        next.splice(idx, 1);
        next.unshift(updated);
        return next;
      }
      return prev;
    });

    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    try {
      const newMsg = await chatService.sendMessage(activeConversation.id, {
        recipientId,
        text: textToSend,
        messageType: 'text',
        clientTempId,
      });

      // Update optimistic message with real database ID
      setMessages((prev) => {
        const realId = String(newMsg.id || (newMsg as any)._id || '');
        return prev.map((m) => {
          if (m.id === clientTempId || (m as any).clientTempId === clientTempId) {
            return { ...newMsg, id: realId || clientTempId, status: 'sent' };
          }
          return m;
        });
      });
    } catch (err: any) {
      console.error('Error sending text message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === clientTempId ? { ...m, status: 'error' } : m))
      );
    }
  };

  // Send Rich Media (Image, Video, File, Audio)
  const handleSendMedia = async (
    mediaUrl: string,
    messageType: ChatMessageType,
    mediaName?: string,
    mediaSize?: number,
    mediaMimeType?: string,
    mediaDuration?: number,
    captionText?: string
  ) => {
    if (!activeConversation) return;

    const clientTempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recipientId = activeConversation.participants.find((p) => p !== currentUser?.id);

    let previewText = captionText || '';
    if (!previewText) {
      if (messageType === 'image') previewText = '📷 Photo partagée';
      else if (messageType === 'video') previewText = '🎥 Vidéo partagée';
      else if (messageType === 'audio') previewText = '🎙️ Message vocal';
      else if (messageType === 'file') previewText = `📎 ${mediaName || 'Document'}`;
    }

    const optimisticMsg: ChatMessage = {
      id: clientTempId,
      conversationId: activeConversation.id,
      senderId: currentUser?.id || '',
      senderNom: currentUser?.beneficiaire || 'Moi',
      senderEmail: currentUser?.email || '',
      senderRole: currentUser?.role || 'Collaborateur',
      recipientId,
      text: captionText || '',
      messageType,
      mediaUrl,
      mediaName,
      mediaSize,
      mediaMimeType,
      mediaDuration,
      readBy: [currentUser?.id || ''],
      isRead: false,
      clientTempId,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 10);

    // Update left sidebar conversation preview
    setConversations((prev) => {
      const idx = prev.findIndex((c) => String(c.id || (c as any)._id) === String(activeConversation.id));
      if (idx >= 0) {
        const next = [...prev];
        const updated = {
          ...next[idx],
          lastMessageText: previewText,
          lastMessageType: messageType,
          lastMessageAt: new Date().toISOString(),
          lastMessageSenderId: currentUser?.id,
        };
        next.splice(idx, 1);
        next.unshift(updated);
        return next;
      }
      return prev;
    });

    try {
      const newMsg = await chatService.sendMessage(activeConversation.id, {
        recipientId,
        text: captionText || '',
        messageType,
        mediaUrl,
        mediaName,
        mediaSize,
        mediaMimeType,
        mediaDuration,
        clientTempId,
      });

      setMessages((prev) => {
        const realId = String(newMsg.id || (newMsg as any)._id || '');
        return prev.map((m) => {
          if (m.id === clientTempId || (m as any).clientTempId === clientTempId) {
            return { ...newMsg, id: realId || clientTempId, status: 'sent' };
          }
          return m;
        });
      });
      setTimeout(scrollToBottom, 20);
    } catch (err: any) {
      console.error('Error sending media:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === clientTempId ? { ...m, status: 'error' } : m))
      );
    }
  };

  // File Upload Handlers - Previews file in pending state so user can review and click Send
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('Le fichier sélectionné est trop volumineux (maximum 25 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPendingAttachment({
        file,
        dataUrl,
        type,
        name: file.name,
        size: file.size,
        mimeType: file.type || (type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'application/octet-stream'),
      });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    };

    // Reset input
    e.target.value = '';
    setShowAttachMenu(false);
  };

  // Clipboard Paste Support (e.g. screenshot or file paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const type: 'image' | 'video' | 'file' = file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
            ? 'video'
            : 'file';

          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => {
            setPendingAttachment({
              file,
              dataUrl: reader.result as string,
              type,
              name: file.name || `capture_${Date.now()}.${type === 'image' ? 'png' : 'dat'}`,
              size: file.size,
              mimeType: file.type || 'image/png',
            });
          };
          break;
        }
      }
    }
  };

  // Voice player helper
  const togglePlayAudio = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.playbackRate = audioPlaybackRate;
      audioPlayerRef.current = audio;
      setPlayingAudioId(msgId);
      audio.play();

      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  const togglePlaybackSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(audioPlaybackRate) + 1) % rates.length];
    setAudioPlaybackRate(nextRate);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = nextRate;
    }
  };

  // Start Call
  const handleInitiateCall = (type: 'video' | 'audio') => {
    if (!activeConversation) return;
    const recipientId = activeConversation.participants.find((p) => p !== currentUser?.id);
    if (!recipientId) return;

    chatService.initiateCall({
      recipientId,
      conversationId: activeConversation.id,
      callType: type,
    });

    setCallModalData({
      isOpen: true,
      isIncoming: false,
      callType: type,
      recipientUser: activeOtherUser
        ? {
            id: activeOtherUser.userId,
            beneficiaire: activeOtherUser.nom,
            email: activeOtherUser.email,
            role: activeOtherUser.role,
          }
        : null,
      conversationId: activeConversation.id,
    });
  };

  const handleCallFinished = async (_durationSec: number = 0) => {
    const targetConvId = callModalData.conversationId || activeConversation?.id;
    setCallModalData({ isOpen: false, callType: 'video' });
    if (targetConvId) {
      loadMessagesForConversation(targetConvId);
    }
    chatService.refreshConversations();
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const q = searchTerm.toLowerCase();
    return conversations.filter(
      (c) =>
        c.otherParticipant?.nom?.toLowerCase().includes(q) ||
        c.otherParticipant?.email?.toLowerCase().includes(q) ||
        c.lastMessageText?.toLowerCase().includes(q)
    );
  }, [conversations, searchTerm]);

  // Filter contacts in modal
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        c.beneficiaire.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.role.toLowerCase().includes(contactSearch.toLowerCase());

      if (contactFilter === 'it') return matchSearch && c.isIT;
      if (contactFilter === 'collab') return matchSearch && !c.isIT;
      return matchSearch;
    });
  }, [contacts, contactSearch, contactFilter]);

  const otherOnlineCount = useMemo(() => {
    const myId = String(currentUser?.id || '');
    const myEmail = currentUser?.email?.toLowerCase();

    if (isDSIAdmin) {
      // Exclude self from online user count
      const otherIds = onlineUserIds.filter((uid) => {
        const s = String(uid).toLowerCase();
        if (myId && s === myId.toLowerCase()) return false;
        if (myEmail && s === myEmail) return false;
        return true;
      });
      return Math.max(0, otherIds.length);
    } else {
      // For Collaborateur: count other online IT contacts
      return contacts.filter((c) => {
        if (myId && (String(c.id) === myId || (c.email && c.email.toLowerCase() === myEmail))) {
          return false;
        }
        const isIT = c.isIT || c.accesApp === 'GLOBAL_BACKOFFICE' || c.role?.toLowerCase().includes('it') || c.role?.toLowerCase().includes('admin') || c.role?.toLowerCase().includes('dsi');
        if (!isIT) return false;
        return onlineUserIds.some(
          (uid) => String(uid) === String(c.id) || (c.email && String(uid).toLowerCase() === String(c.email).toLowerCase())
        );
      }).length;
    }
  }, [isDSIAdmin, onlineUserIds, currentUser, contacts]);

  const activeOtherUser = activeConversation?.otherParticipant;
  const isRecipientOnline = Boolean(
    activeOtherUser &&
    onlineUserIds.some(
      (uid) =>
        String(uid) === String(activeOtherUser.userId) ||
        (activeOtherUser.email && String(uid).toLowerCase() === String(activeOtherUser.email).toLowerCase())
    )
  );

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Ko';
    const k = bytes / 1024;
    if (k < 1024) return `${k.toFixed(1)} Ko`;
    return `${(k / 1024).toFixed(1)} Mo`;
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-[#f8fafc] text-slate-800 overflow-hidden font-sans select-none relative">
      {/* 1. LEFT SIDEBAR: Conversations & Contacts */}
      <div
        className={`${
          activeConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-72 lg:w-80 xl:w-88 border-r border-slate-200 flex-col shrink-0 bg-white shadow-xs h-full`}
      >
        {/* Top Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-2.5 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-red-50 text-red-600 border border-red-100 shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                  {isDSIAdmin ? 'Messagerie IT' : 'Support IT Direct'}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                  {otherOnlineCount} {otherOnlineCount === 1 ? 'en ligne' : 'en ligne'} • Direct
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPresenceSidebarOpen(!isPresenceSidebarOpen)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 min-h-[36px] rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  isPresenceSidebarOpen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title={isPresenceSidebarOpen ? 'Masquer le volet utilisateurs' : 'Afficher les utilisateurs connectés'}
              >
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-extrabold text-xs">{otherOnlineCount}</span>
              </button>

              {/* New Chat Button */}
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 min-h-[36px] bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm shadow-red-600/20 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
                title="Nouvelle discussion"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Nouveau</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une discussion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Matrix Policy Hint for Collaborators */}
          {!isDSIAdmin && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[10px] sm:text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span className="truncate">Canal sécurisé : Support direct avec l'équipe IT.</span>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {isLoading && conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <span className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              <span>Chargement des messages...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Aucune discussion en cours</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Cliquez sur "+ Nouveau" pour contacter {isDSIAdmin ? 'un collaborateur ou un responsable IT' : 'un Responsable IT'}.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = conv.otherParticipant;
              const isActive = activeConversation?.id === conv.id;
              const isOnline = other && onlineUserIds.some(uid => String(uid) === String(other.userId) || (other.email && String(uid).toLowerCase() === String(other.email).toLowerCase()));
              const unread = conv.unreadCount || 0;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConversation(conv)}
                  className={`w-full p-2.5 sm:p-3 rounded-xl flex items-center gap-2.5 sm:gap-3 transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-red-50/90 border-l-4 border-red-600 text-slate-900 shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border shadow-xs ${
                      other?.role?.toLowerCase().includes('it')
                        ? 'bg-linear-to-tr from-red-600 to-rose-500 text-white border-red-200'
                        : 'bg-linear-to-tr from-slate-100 to-slate-200 text-slate-700 border-slate-200'
                    }`}>
                      {other?.nom ? other.nom.slice(0, 2).toUpperCase() : 'IT'}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200" />
                    )}
                  </div>

                  {/* Info & Last Message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {other?.nom || 'Contact'}
                        </span>
                        {other?.role?.toLowerCase().includes('it') && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold border border-red-200 shrink-0">
                            IT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {conv.lastMessageAt ? formatMessageTime(conv.lastMessageAt) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate font-medium">
                        {conv.lastMessageText || 'Discussion démarrée'}
                      </p>

                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold text-[10px] shadow-sm shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT MAIN AREA: Active Chat View */}
      {activeConversation ? (
        <div
          className={`${
            activeConversation ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-[#f8fafc] min-w-0 h-full overflow-hidden`}
        >
          {/* Active Chat Header */}
          <div className="min-h-16 px-3 sm:px-5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-xs gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Back to conversations button on Mobile */}
              <button
                type="button"
                onClick={() => setActiveConversation(null)}
                className="md:hidden p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Retour aux discussions"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
                  {activeOtherUser?.nom ? activeOtherUser.nom.slice(0, 2).toUpperCase() : 'IT'}
                </div>
                {isRecipientOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-slate-900 font-extrabold text-xs sm:text-sm truncate max-w-[130px] sm:max-w-[200px] lg:max-w-[260px]">
                    {activeOtherUser?.nom || 'Contact'}
                  </h2>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                      activeOtherUser?.role?.toLowerCase().includes('it')
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {activeOtherUser?.role || 'Utilisateur'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isRecipientOnline ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span className="font-medium">{isRecipientOnline ? 'En ligne' : 'Hors ligne'}</span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="truncate text-slate-400 hidden sm:inline">{activeOtherUser?.email}</span>
                </p>
              </div>
            </div>

            {/* Header Call & Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Video Call */}
              <button
                type="button"
                onClick={() => handleInitiateCall('video')}
                className="p-2 sm:px-2.5 sm:py-2 min-h-[36px] rounded-xl bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
                title="Démarrer un appel vidéo / caméra"
              >
                <VideoCall className="w-4 h-4 text-red-600 shrink-0" />
                <span className="hidden xl:inline">Appel Vidéo</span>
              </button>

              {/* Audio Call */}
              <button
                type="button"
                onClick={() => handleInitiateCall('audio')}
                className="p-2 sm:px-2.5 sm:py-2 min-h-[36px] rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
                title="Démarrer un appel vocal"
              >
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="hidden xl:inline">Appel Vocal</span>
              </button>

              {/* Toggle Presence Sidebar Button */}
              <button
                type="button"
                onClick={() => setIsPresenceSidebarOpen(!isPresenceSidebarOpen)}
                className={`p-2 sm:px-2.5 sm:py-2 min-h-[36px] rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs ${
                  isPresenceSidebarOpen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title={isPresenceSidebarOpen ? 'Masquer le volet utilisateurs' : 'Afficher les utilisateurs connectés'}
              >
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-extrabold">{otherOnlineCount}</span>
                <span className="hidden xl:inline font-bold">en ligne</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3.5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <div className="p-4 rounded-3xl bg-white border border-slate-200 text-red-600 mb-3 shadow-sm">
                  <Sparkles className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="text-slate-900 font-extrabold text-base mb-1">
                  Début de la discussion avec {activeOtherUser?.nom}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Échangez des messages, photos, vidéos, documents ou notes vocales en direct de manière instantanée.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser && msg.senderId === currentUser.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    {/* Sender name for other party */}
                    {!isMe && (
                      <span className="text-[11px] font-bold text-slate-600 mb-1 ml-1 flex items-center gap-1.5">
                        <span>{msg.senderNom}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({msg.senderRole})</span>
                      </span>
                    )}

                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-md lg:max-w-lg rounded-2xl p-3.5 transition-all shadow-xs ${
                        isMe
                          ? 'bg-linear-to-r from-red-600 to-rose-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                      }`}
                    >
                      {/* Message Content according to type */}
                      {msg.messageType === 'text' && (
                        <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Image Message */}
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <div className="space-y-1.5">
                          <img
                            src={msg.mediaUrl}
                            alt={msg.mediaName || 'Image partagée'}
                            onClick={() =>
                              setLightboxData({
                                isOpen: true,
                                url: msg.mediaUrl!,
                                type: 'image',
                                name: msg.mediaName,
                              })
                            }
                            className="max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity border border-black/5"
                          />
                          {msg.mediaName && (
                            <p className={`text-[11px] font-medium truncate ${isMe ? 'text-red-100' : 'text-slate-500'}`}>
                              {msg.mediaName}
                            </p>
                          )}
                          {msg.text && (
                            <p className={`text-sm font-normal leading-relaxed whitespace-pre-wrap break-words mt-1 ${
                              isMe ? 'text-white' : 'text-slate-800'
                            }`}>
                              {msg.text}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Video Message */}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <div className="space-y-1.5">
                          <video
                            src={msg.mediaUrl}
                            controls
                            className="max-h-64 rounded-xl object-cover border border-black/5"
                          />
                          {msg.mediaName && (
                            <p className={`text-[11px] font-medium truncate ${isMe ? 'text-red-100' : 'text-slate-500'}`}>
                              {msg.mediaName}
                            </p>
                          )}
                          {msg.text && (
                            <p className={`text-sm font-normal leading-relaxed whitespace-pre-wrap break-words mt-1 ${
                              isMe ? 'text-white' : 'text-slate-800'
                            }`}>
                              {msg.text}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Voice Note / Audio Message */}
                      {msg.messageType === 'audio' && msg.mediaUrl && (
                        <div className={`flex items-center gap-3 p-2.5 rounded-xl min-w-[220px] ${
                          isMe ? 'bg-white/15' : 'bg-slate-50 border border-slate-200'
                        }`}>
                          {/* Play/Pause Button */}
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
                              isMe
                                ? 'bg-white text-red-600 hover:bg-red-50'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-5 h-5 fill-current" />
                            ) : (
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            )}
                          </button>

                          {/* Waveform visual simulation */}
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-1 h-6">
                              {[30, 60, 90, 45, 80, 100, 70, 40, 85, 55, 30].map((h, i) => (
                                <span
                                  key={i}
                                  className={`w-1 rounded-full transition-all ${
                                    playingAudioId === msg.id
                                      ? (isMe ? 'bg-white animate-pulse' : 'bg-red-600 animate-pulse')
                                      : (isMe ? 'bg-white/60' : 'bg-slate-300')
                                  }`}
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                            <div className={`flex items-center justify-between text-[10px] font-mono ${
                              isMe ? 'text-white/80' : 'text-slate-500'
                            }`}>
                              <span>Note vocale</span>
                              <span>{msg.mediaDuration ? `${msg.mediaDuration}s` : '0:05'}</span>
                            </div>
                          </div>

                          {/* Speed toggle */}
                          <button
                            type="button"
                            onClick={togglePlaybackSpeed}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                              isMe
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {audioPlaybackRate}x
                          </button>
                        </div>
                      )}

                      {/* Document / File Message */}
                      {msg.messageType === 'file' && (
                        <div className="space-y-1.5">
                          <div className={`flex items-center gap-3 p-2.5 rounded-xl ${
                            isMe ? 'bg-white/15' : 'bg-slate-50 border border-slate-200'
                          }`}>
                            <div className={`p-2.5 rounded-lg ${
                              isMe ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                            }`}>
                              <FileText className="w-6 h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate ${
                                isMe ? 'text-white' : 'text-slate-900'
                              }`}>
                                {msg.mediaName || 'Document'}
                              </p>
                              <p className={`text-[10px] ${
                                isMe ? 'text-white/70' : 'text-slate-500'
                              }`}>
                                {formatFileSize(msg.mediaSize)}
                              </p>
                            </div>
                            {msg.mediaUrl && (
                              <a
                                href={msg.mediaUrl}
                                download={msg.mediaName || 'fichier'}
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                  isMe
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                }`}
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          {msg.text && (
                            <p className={`text-sm font-normal leading-relaxed whitespace-pre-wrap break-words mt-1 ${
                              isMe ? 'text-white' : 'text-slate-800'
                            }`}>
                              {msg.text}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Call Log Message */}
                      {msg.messageType === 'call' && (
                        <div className="flex items-center gap-2.5 py-1">
                          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                            msg.callData?.status === 'completed'
                              ? isMe ? 'bg-emerald-500/25 text-emerald-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : msg.callData?.status === 'rejected'
                              ? isMe ? 'bg-red-500/25 text-red-200' : 'bg-red-50 text-red-600 border border-red-200'
                              : isMe ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}>
                            {msg.callData?.status === 'completed' ? (
                              msg.callData?.type === 'video' ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />
                            ) : msg.callData?.status === 'rejected' ? (
                              <PhoneOff className="w-4 h-4" />
                            ) : (
                              <PhoneMissed className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-bold text-xs ${isMe ? 'text-white' : 'text-slate-900'}`}>
                              {msg.callData?.type === 'video' ? 'Appel vidéo' : 'Appel vocal'}
                            </p>
                            <p className={`text-[11px] font-medium ${
                              isMe ? 'text-white/80' : 'text-slate-500'
                            }`}>
                              {msg.callData?.status === 'completed' ? (
                                msg.callData?.durationSec && msg.callData.durationSec > 0 ? (
                                  <>
                                    Terminé • Durée :{' '}
                                    <span className="font-semibold font-mono">
                                      {Math.floor(msg.callData.durationSec / 60) > 0
                                        ? `${Math.floor(msg.callData.durationSec / 60)} min ${msg.callData.durationSec % 60} s`
                                        : `${msg.callData.durationSec} s`}
                                    </span>
                                  </>
                                ) : (
                                  'Terminé'
                                )
                              ) : msg.callData?.status === 'rejected' ? (
                                'Appel refusé'
                              ) : (
                                'Appel manqué (sans réponse)'
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Message Footer: Time + Read Receipt */}
                      <div
                        className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                          isMe ? 'text-red-100' : 'text-slate-400'
                        }`}
                      >
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isMe && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-white inline" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-red-200 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span>{Object.values(typingUsers).join(', ')} est en train d'écrire...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Bar */}
          <div className="p-2.5 sm:p-4 border-t border-slate-200 bg-white relative shrink-0">
            {/* Voice Recorder Overlay when active */}
            {isRecordingVoice ? (
              <VoiceRecorder
                onSendVoice={(audioUrl, duration) => {
                  setIsRecordingVoice(false);
                  handleSendMedia(audioUrl, 'audio', 'vocal.opus', 0, 'audio/webm', duration);
                }}
                onCancel={() => setIsRecordingVoice(false)}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {/* Emoji Bar Popover */}
                {showEmojiPicker && (
                  <div className="flex items-center gap-1.5 sm:gap-2 p-2 bg-white border border-slate-200 shadow-xl rounded-2xl mb-1 overflow-x-auto max-w-full">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMessageText((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-base sm:text-lg hover:scale-125 transition-transform p-1 cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attachment Menu Popover */}
                {showAttachMenu && (
                  <div className="absolute bottom-16 sm:bottom-20 left-3 sm:left-6 z-20 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-48 sm:w-52 animate-in fade-in slide-in-from-bottom-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        imageInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>Envoyer une image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        videoInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                      <Video className="w-4 h-4 text-blue-600" />
                      <span>Envoyer une vidéo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Envoyer un document</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'image')}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, 'video')}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  onChange={(e) => handleFileUpload(e, 'file')}
                  className="hidden"
                />

                {/* Pending Attachment Preview Banner */}
                {pendingAttachment && (
                  <div className="mb-2 p-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {pendingAttachment.type === 'image' && (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                          <img
                            src={pendingAttachment.dataUrl}
                            alt={pendingAttachment.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {pendingAttachment.type === 'video' && (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                          <Video className="w-6 h-6" />
                        </div>
                      )}
                      {pendingAttachment.type === 'file' && (
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                            {pendingAttachment.type === 'image'
                              ? 'Photo'
                              : pendingAttachment.type === 'video'
                              ? 'Vidéo'
                              : 'Fichier'}
                          </span>
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Prêt à envoyer
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-sm mt-0.5">
                          {pendingAttachment.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatFileSize(pendingAttachment.size)}
                        </p>
                      </div>
                    </div>

                    {/* Cancel Attachment Button */}
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Annuler et retirer le fichier"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Main Input Row */}
                <div className="flex items-end gap-1.5 sm:gap-2">
                  {/* Attach Button */}
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2 sm:p-3 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Joindre un fichier"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  {/* Direct Camera Button */}
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="p-2 sm:p-3 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Prendre une photo ou vidéo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>

                  {/* Emoji Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 sm:p-3 min-h-[40px] min-w-[40px] hidden xs:flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Insérer un émoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Textarea */}
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 focus-within:border-red-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-500/10 transition-all min-w-0">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={messageText}
                      onChange={handleTextChange}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        pendingAttachment
                          ? "Ajouter un commentaire (optionnel) puis cliquer sur Envoyer..."
                          : "Écrivez un message..."
                      }
                      className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none max-h-32"
                    />
                  </div>

                  {/* Voice Note Button or Send Button */}
                  {messageText.trim() || pendingAttachment ? (
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isSending}
                      className="p-2.5 sm:p-3 min-h-[40px] min-w-[40px] flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-md shadow-red-600/20 transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
                      title="Envoyer le message"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 sm:p-3 min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-2xl transition-all cursor-pointer shrink-0 active:scale-95 border border-slate-200"
                      title="Enregistrer un message vocal"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty selection state */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 bg-[#f8fafc]">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 text-slate-500 mb-4 shadow-sm">
            <MessageSquare className="w-12 h-12 text-red-600 mx-auto" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Messagerie Instantanée OMODA | JAECOO
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            {isDSIAdmin
              ? 'Sélectionnez une discussion à gauche ou démarrez un nouvel échange avec les collaborateurs ou responsables IT.'
              : 'Contactez directement les Responsables IT pour vos réclamations, besoins techniques ou assistance matérielle.'}
          </p>
          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Démarrer une discussion</span>
          </button>
        </div>
      )}

      {/* 3. RIGHT SIDEBAR: Annuaire & Présence en direct (Connectés / Déconnectés) */}
      <UsersPresenceSidebar
        contacts={contacts}
        onlineUserIds={onlineUserIds}
        currentUserId={currentUser?.id}
        isDSIAdmin={isDSIAdmin}
        onSelectContact={handleSelectContactFromSidebar}
        onStartCall={handleStartCallFromSidebar}
        isOpen={isPresenceSidebarOpen}
        onToggle={() => setIsPresenceSidebarOpen(!isPresenceSidebarOpen)}
      />

      {/* 4. MODAL: NOUVELLE DISCUSSION (With Matrix Authorization Filters) */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-extrabold text-base">Nouvelle discussion</h3>
                  <p className="text-xs text-slate-500">
                    {isDSIAdmin
                      ? 'Sélectionnez un contact autorisé'
                      : 'Contacter un Responsable IT'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Matrix Filter & Search */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, rôle..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                />
              </div>

              {isDSIAdmin && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setContactFilter('all')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      contactFilter === 'all'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactFilter('it')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      contactFilter === 'it'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Resp. IT
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactFilter('collab')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      contactFilter === 'collab'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Collaborateurs
                  </button>
                </div>
              )}
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <p>Aucun contact trouvé.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isOnline = onlineUserIds.includes(contact.id);

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleStartChatWith(contact)}
                      className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors text-left cursor-pointer group"
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm border border-slate-200 group-hover:border-red-500">
                          {contact.beneficiaire.slice(0, 2).toUpperCase()}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full ring-1 ring-emerald-200" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-sm text-slate-900 truncate group-hover:text-red-600 transition-colors">
                            {contact.beneficiaire}
                          </span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                              contact.isIT
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {contact.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: CAMERA CAPTURE */}
      {isCameraModalOpen && (
        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onSendMedia={(dataUrl, type, duration) => {
            handleSendMedia(
              dataUrl,
              type,
              type === 'image' ? 'photo_camera.jpg' : 'video_camera.webm',
              0,
              type === 'image' ? 'image/jpeg' : 'video/webm',
              duration
            );
          }}
        />
      )}

      {/* 5. MODAL: LIVE VIDEO / AUDIO CALL */}
      {callModalData.isOpen && (
        <LiveCallModal
          isOpen={callModalData.isOpen}
          isIncoming={callModalData.isIncoming}
          incomingCallData={callModalData.incomingCallData}
          recipientUser={
            callModalData.recipientUser ||
            (activeOtherUser
              ? {
                  id: activeOtherUser.userId,
                  beneficiaire: activeOtherUser.nom,
                  email: activeOtherUser.email,
                  role: activeOtherUser.role,
                }
              : null)
          }
          conversationId={callModalData.conversationId || activeConversation?.id}
          callType={callModalData.callType}
          onClose={handleCallFinished}
          onTakeSnapshot={(dataUrl) => {
            handleSendMedia(
              dataUrl,
              'image',
              `capture_appel_${Date.now()}.jpg`,
              0,
              'image/jpeg'
            );
          }}
        />
      )}

      {/* 6. MODAL: MEDIA LIGHTBOX */}
      {lightboxData.isOpen && (
        <MediaLightboxModal
          isOpen={lightboxData.isOpen}
          onClose={() => setLightboxData((prev) => ({ ...prev, isOpen: false }))}
          mediaUrl={lightboxData.url}
          mediaType={lightboxData.type}
          mediaName={lightboxData.name}
        />
      )}
    </div>
  );
};
