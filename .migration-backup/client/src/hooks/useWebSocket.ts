import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  conversationId?: string;
  message?: Message;
  messageIds?: string[];
  userId?: string;
  isTyping?: boolean;
  readBy?: string;
  clientId?: string;
}

interface WebSocketCallbacks {
  onMessage: (conversationId: string, message: Message) => void;
  onTyping?: (conversationId: string, userId: string, isTyping: boolean) => void;
  onReadReceipt?: (conversationId: string, messageIds: string[], readBy: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseWebSocketReturn {
  connected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string, messageIds: string[]) => void;
  broadcastMessage: (conversationId: string, message: Message) => void;
}

export function useWebSocket(enabled: boolean, callbacks: WebSocketCallbacks): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);
  
  // Store callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const connect = useCallback(() => {
    if (!enabled || !shouldReconnect.current) return;

    // Determine WebSocket protocol based on window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setConnected(true);
      reconnectAttempts.current = 0;
      callbacksRef.current.onConnectionChange?.(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('[WebSocket] Message received:', data.type);

        switch (data.type) {
          case 'auth_success':
            console.log('[WebSocket] Authentication successful');
            break;
          
          case 'message_received':
            if (data.conversationId && data.message) {
              callbacksRef.current.onMessage(data.conversationId, data.message);
            }
            break;
          
          case 'user_typing':
            if (data.conversationId && data.userId !== undefined && data.isTyping !== undefined) {
              callbacksRef.current.onTyping?.(data.conversationId, data.userId, data.isTyping);
            }
            break;
          
          case 'messages_read':
            if (data.conversationId && data.messageIds && data.readBy) {
              callbacksRef.current.onReadReceipt?.(data.conversationId, data.messageIds, data.readBy);
            }
            break;
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setConnected(false);
      wsRef.current = null;
      callbacksRef.current.onConnectionChange?.(false);

      // Attempt to reconnect with capped exponential backoff
      if (shouldReconnect.current && enabled) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    wsRef.current = ws;
  }, [enabled]);

  // Handle page visibility changes for better reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !connected && enabled) {
        console.log('[WebSocket] Page visible, attempting to reconnect');
        reconnectAttempts.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connect, connected, enabled]);

  useEffect(() => {
    if (enabled) {
      shouldReconnect.current = true;
      connect();
    }

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, enabled]);

  const joinConversation = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join_conversation', conversationId }));
      console.log('[WebSocket] Joined conversation:', conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_conversation', conversationId }));
      console.log('[WebSocket] Left conversation:', conversationId);
    }
  }, []);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', conversationId, isTyping }));
    }
  }, []);

  const markAsRead = useCallback((conversationId: string, messageIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageIds.length > 0) {
      wsRef.current.send(JSON.stringify({ type: 'mark_read', conversationId, messageIds }));
    }
  }, []);

  const broadcastMessage = useCallback((conversationId: string, message: Message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'new_message', 
        conversationId, 
        messageData: message 
      }));
      console.log('[WebSocket] Broadcasting message to conversation:', conversationId);
    }
  }, []);

  return {
    connected,
    joinConversation,
    leaveConversation,
    sendTyping,
    markAsRead,
    broadcastMessage,
  };
}
