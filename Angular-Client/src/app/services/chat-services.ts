import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../enviornment/environment';


@Injectable({
  providedIn: 'root'
})
export class ChatServices {

  private socket!: Socket;

  constructor() {
    this.socket = io(environment.socketUrl);
  }

  sendMessage(userName: string, message: string): void {
    this.socket.emit('privateMessage', { toUserId: userName, message });
  }

  registeruser(message: string): void {
    this.socket.emit('register', message);
  }

  onMessage(callback: (msg: string) => void): void {
    this.socket.on('privateMessage', callback);
  }

}
