import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserService } from '../../../services/user-service';
import { CommonModule } from '@angular/common';
import { ChatServices } from '../../../services/chat-services';

@Component({
  selector: 'app-list-component',
  imports: [CommonModule],
  templateUrl: './list-component.html',
  styleUrl: './list-component.scss'
})
export class ListComponent {

  groupConversations: ConversationObject[] = [];
  @Input() selectedGroup: ConversationObject | null = null;
  @Output() groupSelected = new EventEmitter<ConversationObject>();
  @Input() currentUserName: string = '';
  @Input() currentUserId: string = '';

  constructor(public userService: UserService,
    public chatServices: ChatServices,
    public chatService: ChatServices) { }

  ngOnInit(): void {
    this.loadGroupConversations();
    this.subscribeToConversationUpdates();
  }

  refreshGroupList(): void {
    this.loadGroupConversations();
  }

  onSelectGroup(group: ConversationObject): void {
    this.groupSelected.emit(group);
  }

  private subscribeToConversationUpdates(): void {
    this.chatService.conversationsSubject.subscribe(conversations => {
      this.groupConversations = conversations.filter(conv => conv.type === 'group');
    });
  }

  loadGroupConversations(): void {
    this.chatService.getUserConversations().subscribe({
      next: (response: conversationApiResponseType) => {
        if (response.data && response.data.length > 0) {
          this.groupConversations = response.data.filter(conv => conv.type === 'group');
          this.selectedGroup = this.groupConversations[0] || null;
        } else {
          this.groupConversations = [];
          this.selectedGroup = null;
        }
      }, 
      error: (error) => {
        console.error('Error fetching group conversations:', error);
        this.groupConversations = [];
      }
    });
  }

  getGroupName(group: ConversationObject): string {
    return group.name || 'Unnamed Group';
  }

  getGroupInitials(groupName: string): string {
    if (!groupName) return 'G';
    return groupName.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getMemberCount(group: ConversationObject): number {
    return group.participants ? group.participants.length : 0;
  }

  getGroupPreview(group: ConversationObject): string {
    const memberCount = this.getMemberCount(group);
    if (memberCount <= 1) return 'No other members';
    
    const otherMembers = group.participants.filter(p => p._id !== this.currentUserId);
    if (otherMembers.length === 0) return 'Just you';
    
    if (otherMembers.length === 1) {
      return `You and ${otherMembers[0].username}`;
    }
    
    return `${memberCount} members`;
  }

  isCurrentUserAdmin(group: ConversationObject): boolean {
    const currentUser = group.participants.find(p => p._id === this.currentUserId);
    return currentUser?.role === 'admin';
  }

  trackByGroupId(index: number, group: ConversationObject): string {
    return group._id || index.toString();
  }
}
