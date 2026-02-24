import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';

// Change this URL if deployed elsewhere
const SERVER_URL = API_URL;

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
    private workbookSubscribers: ((workbooks: any[]) => void)[] = [];
    private currentUserEmail: string | null = null; // Store current user email to prevent self-duplication in UI

    connect(userData: { name: string; email: string }) {
        if (this.socket) return;

        this.currentUserEmail = userData.email;
        this.socket = io(SERVER_URL);

        this.socket.on('connect', () => {
            console.log('Connected to activity server');
            this.socket?.emit('join_app', userData);
        });

        this.socket.on('users_update', (users: ConnectedUser[]) => {
            this.subscribers.forEach(cb => cb(users));
        });

        this.socket.on('workbooks_update', (workbooks: any[]) => {
            this.workbookSubscribers.forEach(cb => cb(workbooks));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from activity server');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.currentUserEmail = null;
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

    notifyDataUpdate(data: any) {
        this.socket?.emit('data_update', data);
    }

    onDataUpdate(callback: (data: any) => void) {
        this.socket?.on('data_update', callback);
        return () => {
            this.socket?.off('data_update', callback);
        };
    }

    subscribe(callback: (users: ConnectedUser[]) => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    subscribeToWorkbooks(callback: (workbooks: any[]) => void) {
        this.workbookSubscribers.push(callback);
        return () => {
            this.workbookSubscribers = this.workbookSubscribers.filter(cb => cb !== callback);
        };
    }
    
    getCurrentUserEmail() {
        return this.currentUserEmail;
    }
    
    getSocketId() {
        return this.socket?.id;
    }
}

export const socketService = new SocketService();