import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";
import { WsConnectionStatus, KitchenWsEvent } from "../types/kitchen.types";

export const useKitchenWebSocket = () => {
  const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>("OFFLINE");
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) {
      setConnectionStatus("OFFLINE");
      return;
    }

    // Derive WS URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/kitchen/?token=${accessToken}`;

    setConnectionStatus("RECONNECTING");
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("CONNECTED");
      reconnectAttemptsRef.current = 0;
      // REST recovery: refetch latest authoritative queue
      queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
    };

    ws.onmessage = (event) => {
      try {
        const payload: KitchenWsEvent = JSON.parse(event.data);
        if (
          payload.event_type === "KITCHEN_ORDER_CREATED" ||
          payload.event_type === "KITCHEN_STATUS_CHANGED" ||
          payload.event_type === "KITCHEN_ORDER_CANCELLED"
        ) {
          queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
        }
      } catch (err) {
        console.error("Error parsing kitchen WS message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus("OFFLINE");
      // Exponential backoff reconnect: 1s, 2s, 4s, max 10s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.warn("Kitchen WebSocket encountered an error:", err);
      ws.close();
    };
  }, [isAuthenticated, accessToken, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { connectionStatus };
};
