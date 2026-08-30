import { Router } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { verifyToken } from '../middleware/auth';
import { getOnlineUserIds, getCachedUser } from '../services/socketService';

const router = Router();
router.use(verifyToken);

// 0. GET /api/messages/online-users
router.get('/online-users', (_req: any, res) => {
  try {
    const userIds = getOnlineUserIds();
    res.json({ onlineUserIds: userIds });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: Check if a user has IT Manager / Admin privileges
async function isUserResponsableIT(userDoc: any, userRoleClaim?: string): Promise<boolean> {
  if (!userDoc && userRoleClaim) {
    const claim = userRoleClaim.toLowerCase();
    return claim.includes('responsable it') || claim.includes('admin') || claim.includes('dsi');
  }
  if (!userDoc) return false;
  if (userDoc.accesApp === 'GLOBAL_BACKOFFICE') return true;
  
  if (userDoc.role) {
    const rLower = String(userDoc.role).toLowerCase();
    if (rLower.includes('responsable it') || rLower.includes('admin') || rLower.includes('dsi')) {
      return true;
    }
  }

  if (userDoc.id_Role) {
    try {
      const allRoles = await Role.find();
      const matched = allRoles.find(
        (r) =>
          r.id === userDoc.id_Role ||
          r._id?.toString() === userDoc.id_Role ||
          r.nom.toLowerCase() === String(userDoc.id_Role).toLowerCase()
      );
      if (matched) {
        const nom = matched.nom.toLowerCase();
        if (nom.includes('responsable it') || nom.includes('administrateur') || nom.includes('dsi') || matched.isSystem) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Role check error:', e);
    }
  }
  return false;
}

// 1. GET /api/messages/contacts
// Responsables IT can talk to everyone (IT + Collaborators).
// Collaborators can ONLY see and contact Responsables IT (Collaborator <-> Collaborator is strictly prohibited).
router.get('/contacts', async (req: any, res) => {
  try {
    const currentUserId = String(req.user.id);
    let currentUser = await User.findById(currentUserId);
    if (!currentUser && req.user.email) {
      currentUser = await User.findOne({ email: req.user.email.toLowerCase() });
    }

    const isCurrentIT = await isUserResponsableIT(currentUser, req.user.role);
    
    // Fetch all active users from database
    const allUsers = await User.find({
      statut: { $ne: 'Inactif' }
    });

    const allRoles = await Role.find();
    const roleMap = new Map<string, string>();
    allRoles.forEach((r) => {
      roleMap.set(r.id, r.nom);
      roleMap.set(r._id.toString(), r.nom);
      roleMap.set(r.nom.toLowerCase(), r.nom);
    });

    const contactsList = [];

    for (const u of allUsers) {
      const uId = String(u.id || u._id);
      // Skip self
      if (uId === currentUserId || (currentUser && u.email?.toLowerCase() === currentUser.email?.toLowerCase())) {
        continue;
      }

      const uRoleName = roleMap.get(u.id_Role) || roleMap.get(String(u.id_Role).toLowerCase()) || (u as any).role || 'Collaborateur';
      const isTargetIT = u.accesApp === 'GLOBAL_BACKOFFICE' || 
                         uRoleName.toLowerCase().includes('responsable it') || 
                         uRoleName.toLowerCase().includes('administrateur') ||
                         uRoleName.toLowerCase().includes('admin') ||
                         uRoleName.toLowerCase().includes('dsi');

      // If current user is NOT an IT Manager, they are ONLY allowed to see IT Managers
      if (!isCurrentIT && !isTargetIT) {
        continue; // Forbidden contact: Collaborateur cannot contact another Collaborateur
      }

      contactsList.push({
        id: uId,
        beneficiaire: u.beneficiaire,
        email: u.email,
        role: uRoleName,
        isIT: isTargetIT,
        derniereActivite: u.derniereActivite || 'Récemment',
        statut: u.statut || 'Actif',
        accesApp: u.accesApp,
      });
    }

    res.json(contactsList);
  } catch (err: any) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ message: err.message });
  }
});

// 2. GET /api/messages/conversations
router.get('/conversations', async (req: any, res) => {
  try {
    const currentUserId = req.user.id;
    const conversations = await Conversation.find({
      participants: currentUserId,
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    const formatted = conversations.map(c => {
      const convObj = c.toJSON();
      const unreadMap = convObj.unreadCounts || {};
      const unread = unreadMap[currentUserId] || 0;
      const otherParticipant = convObj.participantDetails?.find(
        (p: any) => p.userId !== currentUserId
      ) || { userId: '', nom: 'Contact', email: '', role: 'Utilisateur' };

      return {
        ...convObj,
        unreadCount: unread,
        otherParticipant,
      };
    });

    res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: err.message });
  }
});

// 3. POST /api/messages/conversations - Start or retrieve direct chat
router.post('/conversations', async (req: any, res) => {
  try {
    const currentUserId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'Le destinataire est requis' });
    }

    if (recipientId === currentUserId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas démarrer une discussion avec vous-même' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(recipientId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const isCurrentIT = await isUserResponsableIT(currentUser);
    const isTargetIT = await isUserResponsableIT(targetUser);

    // MATRIX RESTRICTION VALIDATION:
    // IT <-> IT (OK)
    // IT <-> Collaborateur (OK)
    // Collaborateur <-> Collaborateur (FORBIDDEN)
    if (!isCurrentIT && !isTargetIT) {
      return res.status(403).json({
        message: 'Communication interdite : Les collaborateurs ne sont autorisés à communiquer qu\'avec les Responsables IT.',
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId], $size: 2 },
    });

    if (!conversation) {
      // Find role names
      const allRoles = await Role.find();
      const roleMap = new Map<string, string>();
      allRoles.forEach(r => roleMap.set(r.id, r.nom));

      const currentRole = roleMap.get(currentUser.id_Role) || (isCurrentIT ? 'Responsable IT' : 'Collaborateur');
      const targetRole = roleMap.get(targetUser.id_Role) || (isTargetIT ? 'Responsable IT' : 'Collaborateur');

      conversation = new Conversation({
        participants: [currentUserId, recipientId],
        participantDetails: [
          {
            userId: currentUserId,
            nom: currentUser.beneficiaire,
            email: currentUser.email,
            role: currentRole,
          },
          {
            userId: recipientId,
            nom: targetUser.beneficiaire,
            email: targetUser.email,
            role: targetRole,
          },
        ],
        lastMessageText: 'Conversation initialisée',
        lastMessageType: 'system',
        lastMessageAt: new Date(),
        unreadCounts: { [recipientId]: 0, [currentUserId]: 0 },
      });

      await conversation.save();
    }

    const convObj = conversation.toJSON();
    const otherParticipant = convObj.participantDetails?.find(
      (p: any) => p.userId !== currentUserId
    );

    res.json({
      ...convObj,
      unreadCount: convObj.unreadCounts?.[currentUserId] || 0,
      otherParticipant,
    });
  } catch (err: any) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ message: err.message });
  }
});

