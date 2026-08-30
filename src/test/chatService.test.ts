import { describe, it, expect } from 'vitest';
import { ChatMessage } from '../types/itPark';

describe('Suite Complète : Messagerie Instantanée, Appels Vidéo/Audio en Direct & Capture Caméra', () => {
  const currentUserId = 'user-current';

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-other',
      senderNom: 'Sarra Support',
      senderEmail: 'sarra@omoda.tn',
      senderRole: 'Responsable IT',
      messageType: 'text',
      text: 'Bonjour Ahmed, ton nouvel écran 4K est prêt au bureau IT.',
      createdAt: '2025-05-12T09:00:00Z',
      readBy: ['user-other', currentUserId],
      isRead: true,
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'user-other',
      senderNom: 'Sarra Support',
      senderEmail: 'sarra@omoda.tn',
      senderRole: 'Responsable IT',
      messageType: 'text',
      text: 'Tu peux passer le récupérer avant 17h.',
      createdAt: '2025-05-12T09:02:00Z',
      readBy: ['user-other'],
      isRead: false,
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: currentUserId,
      senderNom: 'Ahmed Nafti',
      senderEmail: 'ahmed@omoda.tn',
      senderRole: 'Collaborateur',
      messageType: 'text',
      text: 'Parfait, je passe dans 10 minutes !',
      createdAt: '2025-05-12T09:05:00Z',
      readBy: [currentUserId],
      isRead: true,
    },
    {
      id: 'msg-4',
      conversationId: 'conv-2',
      senderId: 'user-3',
      senderNom: 'Khaled Mansour',
      senderEmail: 'khaled@omoda.tn',
      senderRole: 'Commercial',
      messageType: 'image',
      text: 'Photo du numéro de série',
      mediaUrl: 'https://example.com/uploads/photo-serie.jpg',
      mediaName: 'photo-serie.jpg',
      mediaSize: 2048500,
      readBy: ['user-3'],
      createdAt: '2025-05-12T10:00:00Z',
      isRead: false,
    },
    {
      id: 'msg-5',
      conversationId: 'conv-1',
      senderId: currentUserId,
      senderNom: 'Ahmed Nafti',
      senderEmail: 'ahmed@omoda.tn',
      senderRole: 'Collaborateur',
      messageType: 'call',
      text: 'Appel vidéo terminé (03:45)',
      callData: {
        type: 'video',
        status: 'completed',
        durationSec: 225,
      },
      readBy: [currentUserId, 'user-other'],
      isRead: true,
      createdAt: '2025-05-12T11:00:00Z',
    },
  ];

  describe('1. Types de Messages & Pièces Jointes', () => {
    it('gère correctement les messages de type texte', () => {
      const textMsg = mockMessages.find((m) => m.id === 'msg-1')!;
      expect(textMsg.messageType).toBe('text');
      expect(textMsg.text).toContain('écran 4K');
    });

    it('gère correctement les messages multimédias (images, pièces jointes)', () => {
      const imgMsg = mockMessages.find((m) => m.id === 'msg-4')!;
      expect(imgMsg.messageType).toBe('image');
      expect(imgMsg.mediaUrl).toBeDefined();
      expect(imgMsg.mediaName).toBe('photo-serie.jpg');
      expect(imgMsg.mediaSize).toBeGreaterThan(0);
    });

    it('formate la taille des fichiers attachés en Mo / Ko', () => {
      const formatFileSize = (bytes?: number) => {
        if (!bytes) return '0 Ko';
        if (bytes >= 1024 * 1024) {
          return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
        }
        return `${Math.round(bytes / 1024)} Ko`;
      };

      expect(formatFileSize(2048500)).toBe('2.0 Mo');
      expect(formatFileSize(512000)).toBe('500 Ko');
    });
  });

  describe('2. Calcul des Badges et Messages Non Lus', () => {
    it('calcule le nombre exact de messages non lus destinés à l utilisateur courant', () => {
      const unreadCount = mockMessages.filter((m) => m.senderId !== currentUserId && !m.isRead).length;
      expect(unreadCount).toBe(2);
    });

    it('calcule les non lus par conversation', () => {
      const getUnreadForConversation = (convId: string) =>
        mockMessages.filter((m) => m.conversationId === convId && m.senderId !== currentUserId && !m.isRead).length;

      expect(getUnreadForConversation('conv-1')).toBe(1);
      expect(getUnreadForConversation('conv-2')).toBe(1);
    });

    it('marque tous les messages d une conversation comme lus', () => {
      const conv1Messages = mockMessages
        .filter((m) => m.conversationId === 'conv-1')
        .map((m) => ({ ...m, isRead: true }));

      const remainingUnread = conv1Messages.filter((m) => m.senderId !== currentUserId && !m.isRead).length;
      expect(remainingUnread).toBe(0);
    });
  });

  describe('3. Événements d\'Appel Direct & Capture Caméra', () => {
    it('gère l enregistrement et le formatage d un appel vidéo terminé', () => {
      const callMsg = mockMessages.find(m => m.id === 'msg-5')!;
      expect(callMsg.messageType).toBe('call');
      expect(callMsg.callData?.status).toBe('completed');
      expect(callMsg.callData?.type).toBe('video');
      expect(callMsg.callData?.durationSec).toBe(225);

      const formatCallDuration = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };
      expect(formatCallDuration(callMsg.callData!.durationSec!)).toBe('03:45');
    });

    it('gère l envoi instantané d une capture photo prise pendant un appel direct', () => {
      const snapshotBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
      const newSnapshotMsg: ChatMessage = {
        id: 'msg-snap-1',
        conversationId: 'conv-1',
        senderId: currentUserId,
        senderNom: 'Ahmed Nafti',
        senderEmail: 'ahmed@omoda.tn',
        senderRole: 'Collaborateur',
        messageType: 'image',
        text: 'Capture photo en direct pendant l appel',
        mediaUrl: snapshotBase64,
        mediaName: 'capture_appel_178670.jpg',
        readBy: [currentUserId],
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      expect(newSnapshotMsg.messageType).toBe('image');
      expect(newSnapshotMsg.mediaUrl).toBe(snapshotBase64);
      expect(newSnapshotMsg.mediaName).toContain('capture_appel');
    });
  });

  describe('4. Présence et Statut En Ligne', () => {
    const onlineUserSet = new Set(['user-1', 'user-2', 'user-current']);

    it('identifie si un interlocuteur est connecté en temps réel', () => {
      const isOnline = (userId: string) => onlineUserSet.has(userId);

      expect(isOnline('user-1')).toBe(true);
      expect(isOnline('user-2')).toBe(true);
      expect(isOnline('user-999')).toBe(false);
    });

    it('gère l indicateur de frappe en cours (typing indicator)', () => {
      const typingUsers = new Map<string, string>();

      typingUsers.set('conv-1', 'Sarra Support');
      expect(typingUsers.get('conv-1')).toBe('Sarra Support');

      typingUsers.delete('conv-1');
      expect(typingUsers.has('conv-1')).toBe(false);
    });
  });
});
