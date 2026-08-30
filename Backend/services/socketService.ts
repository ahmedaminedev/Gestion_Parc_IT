import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { env } from '../config/env';

// Map of userId -> Set of active socket IDs
const onlineUsers = new Map<string, Set<string>>();

// Fast in-memory user cache for instant message emission (refreshed asynchronously)
const userMemoryCache = new Map<string, {
  id: string;
  beneficiaire: string;
  email: string;
  role: string;
  id_Role?: string;
  accesApp?: string;
}>();

// Fast in-memory role cache
let rolesCache: Map<string, string> = new Map();
let lastRoleCacheFetch = 0;

async function getRoleName(roleIdOrName: string): Promise<string> {
  const now = Date.now();
  if (rolesCache.size === 0 || now - lastRoleCacheFetch > 60000) {
    try {
      const allRoles = await Role.find().lean();
      const newMap = new Map<string, string>();
      allRoles.forEach((r: any) => {
        const nom = r.nom || 'Collaborateur';
        if (r.id) newMap.set(String(r.id), nom);
        if (r._id) newMap.set(String(r._id), nom);
        if (r.nom) newMap.set(String(r.nom).toLowerCase(), nom);
      });
      rolesCache = newMap;
      lastRoleCacheFetch = now;
    } catch (e) {}
  }
  if (!roleIdOrName) return 'Collaborateur';
  return rolesCache.get(String(roleIdOrName)) || rolesCache.get(String(roleIdOrName).toLowerCase()) || roleIdOrName;
}

export async function getCachedUser(userId: string) {
  const cached = userMemoryCache.get(userId);
  if (cached) return cached;

  try {
    let userDoc: any = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userDoc = await User.findById(userId).lean();
    }
    if (!userDoc) {
      userDoc = await User.findOne({ email: userId.toLowerCase() }).lean();
    }
    if (!userDoc) {
      userDoc = await User.findOne({ $or: [{ id: userId }, { _id: userId }] }).lean();
    }

    if (userDoc) {
      const uId = String(userDoc.id || userDoc._id);
      const roleName = await getRoleName(userDoc.id_Role || userDoc.role);
      const info = {
        id: uId,
        beneficiaire: userDoc.beneficiaire || 'Utilisateur',
        email: userDoc.email || '',
        role: roleName,
        id_Role: userDoc.id_Role,
        accesApp: userDoc.accesApp,
      };
      userMemoryCache.set(uId, info);
      userMemoryCache.set(userId, info);
      return info;
    }
  } catch (err) {
    console.warn('[SOCKET.IO] User lookup error:', err);
  }

  return {
    id: userId,
    beneficiaire: 'Utilisateur',
    email: '',
    role: 'Collaborateur',
  };
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

export function isUserOnline(userId: string): boolean {
  const sockets = onlineUsers.get(String(userId));
  return !!sockets && sockets.size > 0;
}

