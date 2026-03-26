import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.html',
  imports: [RouterOutlet, RouterLink, RouterLinkActive]
})
export class Layout {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  nombre = ''
  username = ''
  profileImageUrl = `https://ui-avatars.com/api/?name=`
  sidebarOpen = false

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.nombre = currentUser.nombre.split(" ")[0]
    this.profileImageUrl = `https://ui-avatars.com/api/?name=${this.nombre}`
    this.username = currentUser.username
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}