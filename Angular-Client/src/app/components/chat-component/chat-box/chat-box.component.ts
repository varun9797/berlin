import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatServices } from '../../../services/chat-services';
import { UserService } from '../../../services/user-service';
import { InvitationService } from '../../../services/invitation-service';
import { messagePaginationConstants } from '../../../utils/const';

@Component({
    selector: 'app-chat-box',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat-box.component.html',
    styleUrl: './chat-box.component.scss'
})
export class ChatBoxComponent implements OnInit, OnDestroy, OnChanges {
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

    // Group rename functionality
    isRenamingGroup = false;
    newGroupName = '';
    isRenameLoading = false;

    // Group delete functionality
    isDeletingGroup = false;

    // Group member management
    isManagingMembers = false;
    isViewingMembers = false; // Track if user is in view-only mode
    availableUsers: UserObject[] = [];
    selectedUsersToAdd: string[] = [];
    isLoadingUsers = false;
    isMemberActionLoading = false;

    // Invitation management
    isManagingInvitations = false;
    invitations: InvitationObject[] = [];
    joinRequests: JoinRequestObject[] = [];
    isInvitationActionLoading = false;
    isCreatingInvitation = false;
    isProcessingRequest = false;
    revokingInvitationId: string | null = null;
    invitationForm = {
        usageLimit: 10,
        expiresInHours: 24
    };

    // Subscriptions
    private messageSubscription?: Subscription;
    private groupMessageSubscription?: Subscription;

    // Scroll management
    showScrollToBottom = false;
    private scrollCheckThrottle?: any;

    @ViewChild('messageSection') private messageSection?: ElementRef;

    constructor(
        private readonly chatService: ChatServices,
        private readonly userService: UserService,
        private readonly invitationService: InvitationService
    ) { }

