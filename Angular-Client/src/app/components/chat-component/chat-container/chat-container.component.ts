import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatServices } from '../../../services/chat-services';
import { TokenService } from '../../../services/token-service';
import { TabVisibilityService } from '../../../services/tab-visibility-service';
import { chatPages } from '../../../utils/const';
import { ChatBoxComponent } from '../chat-box/chat-box.component';
import { ConversationsListComponent } from '../conversations-list/conversations-list.component';

type ChatPage = typeof chatPages[keyof typeof chatPages];

@Component({
    selector: 'app-chat-container',
    standalone: true,
    imports: [CommonModule, FormsModule, ChatBoxComponent, ConversationsListComponent],
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
    isCreatingGroup = false;
    isCreatingGroupLoading = false;
    groupCreationData: CreateGroupRequest = {
        name: '',
        description: '',
        participantIds: []
    };

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
        console.log('User selected:', user);
        this.selectedUser = { ...user };
        this.updateSelectedUserOnlineStatus();
        this.selectedConversation = null; // Clear conversation when selecting user directly
        this.setCurrentPage(chatPages.CHAT);
    }

    onConversationSelected(conversation: ConversationObject): void {
        console.log('Conversation selected:', conversation);
        this.selectedConversation = conversation;
        this.selectedUser = { username: '', userId: '' }; // Clear direct user selection
        this.setCurrentPage(chatPages.CHAT);
    }

    onCreateGroupRequested(): void {
        console.log('Create group requested');
        this.isCreatingGroup = true;
        this.resetGroupCreationData();
    }

    private resetGroupCreationData(): void {
        this.groupCreationData = {
            name: '',
            description: '',
            participantIds: []
        };
    }

    getAvailableUsers(): UserObject[] {
        return this.onlineUsers.filter(user => user.userId !== this.userId);
    }

    isUserSelected(userId: string): boolean {
        return this.groupCreationData.participantIds.includes(userId);
    }

    toggleUserSelection(userId: string): void {
        const index = this.groupCreationData.participantIds.indexOf(userId);
        if (index > -1) {
            this.groupCreationData.participantIds.splice(index, 1);
        } else {
            this.groupCreationData.participantIds.push(userId);
        }
    }

    canCreateGroup(): boolean {
        return this.groupCreationData.name.trim().length > 0 &&
            this.groupCreationData.participantIds.length > 0;
    }

    cancelGroupCreation(): void {
        this.isCreatingGroup = false;
        this.resetGroupCreationData();
    }

    onModalBackdropClick(event: Event): void {
        // Close modal when clicking outside of it
        this.cancelGroupCreation();
    }

    public async createGroup() {
        if (!this.canCreateGroup()) {
            return;
        }

        this.isCreatingGroupLoading = true;

        try {
            const groupData: CreateGroupRequest = {
                name: this.groupCreationData.name.trim(),
                description: this.groupCreationData.description?.trim() || undefined,
                participantIds: this.groupCreationData.participantIds
            };

            this.chatService.createGroupConversation(groupData).subscribe({
                next: (newGroup) => {
                    // Close modal and reset state
                    this.cancelGroupCreation();

                    // Optionally, select the newly created group
                    this.selectedConversation = newGroup;
                    this.selectedUser = {} as UserObject; // Reset selected user
                    this.currentPage = this.chatPages.CHAT;

                    console.log('Group created successfully:', newGroup);
                },
                error: (error) => {
                    console.error('Error creating group:', error);
                    // You might want to show an error message to the user here
                },
                complete: () => {
                    this.isCreatingGroupLoading = false;
                }
            });
        } catch (error) {
            console.error('Error creating group:', error);
            this.isCreatingGroupLoading = false;
        }
    }

    private refreshConversations(): void {
        // Trigger a refresh of the conversations list
        // This could be done by emitting an event or calling a service method
        console.log('Refreshing conversations...');

        // If there's a method to reload conversations, call it here
        // For now, we'll rely on the real-time updates from socket
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