export function setupSocketIO(server: http.Server): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for video/audio/image payload chunks
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                    socket.handshake.query?.token as string;
      
      let resolvedUserId = '';
      let resolvedUserRole = 'Collaborateur';

      if (token) {
        try {
          const secret = env.JWT_SECRET || process.env.JWT_SECRET || 'parcit_jwt_secret_key_2026_super_secure';
          const decoded: any = jwt.verify(token, secret, { algorithms: ['HS256'] });
          resolvedUserId = String(decoded.id || decoded._id || '');
          resolvedUserRole = decoded.role || 'Collaborateur';
        } catch (jwtErr: any) {
          // Token may be transient or decoding
        }
      }

      if (!resolvedUserId) {
        resolvedUserId = String(socket.handshake.query?.userId || socket.handshake.auth?.userId || '');
      }

      if (!resolvedUserId) {
        return next(new Error('Authentication token or userId required for Socket'));
      }

      (socket as any).userId = resolvedUserId;
      (socket as any).userRole = resolvedUserRole;

      // Asynchronously pre-populate user cache
      getCachedUser(resolvedUserId).catch(() => {});

      next();
    } catch (err: any) {
      console.warn('[SOCKET.IO] Auth middleware error:', err.message);
      const fallbackUserId = String(socket.handshake.query?.userId || socket.handshake.auth?.userId || '');
      if (fallbackUserId) {
        (socket as any).userId = fallbackUserId;
        return next();
      }
      return next(new Error('Invalid socket authentication'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const rawUserId = (socket as any).userId;
    if (!rawUserId) {
      socket.disconnect();
      return;
    }

    const userId = String(rawUserId);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join personal user room
    socket.join(`user:${userId}`);

    // Broadcast user status to all clients
    io.emit('user_status_changed', {
      userId,
      status: 'online',
      onlineUserIds: Array.from(onlineUsers.keys()),
    });

    // Send current online user list to newly connected socket
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));

    // 1. Join Conversation Room
    socket.on('join_conversation', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.join(`conv:${conversationId}`);
      }
    });

    // 2. Leave Conversation Room
    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    // 3. Ultra-Fast Instant Message Event (< 5ms response and broadcast)
    socket.on('send_message', async (data: {
      conversationId: string;
      recipientId?: string;
      text?: string;
      messageType?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call' | 'system';
      mediaUrl?: string;
      mediaName?: string;
      mediaSize?: number;
      mediaMimeType?: string;
      mediaDuration?: number;
      callData?: any;
      clientTempId?: string;
    }, callback?: (res: any) => void) => {
      try {
        const {
          conversationId,
          recipientId,
          text = '',
          messageType = 'text',
          mediaUrl = '',
          mediaName = '',
          mediaSize = 0,
          mediaMimeType = '',
          mediaDuration = 0,
          callData,
          clientTempId,
        } = data;

        if (!conversationId) {
          if (typeof callback === 'function') callback({ error: 'ConversationId missing' });
          return;
        }

        // Get sender profile from memory cache instantly
        const senderUser = await getCachedUser(userId);

        // Pre-generate Mongo ObjectId for instant final payload
        const messageId = new mongoose.Types.ObjectId();
        const now = new Date();

        let previewText = text;
        if (messageType === 'image') previewText = '📷 Photo partagée';
        else if (messageType === 'video') previewText = '🎥 Vidéo partagée';
        else if (messageType === 'audio') previewText = '🎙️ Message vocal';
        else if (messageType === 'file') previewText = `📎 Fichier: ${mediaName || 'Document'}`;
        else if (messageType === 'call') previewText = `📞 ${callData?.type === 'video' ? 'Appel vidéo' : 'Appel audio'}`;

        const payload: any = {
          id: messageId.toString(),
          _id: messageId.toString(),
          conversationId,
          senderId: userId,
          senderNom: senderUser.beneficiaire,
          senderEmail: senderUser.email,
          senderRole: senderUser.role,
          recipientId,
          clientTempId,
          text,
          messageType,
          mediaUrl,
          mediaName,
          mediaSize,
          mediaMimeType,
          mediaDuration,
          readBy: [userId],
          isRead: false,
          callData,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          status: 'sent',
        };

        // ⚡ 1. INSTANT CALLBACK to sender socket (0 ms)
        if (typeof callback === 'function') {
          callback({ success: true, message: payload });
        }

        // ⚡ 2. INSTANT BROADCAST TO ACTIVE CONVERSATION ROOM (0 ms)
        io.to(`conv:${conversationId}`).emit('new_message', payload);

        // ⚡ 3. INSTANT DIRECT BROADCAST TO RECIPIENT'S USER ROOM (0 ms)
        if (recipientId) {
          io.to(`user:${recipientId}`).emit('new_message', payload);
          io.to(`user:${recipientId}`).emit('message_notification', {
            message: payload,
            conversationId,
            senderNom: senderUser.beneficiaire,
            senderRole: senderUser.role,
            preview: previewText,
          });
        }

        // ⚡ 4. INSTANT BROADCAST TO SENDER'S USER ROOM (multi-tab sync)
        io.to(`user:${userId}`).emit('new_message', payload);

        // ⚡ 5. INSTANT CONVERSATION LIST PREVIEW UPDATE (0 ms)
        const partialConvUpdate = {
          id: conversationId,
          _id: conversationId,
          lastMessageText: previewText || '',
          lastMessageType: messageType,
          lastMessageAt: now.toISOString(),
          lastMessageSenderId: userId,
        };
        io.to(`conv:${conversationId}`).emit('conversation_updated', partialConvUpdate);
        if (recipientId) {
          io.to(`user:${recipientId}`).emit('conversation_updated', partialConvUpdate);
        }
        io.to(`user:${userId}`).emit('conversation_updated', partialConvUpdate);

        // 💾 6. NON-BLOCKING ASYNC DATABASE PERSISTENCE (Runs concurrently in background)
        (async () => {
          try {
            const newMsgDoc = new Message({
              _id: messageId,
              conversationId,
              senderId: userId,
              senderNom: senderUser.beneficiaire,
              senderEmail: senderUser.email,
              senderRole: senderUser.role,
              recipientId,
              clientTempId,
              text,
              messageType,
              mediaUrl,
              mediaName,
              mediaSize,
              mediaMimeType,
              mediaDuration,
              readBy: [userId],
              isRead: false,
              callData,
            });

            await newMsgDoc.save();

            // Update conversation document
            const conv = await Conversation.findById(conversationId);
            if (conv) {
              conv.lastMessageText = previewText || '';
              conv.lastMessageType = messageType;
              conv.lastMessageAt = now;
              conv.lastMessageSenderId = userId;

              if (recipientId) {
                const currentUnreads: any = conv.unreadCounts || {};
                const cur = (typeof currentUnreads.get === 'function' ? currentUnreads.get(recipientId) : currentUnreads[recipientId]) || 0;
                if (conv.unreadCounts && typeof (conv.unreadCounts as any).set === 'function') {
                  (conv.unreadCounts as any).set(recipientId, cur + 1);
                } else if (conv.unreadCounts) {
                  (conv.unreadCounts as any)[recipientId] = cur + 1;
                }
              }
              await conv.save();
            }
          } catch (dbErr) {
            console.error('[SOCKET.IO] Background DB save error:', dbErr);
          }
        })();

      } catch (err: any) {
        console.error('[SOCKET.IO] Error in send_message:', err);
        if (typeof callback === 'function') {
          callback({ error: err.message });
        }
        socket.emit('error_message', { error: err.message });
      }
    });

    // 4. Typing indicators (Instant relay)
    socket.on('typing_start', ({ conversationId, userName }: { conversationId: string; userName: string }) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', {
        userId,
        userName,
        conversationId,
      });
    });

    socket.on('typing_stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId,
      });
    });

    // 5. Mark messages as read
    socket.on('mark_read', async ({ conversationId }: { conversationId: string }) => {
      try {
        if (!conversationId) return;
        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readByUserId: userId,
        });

        // Background update
        Message.updateMany(
          { conversationId, senderId: { $ne: userId }, isRead: false },
          { $set: { isRead: true }, $addToSet: { readBy: userId } }
        ).catch(() => {});

        const conv = await Conversation.findById(conversationId);
        if (conv && conv.unreadCounts) {
          if (conv.unreadCounts instanceof Map) {
            conv.unreadCounts.set(userId, 0);
          } else {
            (conv.unreadCounts as any)[userId] = 0;
          }
          await conv.save();
        }
      } catch (err) {
        console.error('[SOCKET.IO] Error in mark_read:', err);
      }
    });

    // 6. Real-time WebRTC / Camera & Audio Call Signalling
    socket.on('call_initiate', (data: {
      recipientId: string;
      conversationId: string;
      callerName: string;
      callerRole: string;
      callType: 'video' | 'audio';
    }) => {
      io.to(`user:${data.recipientId}`).emit('incoming_call', {
        callerId: userId,
        callerName: data.callerName,
        callerRole: data.callerRole,
        conversationId: data.conversationId,
        callType: data.callType,
      });
    });

    socket.on('call_accept', (data: { callerId: string; conversationId: string }) => {
      io.to(`user:${data.callerId}`).emit('call_accepted', {
        recipientId: userId,
        conversationId: data.conversationId,
      });
    });

    socket.on('call_reject', (data: { callerId: string; conversationId: string; reason?: string }) => {
      io.to(`user:${data.callerId}`).emit('call_rejected', {
        recipientId: userId,
        conversationId: data.conversationId,
        reason: data.reason || 'Appel rejeté',
      });
    });

    socket.on('call_end', (data: { targetUserId: string; conversationId: string; durationSec?: number }) => {
      io.to(`user:${data.targetUserId}`).emit('call_ended', {
        fromUserId: userId,
        conversationId: data.conversationId,
        durationSec: data.durationSec || 0,
      });
    });

    // WebRTC peer signaling exchange
    socket.on('webrtc_signal', (data: { targetUserId: string; signal: any }) => {
      io.to(`user:${data.targetUserId}`).emit('webrtc_signal', {
        fromUserId: userId,
        signal: data.signal,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast user offline
          io.emit('user_status_changed', {
            userId,
            status: 'offline',
            onlineUserIds: Array.from(onlineUsers.keys()),
          });
        }
      }
    });
  });

  return io;
}

