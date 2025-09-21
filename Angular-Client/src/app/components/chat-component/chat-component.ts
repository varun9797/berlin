import { Component } from '@angular/core';
import { ChatContainerComponent } from './chat-container/chat-container.component';

@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [ChatContainerComponent],
  template: '<app-chat-container></app-chat-container>',
})
export class ChatComponent { }