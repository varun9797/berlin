import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="chat-layout">
      <div class="app-header">
        <h1 class="app-title">
          <span class="chat-icon">💬</span>
          Global Chat
        </h1>
        <div class="header-controls">
          <!-- Header controls will be added here if needed -->
        </div>
      </div>
      
      <div class="chat-router-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styleUrls: ['./chat-component.scss']
})
export class ChatComponent { }