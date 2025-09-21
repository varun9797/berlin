import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatServices } from '../../../services/chat-services';
import { messagePaginationConstants } from '../../../utils/const';

@Component({
    selector: 'app-chat-box',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat-box.component.html',
    styleUrl: './chat-box.component.scss'
})
export class ChatBoxComponent implements OnInit, OnDestroy {
    @Input() selectedUser!: UserObject;
    @Input() selectedConversation?: ConversationObject | null;
    @Input() currentUserId!: string;
    @Output() backToList = new EventEmitter<void>();

    // Message handling
    message = '';
    messages: any[] = [];
    isGroupChat = false;
    chatTitle = '';
    chatSubtitle = '';

    // Subscriptions
    private messageSubscription?: Subscription;
    private groupMessageSubscription?: Subscription;

    @ViewChild('messageSection') private messageSection?: ElementRef;

    constructor(private readonly chatService: ChatServices) { }

    ngOnInit(): void {
        this.initializeChatMode();
        this.loadMessages();
        this.setupMessageListener();
    }

    private initializeChatMode(): void {
        this.isGroupChat = !!this.selectedConversation;

        if (this.isGroupChat && this.selectedConversation) {
            this.chatTitle = this.selectedConversation.name || 'Group Chat';
            this.chatSubtitle = `${this.selectedConversation.participants.length} members`;

            // Join the group room for real-time updates
            this.chatService.joinGroup(this.selectedConversation._id);
        } else if (this.selectedUser) {
            this.chatTitle = this.selectedUser.username;
            this.chatSubtitle = this.selectedUser.isOnline ? 'Online' : 'Offline';
        }
    }

    ngOnDestroy(): void {
        this.messageSubscription?.unsubscribe();
        this.groupMessageSubscription?.unsubscribe();

        // Leave group room if it was a group chat
        if (this.isGroupChat && this.selectedConversation) {
            this.chatService.leaveGroup(this.selectedConversation._id);
        }
    }

    private loadMessages(): void {
        if (this.isGroupChat && this.selectedConversation) {
            this.loadConversationMessages();
        } else if (this.selectedUser.userId) {
            this.loadOfflineMessages();
        }
    }

    private loadConversationMessages(): void {
        if (!this.selectedConversation) return;

        const pagination: MessagePagination = {
            page: messagePaginationConstants.SKIP,
            limit: messagePaginationConstants.LIMIT
        };

        this.chatService.getConversationMessages(this.selectedConversation._id, pagination).subscribe({
            next: (messages) => {
                this.messages = messages || [];
                this.scrollToBottom();
            },
            error: error => console.error('Error loading conversation messages:', error)
        });
    }

    private loadOfflineMessages(): void {
        if (!this.selectedUser.userId) return;

        const pagination: MessagePagination = {
            page: messagePaginationConstants.SKIP,
            limit: messagePaginationConstants.LIMIT
        };

        this.chatService.getOfflineMessages([this.selectedUser.userId], pagination).subscribe({
            next: response => {
                this.messages = response.data || [];
                this.scrollToBottom();
            },
            error: error => console.error('Error loading offline messages:', error)
        });
    }

    private setupMessageListener(): void {
        // Private messages listener
        this.messageSubscription = this.chatService.newMessageBehaviorSubject.subscribe(msg => {
            if (msg && !this.isGroupChat) {
                msg.sender = msg.senderId;
                this.messages.push(msg);
                this.scrollToBottom();
            }
        });

        // Group messages listener
        this.groupMessageSubscription = this.chatService.groupMessageSubject.subscribe(msg => {
            if (msg && this.isGroupChat && this.selectedConversation) {
                if (msg.conversationId === this.selectedConversation._id) {
                    // Transform group message to display format
                    const displayMessage = {
                        _id: Date.now().toString(), // Temporary ID
                        senderId: msg.senderId,
                        sender: msg.senderId,
                        content: msg.message,
                        timestamp: new Date(),
                        conversationId: msg.conversationId
                    };
                    this.messages.push(displayMessage);
                    this.scrollToBottom();
                }
            }
        });
    }

    sendMessage(): void {
        if (!this.isMessageValid()) return;

        if (this.isGroupChat && this.selectedConversation) {
            // Send group message
            const groupMessageObj: GroupMessageObj = {
                conversationId: this.selectedConversation._id,
                senderId: this.currentUserId,
                message: this.message.trim()
            };

            this.chatService.sendGroupMessage(groupMessageObj);
        } else {
            // Send private message
            const messageObj: SendMessageObj = {
                senderId: this.currentUserId,
                reciverId: this.selectedUser.userId,
                message: this.message.trim()
            };

            this.chatService.sendMessage(messageObj);
        }

        this.clearMessage();
        this.scrollToBottom();
    }

    private isMessageValid(): boolean {
        return this.message.trim().length > 0;
    }

    private clearMessage(): void {
        this.message = '';
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messageSection) {
                const element = this.messageSection.nativeElement;
                element.scrollTop = element.scrollHeight;
            }
        }, 50);
    }

    onBackClick(): void {
        this.backToList.emit();
    }

    trackByMessageId(index: number, message: any): any {
        return message._id || index;
    }

    getInitials(username: string): string {
        if (!username) return '?';
        return username.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    getMessageTime(timestamp?: string | Date): string {
        if (!timestamp) return '';

        const date = new Date(timestamp);
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

    getSenderName(senderId: string): string {
        if (!this.selectedConversation) return 'Unknown';

        const participant = this.selectedConversation.participants.find(p => p._id === senderId);
        return participant?.username || 'Unknown User';
    }
}
