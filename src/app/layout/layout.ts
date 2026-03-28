import { Component, HostListener } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { AuthService } from '../core/services/auth.service'

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.html',
  imports: [RouterOutlet]
})
export class Layout {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  nombreCompleto = ''
  nombre = ''
  username = ''
  email = ''
  profileImageUrl = `https://ui-avatars.com/api/?name=`
  sidebarOpen = false
  darkMode = false
  profileDropdownOpen = false
  dropdownBottom = 0
  dropdownTop = 0
  dropdownLeft = 0
  isMobile = false

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser()
    this.nombreCompleto = currentUser.nombre
    this.nombre = currentUser.nombre.split(" ")[0]
    this.profileImageUrl = `https://ui-avatars.com/api/?name=${this.nombre}`
    this.username = currentUser.username
    this.email = currentUser.email || ''
    this.darkMode = localStorage.getItem('theme') === 'dark'
    this.applyTheme()
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.profileDropdownOpen = false
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation()
    this.profileDropdownOpen = !this.profileDropdownOpen
    if (this.profileDropdownOpen) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      this.isMobile = window.innerWidth < 640

      if (this.isMobile) {
        // Centrado horizontalmente, encima del botón
        const dropdownWidth = 288
        this.dropdownTop = 0
        this.dropdownBottom = window.innerHeight - rect.top
        this.dropdownLeft = Math.max(8, rect.left + rect.width / 2 - dropdownWidth / 2)
      } else {
        this.dropdownBottom = window.innerHeight - rect.bottom - 10
        this.dropdownLeft = rect.right + 25
      }
    }
  }

  logout() {
    this.authService.logout()
    this.router.navigate(['/login'])
  }

  closeSidebar() {
    this.sidebarOpen = false
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light')
    this.applyTheme()
  }

  private applyTheme() {
    if (this.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

}