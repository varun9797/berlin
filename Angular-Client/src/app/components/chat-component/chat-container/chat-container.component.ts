import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatServices } from '../../../services/chat-services';
import { TokenService } from '../../../services/token-service';
import { TabVisibilityService } from '../../../services/tab-visibility-service';
import { chatPages } from '../../../utils/const';
import { ListComponent } from '../list-component/list-component';
import { ChatBoxComponent } from '../chat-box/chat-box.component';
import { ConversationsListComponent } from '../conversations-list/conversations-list.component';

type ChatPage = typeof chatPages[keyof typeof chatPages];

@Component({
    selector: 'app-chat-container',
    standalone: true,
    imports: [CommonModule, ListComponent, ChatBoxComponent, ConversationsListComponent],
    templateUrl: './chat-container.component.html',
    styleUrl: './chat-container.component.scss'
})
export class ChatContainerComponent implements OnInit, OnDestroy {
    // User data
    userName = '';
    userId = '';
    selectedUser: UserObject = { username: '', userId: '' };
    selectedConversation: ConversationObject | null = null;

    // UI state
    currentPage: ChatPage = chatPages.LIST;
    isChatStarted = false;
    viewMode: 'users' | 'conversations' = 'conversations'; // Toggle between user list and conversations

    // Online users
    onlineUsers: UserObject[] = [];

    // Subscriptions
    private tabVisibilitySubscription?: Subscription;

    // Constants
    readonly chatPages = chatPages;

    constructor(
        private readonly chatService: ChatServices,
        private readonly tokenService: TokenService,
        private readonly tabVisibilityService: TabVisibilityService
    ) { }

    ngOnInit(): void {
        this.initializeUser();
        this.connectToChat();
        this.setupTabVisibilityListener();
        this.setupOnlineUsersListener();
    }

    private initializeUser(): void {
        const token = this.tokenService;
        this.userId = token.getUserIdFromToken() || '';
        this.userName = token.getUserNameFromToken() || '';
    }

    private connectToChat(): void {
        this.chatService.connect(this.userId);
        this.connectChat();
        this.chatService.onMessage();
    }

    private setupTabVisibilityListener(): void {
        this.tabVisibilitySubscription = this.tabVisibilityService
            .onVisibilityChange()
            .subscribe(visible => console.log("Tab visibility changed:", visible));
    }

    private setupOnlineUsersListener(): void {
        this.chatService.getOnlineUsers().subscribe(onlineUsers => {
            this.onlineUsers = onlineUsers;
            this.updateSelectedUserOnlineStatus();
        });
    }

    private updateSelectedUserOnlineStatus(): void {
        if (this.selectedUser.userId) {
            this.selectedUser.isOnline = this.isUserOnline();
        }
    }

    private isUserOnline(): boolean {
        return this.onlineUsers.some(user => user.userId === this.selectedUser.userId);
    }

    private connectChat(): void {
        if (!this.userName.trim()) return;

        this.isChatStarted = true;
        const userObj: UserObject = {
            username: this.userName,
            userId: this.userId
        };
        this.chatService.registeruser(userObj);
    }

    setCurrentPage(page: ChatPage): void {
        this.currentPage = page;
        if (page === chatPages.LIST) {
            this.clearSelectedUser();
        }
    }

    private clearSelectedUser(): void {
        this.selectedUser = { username: '', userId: '' };
    }

    onUserSelected(user: UserObject): void {
        this.selectedUser = { ...user };
        this.updateSelectedUserOnlineStatus();
        this.selectedConversation = null; // Clear conversation when selecting user directly
        this.setCurrentPage(chatPages.CHAT);
    }

    onConversationSelected(conversation: ConversationObject): void {
        this.selectedConversation = conversation;
        this.selectedUser = { username: '', userId: '' }; // Clear direct user selection
        this.setCurrentPage(chatPages.CHAT);
    }

    onCreateGroupRequested(): void {
        // TODO: Implement group creation modal/page
        console.log('Create group requested');
    }

    toggleViewMode(): void {
        this.viewMode = this.viewMode === 'users' ? 'conversations' : 'users';
    }

    onBackToList(): void {
        this.setCurrentPage(chatPages.LIST);
    }

    getInitials(username: string): string {
        if (!username) return '?';
        return username.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    } ngOnDestroy(): void {
        this.chatService.disconnect();
        this.tabVisibilitySubscription?.unsubscribe();
    }
}
