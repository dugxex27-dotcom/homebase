import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Notification, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type UnreadNotificationsState = {
  unreadNotifications: Notification[];
  isLoading: boolean;
};

const UnreadNotificationsContext = createContext<UnreadNotificationsState>({
  unreadNotifications: [],
  isLoading: false,
});

export function UnreadNotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const role = (user as User | undefined)?.role;
  const { data = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/unread"],
    enabled: isAuthenticated && (role === "homeowner" || role === "contractor"),
    refetchInterval: 30_000,
  });

  return (
    <UnreadNotificationsContext.Provider value={{ unreadNotifications: data, isLoading }}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}

export function useUnreadNotifications() {
  return useContext(UnreadNotificationsContext);
}