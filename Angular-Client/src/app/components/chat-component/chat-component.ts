import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatServices } from '../../services/chat-services';
import { UserService } from '../../services/user-service';
import { TokenService } from './../../services/token-service';
import { chatPages, messagePaginationConstants } from '../../utils/const';
import { ListComponent } from './list-component/list-component';
import { TabVisibilityService } from '../../services/tab-visibility-service';
import { Subscription } from 'rxjs';


type ChatPage = typeof chatPages[keyof typeof chatPages];

@Component({
  selector: 'app-chat-component',
  imports: [FormsModule, CommonModule, ListComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  // Message handling
  message = '';
  messages: any[] = [];

  // User data
  userName = '';
  userId = '';
  selectedUser: UserObject = { username: '', userId: '' };

  // UI state
  currentPage: ChatPage = chatPages.LIST;
  isChatStarted = false;

  // Online users
  onlineUsers: UserObject[] = [];

  // Subscriptions
  private tabVisibilitySubscription?: Subscription;

  // Constants
  readonly chatPages = chatPages;

  @ViewChild('messageSection') private messageSection?: ElementRef;

  constructor(
    private readonly chatService: ChatServices,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly tabVisibilityService: TabVisibilityService
  ) { }


  ngOnInit(): void {
    this.initializeUser();
    this.connectToChat();
    this.setupMessageListener();
    this.setupTabVisibilityListener();
  }

  private initializeUser(): void {
    const token = this.tokenService;
    this.userId = token.getUserIdFromToken() || '';
    this.userName = token.getUserNameFromToken() || '';
  }

  private connectToChat(): void {
    this.chatService.connect(this.userId);
    this.connectChat();
    this.setIsUserOnline();
    this.chatService.onMessage();
  }

  private setupMessageListener(): void {
    this.chatService.newMessageBehaviorSubject.subscribe(msg => {
      if (msg) {
        msg.sender = msg.senderId;
        this.messages.push(msg);
        this.scrollToBottom();
      }
    });
  }

  private setupTabVisibilityListener(): void {
    this.tabVisibilitySubscription = this.tabVisibilityService
      .onVisibilityChange()
      .subscribe(visible => console.log("Tab visibility changed:", visible));
  }


  private setIsUserOnline(): void {
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

  setCurrentPage(page: ChatPage): void {
    this.currentPage = page;
    this.clearSelectedUser();
  }

  private clearSelectedUser(): void {
    this.selectedUser = { username: '', userId: '' };
  }

  onUserSelected(user: UserObject): void {
    this.setCurrentPage(chatPages.CHAT);
    this.selectedUser = { ...user };
    this.updateSelectedUserOnlineStatus();
    this.loadOfflineMessages(user.userId);
  }

  private loadOfflineMessages(userId: string): void {
    const pagination: MessagePagination = {
      page: messagePaginationConstants.SKIP,
      limit: messagePaginationConstants.LIMIT
    };

    this.chatService.getOfflineMessages([userId], pagination).subscribe({
      next: response => {
        this.messages = response.data || [];
        this.scrollToBottom();
      },
      error: error => console.error('Error loading offline messages:', error)
    });
  }

  sendMessage(): void {
    if (!this.isMessageValid()) return;

    const messageObj: SendMessageObj = {
      senderId: this.userId,
      reciverId: this.selectedUser.userId,
      message: this.message.trim()
    };

    this.chatService.sendMessage(messageObj);
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

  private connectChat(): void {
    if (!this.userName.trim()) return;

    this.isChatStarted = true;
    const userObj: UserObject = {
      username: this.userName,
      userId: this.userId
    };
    this.chatService.registeruser(userObj);
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.tabVisibilitySubscription?.unsubscribe();
  }
}
