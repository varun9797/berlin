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
  @Input() userName: string = '';

  constructor(public userService: UserService,
    public chatServices: ChatServices,
    public chatService: ChatServices) { }

  ngOnInit(): void {
    this.setIsUserOnline();
    this.getOnlineUsersFromApi();
  }

  refreshUserList(): void {
    this.getOnlineUsersFromApi();
  }

  onSelectUser(user: UserObject): void {
    this.userSelected.emit(user);
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
      if (this.userName !== response[key].username) {
        onlineUsers.push(response[key]);
      }
    }
    this.selectedUser = onlineUsers[0] || '';

    return onlineUsers;
  }

}
