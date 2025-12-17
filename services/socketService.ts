import { io, Socket } from 'socket.io-client';

// Change this URL if deployed elsewhere
const SERVER_URL = 'https://latext-web-editor-dgpie.onrender.com';

export interface ConnectedUser {
    socketId: string;
    name: string;
    email: string;
    status: 'online' | 'editing';
    currentDoc: string | null; // Doc ID like 'D01'
    lastActivity: string;
    recentChanges: { desc: string; time: string }[];
}

class SocketService {
    private socket: Socket | null = null;
    private subscribers: ((users: ConnectedUser[]) => void)[] = [];

    connect(userData: { name: string; email: string }) {
        if (this.socket) return;

        this.socket = io(SERVER_URL);

        this.socket.on('connect', () => {
            console.log('Connected to activity server');
            this.socket?.emit('join_app', userData);
        });

        this.socket.on('users_update', (users: ConnectedUser[]) => {
            this.subscribers.forEach(cb => cb(users));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from activity server');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    enterDocument(docId: string) {
        this.socket?.emit('enter_document', docId);
    }

    leaveDocument() {
        this.socket?.emit('leave_document');
    }

    reportAction(action: string) {
        this.socket?.emit('user_action', { action, timestamp: new Date().toISOString() });
    }

    subscribe(callback: (users: ConnectedUser[]) => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }
}

export const socketService = new SocketService();