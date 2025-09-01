import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatServices } from '../../services/chat-services';
import { UserService } from '../../services/user-service';
import { TokenService } from './../../services/token-service';


@Component({
  selector: 'app-chat-component',
  imports: [FormsModule, CommonModule],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss'
})
export class ChatComponent {
  message: string = '';
  messages: any[] = [];
  ownMessages: any[] = [];

  userName: string = '';
  isChatStarted: boolean = false;
  onlineUsers: string[] = [];
  selectedUser: string = '';

  @ViewChild('messageSection') private messageSection: ElementRef | undefined;

  constructor(private chatService: ChatServices,
    private userService: UserService,
    private tokenService: TokenService) { };

  ngOnInit(): void {
    this.userName = this.tokenService.getUserNameFromToken() || '';
    this.connectChat();
    this.getOnlineUsers();
    this.chatService.onMessage((msg: string) => {
      console.log(msg);
      this.messages.push(msg);
      this.scrollToBottom();
    });
  }
  refreshUserList(): void {
    this.getOnlineUsers();
  }

  selectUser(user: string): void {
    this.selectedUser = user;
  }

  getOnlineUsers(): void {
    this.userService.getOnlineUsers().subscribe({
      next: (response) => {
        let onlineUsers = [];
        for (let key in response) {
          if (this.userName !== key) {
            onlineUsers.push(key);
          }
        }
        this.selectedUser = onlineUsers[0] || '';

        this.onlineUsers = onlineUsers;
        console.log('Online users:', response);
      }, error: (error) => {
        console.error('Error fetching online users:', error);
      }
    })
  }

  sendMessage(): void {
    if (this.message.trim()) {
      this.chatService.sendMessage(this.selectedUser, this.message);
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
      this.chatService.registeruser(this.userName);
    }
  }
}