    ngOnInit(): void {
        this.initializeChatMode();
        this.loadConversationMessages();
        this.setupMessageListener();
        this.setupScrollMonitoring();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Reinitialize when selectedUser or selectedConversation changes
        if (changes['selectedUser'] || changes['selectedConversation']) {
            this.initializeChatMode();
            this.loadConversationMessages();
            this.clearMessage();
            
            // Reset invitation-related states when switching conversations
            this.isManagingInvitations = false;
            this.isCreatingInvitation = false;
            this.isProcessingRequest = false;
            this.revokingInvitationId = null;
            this.invitations = [];
            this.joinRequests = [];
        }
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
                // Only auto-scroll if user is near bottom (for incoming messages)
                if (msg.senderId !== this.currentUserId) {
                    this.conditionalScrollToBottom();
                } else {
                    this.scrollToBottom(); // Always scroll for own messages
                }
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
                    // Only auto-scroll if user is near bottom (for incoming messages)
                    if (msg.senderId !== this.currentUserId) {
                        this.conditionalScrollToBottom();
                    } else {
                        this.scrollToBottom(); // Always scroll for own messages
                    }
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
        // Force scroll to bottom after sending
        setTimeout(() => this.scrollToBottom(), 50);
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
        }, 100);
    }

    private isNearBottom(): boolean {
        if (!this.messageSection) return true;
        
        const element = this.messageSection.nativeElement;
        const threshold = 50; // pixels from bottom
        const position = element.scrollTop + element.clientHeight;
        const height = element.scrollHeight;
        
        return position >= height - threshold;
    }

    private conditionalScrollToBottom(): void {
        if (this.isNearBottom()) {
            this.scrollToBottom();
        } else {
            this.showScrollToBottom = true;
        }
    }

    private setupScrollMonitoring(): void {
        setTimeout(() => {
            if (this.messageSection) {
                const element = this.messageSection.nativeElement;
                element.addEventListener('scroll', () => {
                    if (this.scrollCheckThrottle) {
                        clearTimeout(this.scrollCheckThrottle);
                    }
                    this.scrollCheckThrottle = setTimeout(() => {
                        this.showScrollToBottom = !this.isNearBottom();
                    }, 100);
                });
            }
        }, 500);
    }

    onScrollToBottom(): void {
        this.scrollToBottom();
        this.showScrollToBottom = false;
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

    // Group rename functionality
    startRenameGroup(): void {
        if (!this.isGroupChat || !this.selectedConversation) return;
        
        this.isRenamingGroup = true;
        this.newGroupName = this.selectedConversation.name || '';
    }

    cancelRename(): void {
        this.isRenamingGroup = false;
        this.newGroupName = '';
    }

    canRename(): boolean {
        return this.newGroupName.trim().length > 0 && 
               this.newGroupName.trim() !== (this.selectedConversation?.name || '');
    }

    async renameGroup(): Promise<void> {
        if (!this.canRename() || !this.selectedConversation) return;

        this.isRenameLoading = true;

        try {
            const updateData = {
                name: this.newGroupName.trim()
            };

            this.chatService.updateGroupInfo(this.selectedConversation._id, updateData).subscribe({
                next: (updatedConversation) => {
                    // Update local data
                    if (this.selectedConversation) {
                        this.selectedConversation.name = updatedConversation.name;
                        this.chatTitle = updatedConversation.name || 'Group Chat';
                    }

                    // Close rename mode
                    this.cancelRename();
                    
                    console.log('Group renamed successfully:', updatedConversation);
                },
                error: (error) => {
                    console.error('Error renaming group:', error);
                    // You might want to show an error message to the user here
                },
                complete: () => {
                    this.isRenameLoading = false;
                }
            });
        } catch (error) {
            console.error('Error renaming group:', error);
            this.isRenameLoading = false;
        }
    }

    // Group delete functionality
    async deleteGroup(): Promise<void> {
        if (!this.isGroupChat || !this.selectedConversation || !this.isGroupAdmin()) return;

        const groupName = this.selectedConversation.name || 'this group';
        const memberCount = this.selectedConversation.participants.length;
        
        const confirmDelete = confirm(
            `⚠️ DELETE GROUP: "${groupName}"\n\n` +
            `This will permanently delete:\n` +
            `• The group and all its messages\n` +
            `• Remove all ${memberCount} members from the group\n` +
            `• Cannot be undone\n\n` +
            `Are you absolutely sure you want to continue?`
        );
        
        if (!confirmDelete) return;

        this.isDeletingGroup = true;

        try {
            this.chatService.deleteGroup(this.selectedConversation._id).subscribe({
                next: (response: { message: string }) => {
                    console.log('Group deleted successfully:', response);
                    
                    // Remove the conversation from local list
                    this.chatService.removeConversationLocally(this.selectedConversation!._id);
                    
                    // Navigate back to the conversations list
                    this.backToList.emit();
                    
                    // Show success message
                    alert(`Group "${groupName}" has been deleted successfully.`);
                },
                error: (error: any) => {
                    console.error('Error deleting group:', error);
                    alert('Failed to delete the group. Please try again.');
                },
                complete: () => {
                    this.isDeletingGroup = false;
                }
            });
        } catch (error) {
            console.error('Error deleting group:', error);
            this.isDeletingGroup = false;
            alert('Failed to delete the group. Please try again.');
        }
    }

    // Check if current user is admin of the group
    isGroupAdmin(): boolean {
        if (!this.selectedConversation || !this.isGroupChat) return false;
        
        const userParticipant = this.selectedConversation.participants.find(
            p => p._id === this.currentUserId
        );
        
        return userParticipant?.role === 'admin';
    }

    // Check if a specific user is admin of the group
    isUserAdmin(userId: string): boolean {
        if (!this.selectedConversation || !this.isGroupChat) return false;
        
        const userParticipant = this.selectedConversation.participants.find(
            p => p._id === userId
        );
        
        return userParticipant?.role === 'admin';
    }

    // Member Management Methods
    async startManageMembers(): Promise<void> {
        if (!this.isGroupChat || !this.selectedConversation) return;
        
        this.isManagingMembers = true;
        this.isViewingMembers = false; // Admin mode
        this.selectedUsersToAdd = [];
        await this.loadAvailableUsers();
    }

    // View Members Method for Non-Admin Users
    startViewMembers(): void {
        if (!this.isGroupChat || !this.selectedConversation) return;
        
        this.isManagingMembers = true;
        this.isViewingMembers = true; // View-only mode
        this.selectedUsersToAdd = [];
        // No need to load available users in view mode
    }

    private async loadAvailableUsers(): Promise<void> {
        if (!this.selectedConversation) return;

        this.isLoadingUsers = true;
        try {
            this.userService.getOnlineUsers().subscribe({
                next: (response: any) => {
                    let users: UserObject[] = [];
                    if (Array.isArray(response)) {
                        users = response;
                    } else if (response && response.data && Array.isArray(response.data)) {
                        users = response.data;
                    } else if (response && response.users && Array.isArray(response.users)) {
                        users = response.users;
                    }

                    // Filter out users who are already in the group and current user
                    const existingUserIds = this.selectedConversation!.participants.map(p => p._id);
                    this.availableUsers = users.filter(user => 
                        !existingUserIds.includes(user.userId) && 
                        user.userId !== this.currentUserId
                    );
                },
                error: (error) => {
                    console.error('Error loading available users:', error);
                },
                complete: () => {
                    this.isLoadingUsers = false;
                }
            });
        } catch (error) {
            console.error('Error loading available users:', error);
            this.isLoadingUsers = false;
        }
    }

    cancelManageMembers(): void {
        this.isManagingMembers = false;
        this.isViewingMembers = false; // Reset view mode
        this.selectedUsersToAdd = [];
        this.availableUsers = [];
    }

    toggleUserSelection(userId: string): void {
        const index = this.selectedUsersToAdd.indexOf(userId);
        if (index > -1) {
            this.selectedUsersToAdd.splice(index, 1);
        } else {
            this.selectedUsersToAdd.push(userId);
        }
    }

    isUserSelected(userId: string): boolean {
        return this.selectedUsersToAdd.includes(userId);
    }

    async addSelectedUsers(): Promise<void> {
        if (!this.selectedConversation || this.selectedUsersToAdd.length === 0) return;

        this.isMemberActionLoading = true;
        try {
            this.chatService.addParticipantsToGroup(
                this.selectedConversation._id, 
                this.selectedUsersToAdd
            ).subscribe({
                next: (response) => {
                    console.log('Users added successfully:', response);
                    // Refresh conversation data
                    this.refreshConversationData();
                    this.cancelManageMembers();
                },
                error: (error) => {
                    console.error('Error adding users:', error);
                },
                complete: () => {
                    this.isMemberActionLoading = false;
                }
            });
        } catch (error) {
            console.error('Error adding users:', error);
            this.isMemberActionLoading = false;
        }
    }

    async removeMember(participantId: string): Promise<void> {
        if (!this.selectedConversation || participantId === this.currentUserId) return;

        const participant = this.selectedConversation.participants.find(p => p._id === participantId);
        if (!participant) return;

        const confirmRemove = confirm(`Remove ${participant.username} from the group?`);
        if (!confirmRemove) return;

        this.isMemberActionLoading = true;
        try {
            this.chatService.removeParticipantFromGroup(
                this.selectedConversation._id,
                participantId
            ).subscribe({
                next: (response) => {
                    console.log('User removed successfully:', response);
                    // Update local conversation data
                    if (this.selectedConversation) {
                        this.selectedConversation.participants = this.selectedConversation.participants.filter(
                            p => p._id !== participantId
                        );
                        this.chatSubtitle = `${this.selectedConversation.participants.length} members`;
                    }
                },
                error: (error) => {
                    console.error('Error removing user:', error);
                },
                complete: () => {
                    this.isMemberActionLoading = false;
                }
            });
        } catch (error) {
            console.error('Error removing user:', error);
            this.isMemberActionLoading = false;
        }
    }

    private refreshConversationData(): void {
        // Reload conversations to get updated participant list
        this.chatService.getUserConversations().subscribe({
            next: (response) => {
                const conversations = response.data;
                const updatedConversation = conversations.find(c => c._id === this.selectedConversation?._id);
                if (updatedConversation) {
                    this.selectedConversation = updatedConversation;
                    this.chatSubtitle = `${updatedConversation.participants.length} members`;
                }
            },
            error: (error) => {
                console.error('Error refreshing conversation data:', error);
            }
        });
    }

    canManageMembers(): boolean {
        return this.isGroupChat && this.isGroupAdmin();
    }

    getUserInitials(username: string): string {
        return this.getInitials(username);
    }

    // Invitation Management Methods
    canManageInvitations(): boolean {
        return this.isGroupChat && this.isGroupAdmin();
    }

    async startManageInvitations(): Promise<void> {
        if (!this.canManageInvitations() || !this.selectedConversation) return;

        console.log('Starting invitation management...');
        this.isManagingInvitations = true;
        this.isInvitationActionLoading = true;

        let invitationsLoaded = false;
        let joinRequestsLoaded = false;

        const checkLoadingComplete = () => {
            console.log('Checking loading complete:', { invitationsLoaded, joinRequestsLoaded });
            if (invitationsLoaded && joinRequestsLoaded) {
                console.log('Both loaded, setting isInvitationActionLoading to false');
                this.isInvitationActionLoading = false;
            }
        };

        try {
            // Load existing invitations
            this.invitationService.getGroupInvitations(this.selectedConversation._id).subscribe({
                next: (response: { data: InvitationObject[] }) => {
                    console.log('Invitations loaded:', response.data);
                    this.invitations = response.data;
                },
                error: (error: any) => {
                    console.error('Error loading invitations:', error);
                    invitationsLoaded = true;
                    checkLoadingComplete();
                },
                complete: () => {
                    console.log('Invitations loading completed');
                    invitationsLoaded = true;
                    checkLoadingComplete();
                }
            });

            // Load pending join requests
            this.invitationService.getGroupJoinRequests(this.selectedConversation._id).subscribe({
                next: (response: { data: JoinRequestObject[] }) => {
                    console.log('Join requests loaded:', response.data);
                    this.joinRequests = response.data;
                },
                error: (error: any) => {
                    console.error('Error loading join requests:', error);
                    joinRequestsLoaded = true;
                    checkLoadingComplete();
                },
                complete: () => {
                    console.log('Join requests loading completed');
                    joinRequestsLoaded = true;
                    checkLoadingComplete();
                }
            });
        } catch (error) {
            console.error('Error starting invitation management:', error);
            this.isInvitationActionLoading = false;
        }
    }

    createInvitation(): void {
        if (!this.selectedConversation) return;

        this.isCreatingInvitation = true;

        const request: CreateInvitationRequest = {
            conversationId: this.selectedConversation._id,
            expiresInDays: this.invitationForm.expiresInHours / 24,
            maxUses: this.invitationForm.usageLimit
        };

        console.log('Creating invitation...', request);

        this.invitationService.createGroupInvitation(request).subscribe({
            next: (response: { data: InvitationObject; message: string }) => {
                console.log('Invitation created:', response);
                this.invitations.unshift(response.data);
                
                // Copy link to clipboard
                const invitationLink = response.data.inviteLink;
                navigator.clipboard.writeText(invitationLink).then(() => {
                    alert('Invitation link copied to clipboard!');
                }).catch(err => {
                    console.error('Could not copy link:', err);
                    alert(`Invitation created! Link: ${invitationLink}`);
                });
            },
            error: (error: any) => {
                console.error('Error creating invitation:', error);
                alert('Failed to create invitation');
            },
            complete: () => {
                console.log('Create invitation request completed');
                this.isCreatingInvitation = false;
            }
        });
    }

    processJoinRequest(requestId: string, action: 'approve' | 'reject'): void {
        this.isProcessingRequest = true;

        this.invitationService.processJoinRequest(requestId, action).subscribe({
            next: (response) => {
                console.log(`Join request ${action}d:`, response);
                
                // Remove processed request from list
                this.joinRequests = this.joinRequests.filter(req => req._id !== requestId);
                
                if (action === 'approve') {
                    // Refresh conversation data to show new member
                    this.refreshConversationData();
                }
            },
            error: (error) => {
                console.error(`Error ${action}ing join request:`, error);
                alert(`Failed to ${action} join request`);
            },
            complete: () => {
                this.isProcessingRequest = false;
            }
        });
    }

    deactivateInvitation(invitationId: string): void {
        const confirmDeactivate = confirm('Revoke this invitation link?');
        if (!confirmDeactivate) return;

        this.revokingInvitationId = invitationId;

        this.invitationService.revokeInvitation(invitationId).subscribe({
            next: (response: { message: string }) => {
                console.log('Invitation revoked:', response);
                
                // Remove invitation from list
                this.invitations = this.invitations.filter(inv => inv._id !== invitationId);
            },
            error: (error: any) => {
                console.error('Error revoking invitation:', error);
                alert('Failed to revoke invitation');
            },
            complete: () => {
                this.revokingInvitationId = null;
            }
        });
    }

    copyInvitationLink(invitation: InvitationObject): void {
        const invitationLink = invitation.inviteLink;
        navigator.clipboard.writeText(invitationLink).then(() => {
            alert('Invitation link copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy link:', err);
            alert(`Link: ${invitationLink}`);
        });
    }

    stopManageInvitations(): void {
        this.isManagingInvitations = false;
        this.invitations = [];
        this.joinRequests = [];
    }

    getTimeAgo(dateString: string | Date): string {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }
    }

    isInvitationExpired(expiresAt: string | Date): boolean {
        const date = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
        return date < new Date();
    }
}
