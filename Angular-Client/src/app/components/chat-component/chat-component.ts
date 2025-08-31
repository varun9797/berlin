import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatServices } from '../../services/chat-services';
import { UserService } from '../../services/user-service';



@Component({
  selector: 'app-chat-component',
  imports: [FormsModule, CommonModule],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss'
})
export class ChatComponent {
  message: string = '';
  messages: any[] = [];

  userName: string = '';
  isChatStarted: boolean = false;
  onlineUsers: string[] = [];

  @ViewChild('messageSection') private messageSection: ElementRef | undefined;

  constructor(private chatService: ChatServices, private userService: UserService) { };

  ngOnInit(): void {
    this.getOnlineUsers();
    this.chatService.onMessage((msg: string) => {
      console.log(msg);
      this.messages.push(msg);

    });
  }

  getOnlineUsers(): void {
    this.userService.getOnlineUsers().subscribe({
      next: (response) => {
        let onlineUsers = [];
        for (let key in response) {
          onlineUsers.push(key);
        }
        this.onlineUsers = onlineUsers;
        console.log('Online users:', response);
      }, error: (error) => {
        console.error('Error fetching online users:', error);
      }
    })
  }

  sendMessage(): void {
    if (this.message.trim()) {
      this.chatService.sendMessage(this.userName, this.message);

      setTimeout(() => {
        if (this.messageSection) {
          this.messageSection.nativeElement.scrollTop = this.messageSection.nativeElement.scrollHeight;
        }

      }, 50)
    }
  }

  connectChat(): void {
    if (this.userName.trim()) {

      this.isChatStarted = true;
      this.chatService.registeruser(this.userName);
    }
  }
}
