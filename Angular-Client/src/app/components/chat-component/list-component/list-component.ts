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

  onlineUsers: UserObject[] = [];
  @Input() selectedUser: UserObject = { username: '', userId: '' };
  @Output() userSelected = new EventEmitter<UserObject>();
  @Input() currentUserName: string = '';

  constructor(public userService: UserService,
    public chatServices: ChatServices,
    public chatService: ChatServices) { }

  ngOnInit(): void {
    this.setIsUserOnline();
    this.getOnlineUsersFromApi();
    this.onMessageListener();
  }

  refreshUserList(): void {
    this.getOnlineUsersFromApi();
  }

  onSelectUser(user: UserObject): void {
    this.userSelected.emit(user);
  }

  private onMessageListener(): void {
    // this.chatService.onMessage();
    this.chatService.newMessageBehaviorSubject.subscribe((msg: ReceiveMessageObj | null) => {
      // console.log('Message received in subscription:', msg);
      if (msg) {
        this.onlineUsers = this.onlineUsers.map(user => {
          if (user.userId === msg.senderId) {
            user.newMessageCount = (user.newMessageCount || 0) + 1;
          }
          return user;
        })
        // console.log('New message received:', msg);
        msg.sender = msg.senderId;
      }
    })
  }

  getOnlineUsersFromApi(): void {
    this.userService.getOnlineUsers().subscribe({
      next: (response: UserObject[]) => {
        this.onlineUsers = this.getAllUsersExpectCurrentUser(response);
      }, error: (error) => {
        console.error('Error fetching online users:', error);
      }
    })
  }

  setIsUserOnline(): void {
    this.chatService.getOnlineUsers().subscribe(onlineUsers => {
      this.onlineUsers = this.getAllUsersExpectCurrentUser(onlineUsers);
    });
  }

  getAllUsersExpectCurrentUser(response: UserObject[]): UserObject[] {
    let onlineUsers = [];
    for (let key in response) {
      if (this.currentUserName !== response[key].username) {
        response[key].newMessageCount = 0;
        onlineUsers.push(response[key]);
      }
    }
    this.selectedUser = onlineUsers[0] || '';

    return onlineUsers;
  }

}
