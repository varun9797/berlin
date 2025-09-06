import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-user-resgistration-component',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './user-resgistration-component.html',
  styleUrls: ['./user-resgistration-component.scss', '../login-component/login-component.scss']
})
export class UserResgistrationComponent {

  registrationForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    email: new FormControl('', Validators.required)
  })

  constructor(private router: Router, private userService: UserService) { }

  onSubmit(): void {
    this.markAllFieldsAsTouched(this.registrationForm);

    if (this.registrationForm.invalid) {
      return;
    };
    if (this.registrationForm.valid) {
      const registrationData: UserResgistration = {
        username: this.registrationForm.value.username!,
        email: this.registrationForm.value.email!,
        password: this.registrationForm.value.password!
      };
      this.userService.registerUser(registrationData).subscribe({
        next: (response) => {
          console.log('User registered successfully', response);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.handleHttpError(error);
          console.error('Error registering user', error);
        }
      });
      console.log(this.registrationForm.value);
    } else {
      console.log("Form is invalid", this.registrationForm);
    }
  }

  goToLoginPage(): void {
    this.router.navigate(['/login']);
  }

  handleHttpError(error: HttpErrorResponse): void {
    console.error('HTTP Error:', error);
    if (error.status === 401 || error.status === 404) {
      alert('Invalid credentials. Please try again.');
    } else if (error.status === 0) {
      alert('Network error. Please check your connection and try again.');
    }
  }

  markAllFieldsAsTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup) {
        this.markAllFieldsAsTouched(control);
      }
    });
  }


}
