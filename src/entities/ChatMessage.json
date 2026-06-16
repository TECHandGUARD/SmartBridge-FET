/**
 * ====================================================================
 * REALTIME CHAT ENGINE SERVICE HANDLER
 * CORE INFRASTRUCTURE: SUPABASE REALTIME WEBSOCKET SUBSCRIPTIONS
 * COMPLIANCE PROTECTION: DEFENSIVE XSS STRING CONTAINMENT PIPELINES
 * ENHANCED: Typing indicators, Read receipts, File attachments
 * ====================================================================
 */

import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id?: string;
  room_id: string;
  sender_email: string;
  sender_name: string;
  recipient_email?: string | null;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  read_at?: string | null;
  created_at?: string;
}

export interface ChatRoom {
  id: string;
  room_name: string;
  room_type: 'group_study' | 'tutor_direct';
  subject_context?: string;
  created_by?: string;
  created_at?: string;
}

export interface TypingStatus {
  room_id: string;
  user_email: string;
  is_typing: boolean;
  updated_at: string;
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ============================================
// MESSAGE CRUD OPERATIONS
// ============================================

/**
 * Publishes a message securely to the PostgreSQL chat table matrix.
 * The underlying RLS policies guarantee the sender_email MUST match the active login token.
 */
export const sendChatMessage = async (message: ChatMessage): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Validate message content (either text or attachment)
    if (!message.content?.trim() && !message.attachment_url) {
      return { success: false, error: 'Message content or attachment required.' };
    }

    // Defensive truncation and sanitization
    let safeContent = null;
    if (message.content?.trim()) {
      const sanitizedContent = message.content.trim().slice(0, 2000);
      
      // Escape potential HTML/script tags to prevent XSS
      safeContent = sanitizedContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          room_id: message.room_id,
          sender_email: message.sender_email,
          sender_name: message.sender_name,
          recipient_email: message.recipient_email || null,
          content: safeContent,
          attachment_url: message.attachment_url || null,
          attachment_type: message.attachment_type || null,
          read: false
        }
      ]);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Chat transaction pipeline error:', err);
    return { success: false, error: err.message || 'Failed to transmit message securely.' };
  }
};

/**
 * Initializes a live WebSocket subscription to a specific study room channel.
 * Triggers a callback function instantly whenever a new message is appended to the database.
 */
export const subscribeToRoomMessages = (
  roomId: string,
  onNewMessageReceived: (message: ChatMessage) => void
): RealtimeChannel => {
  return supabase
    .channel(`room_stream:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onNewMessageReceived(payload.new as ChatMessage);
      }
    )
    .subscribe();
};

/**
 * Subscribe to message updates (read receipts, edits, deletions)
 */
export const subscribeToMessageUpdates = (
  roomId: string,
  onMessageUpdated: (message: ChatMessage) => void
): RealtimeChannel => {
  return supabase
    .channel(`room_updates:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMessageUpdated(payload.new as ChatMessage);
      }
    )
    .subscribe();
};

/**
 * Historical Query Analyzer: Pulls past communications for a room on initial channel selection.
 */
export const fetchHistoricalRoomMessages = async (roomId: string, limitCount = 50): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed retrieving channel message history archives.', err);
    return [];
  }
};

/**
 * Fetch messages before a certain timestamp (for pagination)
 */
export const fetchMessagesBeforeTimestamp = async (
  roomId: string, 
  beforeTimestamp: string, 
  limitCount = 30
): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .lt('created_at', beforeTimestamp)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return (data || []).reverse();
  } catch (err) {
    console.error('Failed to fetch paginated messages:', err);
    return [];
  }
};

// ============================================
// READ RECEIPTS
// ============================================

/**
 * Mark messages as read for a recipient in a room
 */
export const markMessagesAsRead = async (roomId: string, recipientEmail: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('room_id', roomId)
      .eq('recipient_email', recipientEmail)
      .eq('read', false);
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Mark read error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get unread message count for a user across all rooms
 */
export const getUnreadCount = async (userEmail: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', userEmail)
      .eq('read', false);
    
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('Failed to get unread count:', err);
    return 0;
  }
};

