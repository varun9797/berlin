import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';

@Component({
  selector: 'app-login-component',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss'
})
export class LoginComponent {

  loginForm: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });;

  constructor(private router: Router, private userService: UserService) {
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
      const loginData: UserLogin = {
        username: this.loginForm.value.username!,
        password: this.loginForm.value.password!
      };
      this.userService.loginUser(loginData).subscribe({
        next: (response) => {
          console.log('Login successful', response);
          this.router.navigate(['/chat']);
        }, error: (error) => {
          console.error('Error during login', error);
        }
      })
    } else {
      console.log("Form is invalid", this.loginForm);
    }
  }

  goToSignUpPage(): void {
    console.log("Go to Sign up page");
    this.router.navigate(['/register']);
  }
}
