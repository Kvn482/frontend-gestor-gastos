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
  darkMode = false

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.nombre = currentUser.nombre.split(" ")[0]
    this.profileImageUrl = `https://ui-avatars.com/api/?name=${this.nombre}`
    this.username = currentUser.username
    this.darkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    if (this.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

}