// ============================================
// TYPING INDICATORS
// ============================================

/**
 * Send typing indicator to a room
 */
export const sendTypingIndicator = async (
  roomId: string, 
  userEmail: string, 
  isTyping: boolean
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('chat_typing_status')
      .upsert({
        room_id: roomId,
        user_email: userEmail,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'room_id,user_email'
      });
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Typing indicator error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe to typing indicators in a room
 */
export const subscribeToTypingIndicators = (
  roomId: string,
  onTypingChange: (status: TypingStatus) => void
): RealtimeChannel => {
  return supabase
    .channel(`typing:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_typing_status',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onTypingChange(payload.new as TypingStatus);
      }
    )
    .subscribe();
};

// ============================================
// FILE ATTACHMENTS
// ============================================

/**
 * Upload a file to storage and return public URL
 */
export const uploadChatAttachment = async (
  roomId: string,
  file: File,
  senderEmail: string
): Promise<FileUploadResult> => {
  try {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large. Maximum size is 10MB.' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('video/')) {
      return { success: false, error: 'File type not supported.' };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `chat-attachments/${roomId}/${Date.now()}_${senderEmail}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
    
    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('File upload error:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// CHAT ROOM MANAGEMENT
// ============================================

/**
 * Fetch all available chat rooms
 */
export const fetchChatRooms = async (userEmail?: string): Promise<ChatRoom[]> => {
  try {
    let query = supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: true });

    // Filter rooms user has access to
    if (userEmail) {
      query = query.or(`created_by.eq.${userEmail},room_type.eq.public`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch chat rooms:', err);
    return [];
  }
};

/**
 * Create a new chat room
 */
export const createChatRoom = async (
  roomName: string,
  roomType: 'group_study' | 'tutor_direct',
  createdBy: string,
  subjectContext?: string
): Promise<{ success: boolean; room?: ChatRoom; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        room_name: roomName,
        room_type: roomType,
        subject_context: subjectContext || null,
        created_by: createdBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, room: data };
  } catch (err: any) {
    console.error('Failed to create chat room:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Generate or get existing direct chat room between two users
 */
export const getOrCreateDirectRoom = async (
  user1Email: string,
  user1Name: string,
  user2Email: string,
  user2Name: string
): Promise<{ success: boolean; room_id?: string; error?: string }> => {
  try {
    const roomId = [user1Email, user2Email].sort().join('__');
    
    // Check if room exists
    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('id', roomId)
      .maybeSingle();
    
    if (existing) {
      return { success: true, room_id: roomId };
    }
    
    // Create new room
    const { error } = await supabase
      .from('chat_rooms')
      .insert({
        id: roomId,
        room_name: `${user1Name} & ${user2Name}`,
        room_type: 'tutor_direct',
        created_by: user1Email
      });
    
    if (error) throw error;
    return { success: true, room_id: roomId };
  } catch (err: any) {
    console.error('Failed to create direct room:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// UTILITIES
// ============================================

/**
 * Unsubscribe from a room channel
 */
export const unsubscribeFromRoom = (channel: RealtimeChannel | null): void => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

/**
 * Delete a message (admin/tutor only)
 */
export const deleteMessage = async (
  messageId: string, 
  userRole: string
): Promise<{ success: boolean; error: string | null }> => {
  if (userRole !== 'admin' && userRole !== 'sace_tutor') {
    return { success: false, error: 'Unauthorized to delete messages.' };
  }
  
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Delete message error:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  sendChatMessage,
  subscribeToRoomMessages,
  subscribeToMessageUpdates,
  fetchHistoricalRoomMessages,
  fetchMessagesBeforeTimestamp,
  markMessagesAsRead,
  getUnreadCount,
  sendTypingIndicator,
  subscribeToTypingIndicators,
  uploadChatAttachment,
  fetchChatRooms,
  createChatRoom,
  getOrCreateDirectRoom,
  unsubscribeFromRoom,
  deleteMessage
};
