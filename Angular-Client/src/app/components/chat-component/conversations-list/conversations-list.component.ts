import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatServices } from '../../../services/chat-services';
import { UserService } from '../../../services/user-service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-conversations-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './conversations-list.component.html',
    styleUrl: './conversations-list.component.scss'
})
export class ConversationsListComponent implements OnInit, OnDestroy {
    conversations: ConversationObject[] = [];
    @Input() currentUserId: string = '';
    @Input() currentUserName: string = '';
    @Output() conversationSelected = new EventEmitter<ConversationObject>();
    @Output() createGroupClick = new EventEmitter<void>();

    private onlineUsers: UserObject[] = [];
    private subscriptions: Subscription[] = [];

    constructor(
        private chatService: ChatServices,
        private userService: UserService
    ) { }

    ngOnInit(): void {
        // Set current user ID if not provided
        if (!this.currentUserId) {
            this.currentUserId = this.userService.getCurrentUserId();
        }

        this.loadConversations();
        this.subscribeToOnlineUsers();
        this.subscribeToConversationUpdates();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    private subscribeToOnlineUsers(): void {
        const sub = this.chatService.onlineUsersSubject.subscribe(users => {
            this.onlineUsers = users;
        });
        this.subscriptions.push(sub);
    }

    private subscribeToConversationUpdates(): void {
        const sub = this.chatService.conversationsSubject.subscribe(conversations => {
            this.conversations = conversations;
        });
        this.subscriptions.push(sub);
    }

    loadConversations(): void {
        const sub = this.chatService.getUserConversations().subscribe({
            next: (convo: conversationApiResponseType) => {
                const conversations = convo.data;

                if (!conversations || conversations.length < 1) return;
                this.conversations = conversations;
                this.chatService.updateConversationsLocally(conversations);
                console.log('Conversations loaded:', this.conversations);
            },
            error: (error) => {
                console.error('Error loading conversations:', error);
            }
        });
        this.subscriptions.push(sub);
    }

    onConversationClick(conversation: ConversationObject): void {
        this.conversationSelected.emit(conversation);
        this.chatService.markConversationAsRead(conversation._id);
    }

    onCreateGroupClick(): void {
        this.createGroupClick.emit();
    }

    getConversationName(conversation: ConversationObject): string {
        if (conversation.type === 'group') {
            return conversation.name || 'Unnamed Group';
        } else {
            // For one-to-one, show the other participant's name
            const otherParticipant = conversation.participants.find(
                p => p._id !== this.currentUserId
            );
            return otherParticipant?.username || 'Unknown User';
        }
    }

    getConversationAvatar(conversation: ConversationObject): string {
        if (conversation.type === 'group') {
            return conversation.avatar || '';
        } else {
            const otherParticipant = conversation.participants.find(
                p => p._id !== this.currentUserId
            );
            return otherParticipant?.username || 'U';
        }
    }

    getLastMessageTime(conversation: ConversationObject): string {
        if (!conversation.lastMessage?.timestamp) return '';

        const date = new Date(conversation.lastMessage.timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // If today, show time
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // If this week, show day
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }

        // Otherwise show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    getInitials(name: string): string {
        if (!name) return '?';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    isConversationOnline(conversation: ConversationObject): boolean {
        if (conversation.type === 'group') {
            // For groups, we could check if any participant is online
            return true; // Simplified for now
        } else {
            const otherParticipant = conversation.participants.find(p => p._id !== this.currentUserId);
            if (!otherParticipant) return false;

            return this.onlineUsers.some(user => user.userId === otherParticipant._id);
        }
    }

    trackByConversationId(index: number, conversation: ConversationObject): string {
        return conversation._id;
    }
}
