import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from './services/user-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Angular-client');

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Initialize user data from token on app startup
    this.userService.initializeFromToken();
  }
}
