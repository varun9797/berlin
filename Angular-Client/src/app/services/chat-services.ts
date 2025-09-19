import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { TokenService } from './token-service';


@Injectable({
  providedIn: 'root'
})
export class ChatServices {

  private socket!: Socket;
  private _newMessageBehaviorSubject = new BehaviorSubject<ReceiveMessageObj | null>(null);

  readonly newMessageBehaviorSubject = this._newMessageBehaviorSubject.asObservable();

  constructor(private http: HttpClient, private tokenService: TokenService) {
  }

  connect(userId: string): void {
    this.socket = io(environment.socketUrl, {
      query: { userId }, auth: {
        token: this.tokenService.getToken()
      }
    });
  }

  sendMessage(messageObj: SendMessageObj): void {
    this.socket.emit('privateMessage', messageObj);
  }

  registeruser(userObj: UserObject): void {
    this.socket.emit('register', userObj);
  }

  onMessage(): void {
    this.socket.on('privateMessage', (data: ReceiveMessageObj) => {
      console.log('Message received from socket:', data);
      this._newMessageBehaviorSubject.next(data);
    });
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