// 4. GET /api/messages/conversations/:id/messages
router.get('/conversations/:id/messages', async (req: any, res) => {
  try {
    const currentUserId = req.user.id;
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'Accès non autorisé à cette conversation' });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err: any) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: err.message });
  }
});

// 5. POST /api/messages/conversations/:id/messages
router.post('/conversations/:id/messages', async (req: any, res) => {
  try {
    const currentUserId = req.user.id;
    const conversationId = req.params.id;
    const {
      text,
      messageType = 'text',
      mediaUrl,
      mediaName,
      mediaSize,
      mediaMimeType,
      mediaDuration,
      callData,
      clientTempId,
    } = req.body;

    const [conversation, senderUser] = await Promise.all([
      Conversation.findById(conversationId),
      getCachedUser(currentUserId),
    ]);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'Accès non autorisé à cette conversation' });
    }

    const recipientId = conversation.participants.find(p => p !== currentUserId);
    const messageId = new mongoose.Types.ObjectId();
    const now = new Date();

    let previewText = text;
    if (messageType === 'image') previewText = '📷 Photo partagée';
    else if (messageType === 'video') previewText = '🎥 Vidéo partagée';
    else if (messageType === 'audio') previewText = '🎙️ Message vocal';
    else if (messageType === 'file') previewText = `📎 Fichier: ${mediaName || 'Document'}`;
    else if (messageType === 'call') {
      const typeLabel = callData?.type === 'video' ? 'Appel vidéo' : 'Appel vocal';
      const durSec = callData?.durationSec || 0;
      if (callData?.status === 'missed') {
        previewText = `📞 ${typeLabel} manqué`;
      } else if (callData?.status === 'rejected') {
        previewText = `📞 ${typeLabel} refusé`;
      } else if (durSec > 0) {
        const m = Math.floor(durSec / 60);
        const s = durSec % 60;
        const durFormatted = m > 0 ? `${m}m ${s}s` : `${s}s`;
        previewText = `📞 ${typeLabel} (${durFormatted})`;
      } else {
        previewText = `📞 ${typeLabel}`;
      }
    }

    const payload = {
      id: messageId.toString(),
      _id: messageId.toString(),
      conversationId,
      senderId: currentUserId,
      senderNom: senderUser.beneficiaire,
      senderEmail: senderUser.email,
      senderRole: senderUser.role,
      recipientId,
      clientTempId,
      text: text || '',
      messageType,
      mediaUrl: mediaUrl || '',
      mediaName: mediaName || '',
      mediaSize: mediaSize || 0,
      mediaMimeType: mediaMimeType || '',
      mediaDuration: mediaDuration || 0,
      readBy: [currentUserId],
      isRead: false,
      callData,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: 'sent',
    };

    // ⚡ INSTANT SOCKET BROADCAST (0 ms)
    if (req.io) {
      req.io.to(`conv:${conversationId}`).emit('new_message', payload);
      if (recipientId) {
        req.io.to(`user:${recipientId}`).emit('new_message', payload);
        req.io.to(`user:${recipientId}`).emit('message_notification', {
          message: payload,
          conversationId,
          senderNom: senderUser.beneficiaire,
          senderRole: senderUser.role,
          preview: previewText,
        });
      }
      req.io.to(`user:${currentUserId}`).emit('new_message', payload);

      const partialConvUpdate = {
        id: conversationId,
        _id: conversationId,
        lastMessageText: previewText || '',
        lastMessageType: messageType,
        lastMessageAt: now.toISOString(),
        lastMessageSenderId: currentUserId,
      };
      req.io.to(`conv:${conversationId}`).emit('conversation_updated', partialConvUpdate);
      if (recipientId) {
        req.io.to(`user:${recipientId}`).emit('conversation_updated', partialConvUpdate);
      }
      req.io.to(`user:${currentUserId}`).emit('conversation_updated', partialConvUpdate);
    }

    // ⚡ INSTANT HTTP RESPONSE (0 ms)
    res.status(201).json(payload);

    // 💾 NON-BLOCKING ASYNC DATABASE SAVE
    (async () => {
      try {
        const newMessage = new Message({
          _id: messageId,
          conversationId,
          senderId: currentUserId,
          senderNom: senderUser.beneficiaire,
          senderEmail: senderUser.email,
          senderRole: senderUser.role,
          recipientId,
          clientTempId,
          text: text || '',
          messageType,
          mediaUrl: mediaUrl || '',
          mediaName: mediaName || '',
          mediaSize: mediaSize || 0,
          mediaMimeType: mediaMimeType || '',
          mediaDuration: mediaDuration || 0,
          readBy: [currentUserId],
          isRead: false,
          callData,
        });

        await newMessage.save();

        const currentUnreads: any = conversation.unreadCounts || {};
        const recipientUnread = recipientId
          ? ((typeof currentUnreads.get === 'function' ? currentUnreads.get(recipientId) : currentUnreads[recipientId]) || 0)
          : 0;

        conversation.lastMessageText = previewText || '';
        conversation.lastMessageType = messageType;
        conversation.lastMessageAt = now;
        conversation.lastMessageSenderId = currentUserId;

        if (recipientId) {
          if (conversation.unreadCounts && typeof (conversation.unreadCounts as any).set === 'function') {
            (conversation.unreadCounts as any).set(recipientId, recipientUnread + 1);
          } else if (conversation.unreadCounts) {
            (conversation.unreadCounts as any)[recipientId] = recipientUnread + 1;
          }
        }

        await conversation.save();
      } catch (dbErr) {
        console.error('[REST] Background save message error:', dbErr);
      }
    })();

  } catch (err: any) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: err.message });
  }
});

// 6. PUT /api/messages/conversations/:id/read - Mark messages in conversation as read
router.put('/conversations/:id/read', async (req: any, res) => {
  try {
    const currentUserId = req.user.id;
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    // Reset unread count for current user
    if (conversation.unreadCounts) {
      if (conversation.unreadCounts instanceof Map) {
        conversation.unreadCounts.set(currentUserId, 0);
      } else {
        (conversation.unreadCounts as any)[currentUserId] = 0;
      }
      await conversation.save();
    }

    // Update messages
    await Message.updateMany(
      { conversationId, senderId: { $ne: currentUserId }, isRead: false },
      { $set: { isRead: true }, $addToSet: { readBy: currentUserId } }
    );

    res.json({ success: true, message: 'Messages marqués comme lus' });
  } catch (err: any) {
    console.error('Error marking as read:', err);
    res.status(500).json({ message: err.message });
  }
});

// 7. GET /api/messages/unread-count - Total unread messages for user
router.get('/unread-count', async (req: any, res) => {
  try {
    const currentUserId = req.user.id;
    const count = await Message.countDocuments({
      recipientId: currentUserId,
      isRead: false,
    });
    res.json({ unreadCount: count });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
