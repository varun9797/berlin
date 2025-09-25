import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatServices } from '../../../services/chat-services';
import { UserService } from '../../../services/user-service';
import { TokenService } from '../../../services/token-service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-conversations-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './conversations-list.component.html',
    styleUrl: './conversations-list.component.scss'
})
export class ConversationsListComponent implements OnInit, OnDestroy {
    conversations: ConversationObject[] = [];
    onlineUsers: UserObject[] = [];
    combinedList: (ConversationObject | UserObject)[] = [];

    // Remove @Input decorators since we'll get these from services
    currentUserId: string = '';
    currentUserName: string = '';
    
    // Keep @Output for compatibility, but also handle routing internally
    @Output() conversationSelected = new EventEmitter<ConversationObject>();
    @Output() userSelected = new EventEmitter<UserObject>();
    @Output() createGroupClick = new EventEmitter<void>();

    // Create group modal state
    showCreateGroupModal: boolean = false;
    isCreatingGroup: boolean = false;
    groupCreationData: CreateGroupRequest = {
        name: '',
        participantIds: [],
        description: ''
    };
    selectedUsers: string[] = [];

    private subscriptions: Subscription[] = [];

    constructor(
        private chatService: ChatServices,
        private userService: UserService,
        private tokenService: TokenService,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Get current user information from token service
        this.currentUserId = this.tokenService.getUserIdFromToken() || '';
        this.currentUserName = this.tokenService.getUserNameFromToken() || '';

        if (!this.currentUserId) {
            console.error('No user ID found, redirecting to login');
            this.router.navigate(['/login']);
            return;
        }

        // Subscribe to authentication state changes
        const authSub = this.tokenService.isAuthenticated$.subscribe(isAuth => {
            if (!isAuth) {
                console.log('Authentication state changed to false - user logged out');
                // Component will be destroyed when navigating to login
                return;
            }
        });
        this.subscriptions.push(authSub);

        // Initialize chat service connection
        this.chatService.connect(this.currentUserId);
        this.chatService.registeruser({
            userId: this.currentUserId,
            username: this.currentUserName,
            isOnline: true
        });

        this.loadConversations();
        // Removed online users loading since we only show groups
        // this.loadOnlineUsers();
        // this.subscribeToOnlineUsers();
        this.subscribeToConversationUpdates();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    private subscribeToOnlineUsers(): void {
        const sub = this.chatService.onlineUsersSubject.subscribe(users => {
            console.log('Online users from subscription:', users);
            // Ensure users is an array
            const usersArray = Array.isArray(users) ? users : [];
            this.onlineUsers = this.filterCurrentUser(usersArray);
            this.updateCombinedList();
        });
        this.subscriptions.push(sub);
    }

    private loadOnlineUsers(): void {
        const sub = this.userService.getOnlineUsers().subscribe({
            next: (response: any) => {
                console.log('Raw online users response:', response);
                // Handle different response formats
                let users: UserObject[] = [];

                if (Array.isArray(response)) {
                    users = response;
                } else if (response && response.data && Array.isArray(response.data)) {
                    users = response.data;
                } else if (response && response.users && Array.isArray(response.users)) {
                    users = response.users;
                } else {
                    console.warn('Unexpected online users response format:', response);
                    users = [];
                }

                this.onlineUsers = this.filterCurrentUser(users);
                this.updateCombinedList();
            },
            error: (error) => {
                console.error('Error loading online users:', error);
            }
        });
        this.subscriptions.push(sub);
    }

    private filterCurrentUser(users: UserObject[]): UserObject[] {
        // Ensure users is an array before filtering
        if (!Array.isArray(users)) {
            console.warn('Expected users array but got:', users);
            return [];
        }

        return users.filter(user =>
            user.userId !== this.currentUserId &&
            user.username !== this.currentUserName
        );
    }

    private updateCombinedList(): void {
        // Ensure arrays are properly initialized
        const conversations = this.conversations || [];

        // Show only group conversations
        const groupConversations = conversations.filter(conv => conv.type === 'group');

        this.combinedList = [
            // Only show group conversations
            ...groupConversations
        ];

        console.log('Combined list updated (groups only):', {
            groups: groupConversations.length,
            total: this.combinedList.length
        });
    }

    private subscribeToConversationUpdates(): void {
        const sub = this.chatService.conversationsSubject.subscribe(conversations => {
            this.conversations = conversations;
            this.updateCombinedList();
        });
        this.subscriptions.push(sub);
    }

    loadConversations(): void {
        const sub = this.chatService.getUserConversations().subscribe({
            next: (convo: conversationApiResponseType) => {
                const conversations = convo.data;

                if (!conversations || conversations.length < 1) {
                    this.updateCombinedList();
                    return;
                }
                this.conversations = conversations;
                this.chatService.updateConversationsLocally(conversations);
                this.updateCombinedList();
                console.log('Conversations loaded:', this.conversations);
            },
            error: (error) => {
                console.error('Error loading conversations:', error);
            }
        });
        this.subscriptions.push(sub);
    }

    onConversationClick(conversation: ConversationObject): void {
        // Emit for compatibility
        this.conversationSelected.emit(conversation);
        this.chatService.markConversationAsRead(conversation._id);
        
        // Navigate to conversation route
        this.router.navigate(['/chat', conversation._id]);
    }

    onUserClick(user: UserObject): void {
        // Emit for compatibility
        this.userSelected.emit(user);
        
        // For one-to-one chats, we need to find or create a conversation
        // For now, let's create a temporary route with user ID
        this.router.navigate(['/chat', `user-${user.userId}`]);
    }

    onItemClick(item: any): void {
        if (this.isConversation(item)) {
            this.onConversationClick(item);
        } else {
            this.onUserClick(item);
        }
    }

    isConversation(item: any): item is ConversationObject {
        return item && typeof item._id === 'string' &&
            (item.type === 'group' || item.type === 'one-to-one') &&
            !item.isUserItem;
    }

    isUser(item: any): item is UserObject {
        return item && typeof item.userId === 'string' && item.isUserItem;
    }

    onCreateGroupClick(): void {
        this.showCreateGroupModal = true;
        this.resetCreateGroupForm();
    }

    resetCreateGroupForm(): void {
        this.groupCreationData = {
            name: '',
            participantIds: [],
            description: ''
        };
        this.selectedUsers = [];
    }

    // Check if current user is admin of a specific group
    isCurrentUserGroupAdmin(conversation: ConversationObject): boolean {
        if (!conversation || conversation.type !== 'group') return false;
        
        const userParticipant = conversation.participants.find(
            p => p._id === this.currentUserId
        );
        
        return userParticipant?.role === 'admin';
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

    getItemInitials(item: ConversationObject | UserObject): string {
        return this.getInitials(this.getItemName(item));
    }

    getItemName(item: ConversationObject | UserObject): string {
        if (this.isConversation(item)) {
            return this.getConversationName(item);
        } else {
            return item.username;
        }
    }

    trackByItemId = (index: number, item: ConversationObject | UserObject): string => {
        if (this.isConversation(item)) {
            return item._id;
        } else {
            return item.userId; // User ID
        }
    }

    getSenderName(senderId: string): string {
        // Look up sender in group participants or online users
        if (this.conversations.length > 0) {
            for (const conv of this.conversations) {
                const participant = conv.participants.find(p => p._id === senderId);
                if (participant) {
                    return participant.username;
                }
            }
        }

        // Fallback to online users
        const onlineUser = this.onlineUsers.find(user => user.userId === senderId);
        return onlineUser?.username || 'User';
    }

    getGroupMembersPreview(conversation: ConversationObject): string {
        if (conversation.type !== 'group') return '';

        const memberNames = conversation.participants
            .filter(p => p._id !== this.currentUserId) // Exclude current user
            .slice(0, 3) // Show max 3 names
            .map(p => p.username);

        if (memberNames.length === 0) return 'No other members';

        let preview = memberNames.join(', ');
        const remainingCount = conversation.participants.length - memberNames.length - 1; // -1 for current user

        if (remainingCount > 0) {
            preview += ` and ${remainingCount} other${remainingCount > 1 ? 's' : ''}`;
        }

        return preview;
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

    getCurrentUserInitials(): string {
        if (!this.currentUserName) return '?';
        
        const names = this.currentUserName.trim().split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        }
        return names[0].substring(0, 2).toUpperCase();
    }

    onLogout(): void {
        this.tokenService.logout('User logged out manually');
    }

    // Methods for group creation
    openCreateGroupModal(): void {
        this.showCreateGroupModal = true;
    }

    closeCreateGroupModal(): void {
        this.showCreateGroupModal = false;
        this.resetGroupCreationData();
    }

    private resetGroupCreationData(): void {
        this.groupCreationData = {
            name: '',
            participantIds: [],
            description: ''
        };
        this.selectedUsers = [];
    }

    onGroupNameChange(name: string): void {
        this.groupCreationData.name = name;
    }

    onGroupDescriptionChange(description: string): void {
        this.groupCreationData.description = description;
    }

    toggleUserSelection(userId: string): void {
        const index = this.selectedUsers.indexOf(userId);
        if (index === -1) {
            this.selectedUsers.push(userId);
        } else {
            this.selectedUsers.splice(index, 1);
        }

        // Update participantIds in groupCreationData
        this.groupCreationData.participantIds = [...this.selectedUsers];
    }

    isUserSelected(userId: string): boolean {
        return this.selectedUsers.includes(userId);
    }

    createGroup(): void {
        if (!this.groupCreationData.name) {
            return; // Don't allow empty group names
        }

        this.isCreatingGroup = true;

        // Create the group using the chat service
        this.chatService.createGroupConversation(this.groupCreationData).subscribe({
            next: (response: ConversationObject) => {
                console.log('Group created successfully:', response);
                this.isCreatingGroup = false;
                this.closeCreateGroupModal();
                
                // Refresh conversations list
                this.loadConversations();
                
                // Navigate to the new group chat
                this.router.navigate(['/chat', response._id]);
            },
            error: (error: any) => {
                console.error('Error creating group:', error);
                this.isCreatingGroup = false;
            }
        });
    }
}
