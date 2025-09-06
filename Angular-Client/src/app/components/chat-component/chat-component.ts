import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatServices } from '../../services/chat-services';
import { UserService } from '../../services/user-service';
import { TokenService } from './../../services/token-service';
import { chatPages, messagePaginationConstants } from '../../utils/const';
import { ListComponent } from './list-component/list-component';

type ChatPage = typeof chatPages[keyof typeof chatPages];

@Component({
  selector: 'app-chat-component',
  imports: [FormsModule, CommonModule, ListComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  message: string = '';
  messages: any[] = [];
  chatPages = chatPages;
  onlineUsersIdList: string[] = [];

  userName: string = '';
  userId: string = '';
  isChatStarted: boolean = false;
  onlineUsers: UserObject[] = [];
  selectedUser: UserObject = { username: '', userId: '' };

  currentPage: ChatPage = chatPages.LIST;

  @ViewChild('messageSection') private messageSection: ElementRef | undefined;

  constructor(private chatService: ChatServices,
    private userService: UserService,
    private tokenService: TokenService) { }


  ngOnInit(): void {
    this.chatService.connect(this.tokenService.getUserIdFromToken() || '');
    this.userName = this.tokenService.getUserNameFromToken() || '';
    this.userId = this.tokenService.getUserIdFromToken() || '';
    this.connectChat();
    this.setIsUserOnline();
    // this.getOnlineUsers();
    this.chatService.onMessage((msg: ReceiveMessageObj) => {
      msg.sender = msg.senderId;
      // console.log('New message received:', msg.senderId, this.userId);
      this.messages.push(msg);
      this.scrollToBottom();
    });
  }


  setIsUserOnline(): void {
    this.chatService.getOnlineUsers().subscribe(onlineUsers => {
      console.log('Online users3333:', onlineUsers, this.selectedUser.userId);
      this.onlineUsers = onlineUsers;
      if (this.selectedUser) {
        if (this.isUserOnline()) {
          this.selectedUser.isOnline = true;
        } else {
          this.selectedUser.isOnline = false;
        }
      }
    });
  }

  isUserOnline(): boolean {
    return this.onlineUsers.some(user => {
      return user.userId == this.selectedUser.userId
    })
  }

  setCurrentPage(page: ChatPage): void {
    this.currentPage = page;
    this.selectedUser = { username: '', userId: '' };
  }

  onUserSelected(user: UserObject): void {
    this.setCurrentPage(chatPages.CHAT);
    this.selectedUser = user;
    // this.onlineUsersIdList.includes(user.userId) ? this.selectedUser.isOnline = true : this.selectedUser.isOnline = false;
    if (this.isUserOnline()) {
      this.selectedUser.isOnline = true;
    } else {
      this.selectedUser.isOnline = false;
    }
    // this.isUserOnline();
    let messagePagination: MessagePagination = { page: messagePaginationConstants.SKIP, limit: messagePaginationConstants.LIMIT };
    this.chatService.getOfflineMessages([user.userId], messagePagination).subscribe({
      next: (response: any) => {
        this.messages = response.data || [];
        console.log('Offline messages:', response);
        this.scrollToBottom();
      }, error: (error) => {
        console.error('Error fetching offline messages:', error);
      }
    })
  }

  sendMessage(): void {
    if (this.message.trim()) {
      // this.chatService.sendMessage(this.selectedUser, this.message);
      let messageObj: SendMessageObj = { senderId: this.userId, reciverId: this.selectedUser.userId, message: this.message.trim() };
      this.chatService.sendMessage(messageObj);
      this.scrollToBottom();
      this.message = '';
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageSection) {
        this.messageSection.nativeElement.scrollTop = this.messageSection.nativeElement.scrollHeight;
      }
    }, 50)
  }

  connectChat(): void {
    if (this.userName.trim()) {
      this.isChatStarted = true;
      const userObj: UserObject = { username: this.userName, userId: this.tokenService.getUserIdFromToken() || '' };
      this.chatService.registeruser(userObj);
    }
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
  }
}
