import { ChangeDetectorRef, Component, HostListener } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AuthService } from '../core/services/auth.service'

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.html',
  imports: [RouterOutlet, RouterLink, RouterLinkActive]
})
export class Layout {

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  nombreCompleto = ''
  nombre = ''
  apellido = ''
  email = ''
  profileImageUrl = ''
  tieneAvatarPersonalizado = false
  sidebarOpen = false
  darkMode = false
  profileDropdownOpen = false
  dropdownBottom = 0
  dropdownTop = 0
  dropdownLeft = 0
  isMobile = false

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser()

    this.nombre = currentUser?.nombre?.split(' ')[0] ?? ''
    this.apellido = currentUser?.apellido ?? ''
    this.nombreCompleto = this.nombre ? `${this.nombre} ${this.apellido}` : ''
    this.email = currentUser?.email ?? ''
    this.darkMode = localStorage.getItem('theme') === 'dark'
    this.applyTheme()

    const avatarOverride = localStorage.getItem('avatarOverride')
    if (avatarOverride) {
      this.profileImageUrl = avatarOverride
      this.tieneAvatarPersonalizado = true
    }

    this.authService.getPerfil().subscribe({
      next: (perfil) => {
        if (perfil?.nombre) {
          const override = localStorage.getItem('perfilOverride')
          if (!override) {
            this.nombre = perfil.nombre.split(' ')[0]
            this.apellido = perfil.apellido ?? ''
            this.nombreCompleto = `${this.nombre} ${this.apellido}`
            this.email = perfil.email ?? this.email
          }
        }
        if (perfil?.avatar_url) {
          this.profileImageUrl = perfil.avatar_url
          this.tieneAvatarPersonalizado = true
          localStorage.setItem('avatarOverride', perfil.avatar_url)
        }
        this.cdr.markForCheck()
      }
    })

    this.authService.perfilActualizado$.subscribe(({ nombre, apellido }) => {
      this.nombre = nombre.split(' ')[0]
      this.apellido = apellido
      this.nombreCompleto = `${nombre} ${apellido}`
      this.cdr.markForCheck()
    })

    this.authService.avatarActualizado$.subscribe((avatarUrl) => {
      if (avatarUrl) {
        this.profileImageUrl = avatarUrl
        this.tieneAvatarPersonalizado = true
      } else {
        this.profileImageUrl = ''
        this.tieneAvatarPersonalizado = false
      }
      this.cdr.markForCheck()
    })

    console.log(this.profileImageUrl)
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