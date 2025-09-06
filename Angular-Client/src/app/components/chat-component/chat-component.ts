import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
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
export class ChatComponent {
  message: string = '';
  messages: any[] = [];
  chatPages = chatPages;

  userName: string = '';
  userId: string = '';
  isChatStarted: boolean = false;
  onlineUsers: UserObject[] = [];
  selectedUser: UserObject = { username: '', userId: '' };

  currentPage: ChatPage = chatPages.LIST;

  @ViewChild('messageSection') private messageSection: ElementRef | undefined;

  constructor(private chatService: ChatServices,
    private userService: UserService,
    private tokenService: TokenService) { };

  ngOnInit(): void {
    this.userName = this.tokenService.getUserNameFromToken() || '';
    this.userId = this.tokenService.getUserIdFromToken() || '';
    this.connectChat();
    this.getOnlineUsers();
    this.chatService.onMessage((msg: ReceiveMessageObj) => {
      msg.sender = msg.senderId;
      console.log('New message received:', msg.senderId, this.userId);
      this.messages.push(msg);
      this.scrollToBottom();
    });
  }
  refreshUserList(): void {
    this.getOnlineUsers();
  }

  setCurrentPage(page: ChatPage): void {
    this.currentPage = page;
    this.selectedUser = { username: '', userId: '' };
  }

  onUserSelected(user: UserObject): void {
    this.setCurrentPage(chatPages.CHAT);
    console.log('User selected in parent component:', user);
    this.selectedUser = user;
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


  getOnlineUsers(): void {
    this.userService.getOnlineUsers().subscribe({
      next: (response: UserObject[]) => {
        let onlineUsers = [];
        for (let key in response) {
          if (this.userName !== response[key].username) {
            onlineUsers.push(response[key]);
          }
        }
        // this.selectedUser = onlineUsers[0] || '';

        this.onlineUsers = onlineUsers;
      }, error: (error) => {
        console.error('Error fetching online users:', error);
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
}
