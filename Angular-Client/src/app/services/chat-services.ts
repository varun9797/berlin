import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../enviornment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ChatServices {

  private socket!: Socket;

  constructor(private http: HttpClient) {
    this.socket = io(environment.socketUrl);
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
    return this.http.post('http://localhost:3000/api/v1/chat/conversations', { userIds: requestedUserIds, paginationDetails: messagePagination }
      , { withCredentials: true }
    );
  }

}
