import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserService } from '../../../services/user-service';
import { CommonModule } from '@angular/common';

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

  constructor(public userService: UserService) { }

  ngOnInit(): void {
    this.getOnlineUsers();
  }

  refreshUserList(): void {
    this.getOnlineUsers();
  }

  onSelectUser(user: UserObject): void {
    this.userSelected.emit(user);
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
        this.selectedUser = onlineUsers[0] || '';

        this.onlineUsers = onlineUsers;
      }, error: (error) => {
        console.error('Error fetching online users:', error);
      }
    })
  }

}
