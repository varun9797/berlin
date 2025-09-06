import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ChatServices {

  private socket!: Socket;

  constructor(private http: HttpClient) {
  }

  connect(userId: string): void {
    this.socket = io(environment.socketUrl, { query: { userId } });
  }

  sendMessage(messageObj: SendMessageObj): void {
    this.socket.emit('privateMessage', messageObj);
  }

  registeruser(userObj: UserObject): void {
    this.socket.emit('register', userObj);
  }

  onMessage(callback: (msg: ReceiveMessageObj) => void): void {
    this.socket.on('privateMessage', callback);
  }

  getOfflineMessages(requestedUserIds: string[], messagePagination: MessagePagination): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/v1/chat/conversations`, { userIds: requestedUserIds, paginationDetails: messagePagination }
      , { withCredentials: true }
    );
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  getOnlineUsers(): Observable<UserObject[]> {
    return new Observable(observer => {
      this.socket.on('online-users', (users: UserObject[]) => {
        console.log('Online users from socket:', users);
        observer.next(users)
      });
    });
  }

}
