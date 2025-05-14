import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';                 // axios instance with auth header

/* ---------------- Types ---------------- */
export interface Notif {
    _id:     string;
    message: string;
    read:    boolean;
    createdAt: string;
}

interface CtxShape {
    list:        Notif[];
    unreadCount: number;
    markAllRead: () => void;
}

const NotificationContext = createContext<CtxShape | null>(null);
export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be inside provider');
    return ctx;
};

/* --------------- Provider --------------- */
export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const qc = useQueryClient();

    /* fetch every 30 s while the tab is focused */
    const { data: list = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn:  async () => (await api.get('/notifications')).data as Notif[],
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
    });

    const unreadCount = list.filter(n => !n.read).length;

    /* mark all unread as read */
    const { mutate: markAllRead } = useMutation({
        mutationFn: async () => {
            const unreadIds = list.filter(n => !n.read).map(n => n._id);
            await Promise.all(unreadIds.map(id => api.patch(`/notifications/${id}/read`)));
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });

    return (
        <NotificationContext.Provider value={{ list, unreadCount, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
};
