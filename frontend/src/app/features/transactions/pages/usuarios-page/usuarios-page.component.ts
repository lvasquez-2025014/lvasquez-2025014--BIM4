import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { UserManagementService, ManagedUser, CreateUserDto, UpdateUserDto } from '../../../../core/services/user-management.service';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportToCsv } from '../../../../core/utils/export.utils';
import { getLocalTodayString, formatDisplayDate, toLocalDateInputString } from '../../../../core/utils/date.utils';

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './usuarios-page.component.html',
  styleUrl: './usuarios-page.component.css'
})
export class UsuariosPageComponent implements OnInit {
  private userMgmt = inject(UserManagementService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  users = signal<ManagedUser[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  showModal = signal(false);
  editingUser = signal<ManagedUser | null>(null);

  form = {
    usuario: '',
    nombre: '',
    password: '',
    rol: 'user' as 'admin' | 'user'
  };

  readonly currentUsername = computed(() => this.auth.currentUser()?.usuario || '');

  ngOnInit(): void {
    this.fetchUsers();
  }

  async fetchUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.userMgmt.getUsers();
      this.users.set(data);
      this.loading.set(false);
    } catch (err: any) {
      this.loading.set(false);
      this.notification.show({
        type: 'error',
        message: 'Error al consultar la lista de usuarios.'
      });
    }
  }

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.users();
    if (!query) return list;

    return list.filter(u =>
      u.usuario.toLowerCase().includes(query) ||
      (u.nombre && u.nombre.toLowerCase().includes(query)) ||
      u.rol.toLowerCase().includes(query)
    );
  });

  totalUsers = computed(() => this.users().length);
  totalAdmins = computed(() => this.users().filter(u => u.rol === 'admin').length);
  totalClients = computed(() => this.users().filter(u => u.rol === 'user').length);

  openCreate(): void {
    this.editingUser.set(null);
    this.form = {
      usuario: '',
      nombre: '',
      password: '',
      rol: 'user'
    };
    this.showModal.set(true);
  }

  openEdit(u: ManagedUser): void {
    this.editingUser.set(u);
    this.form = {
      usuario: u.usuario,
      nombre: u.nombre,
      password: '',
      rol: u.rol
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
  }

  async saveUser(): Promise<void> {
    const editing = this.editingUser();

    if (editing) {
      // Edición de usuario
      try {
        const dto: UpdateUserDto = {
          nombre: this.form.nombre.trim(),
          rol: this.form.rol
        };
        if (this.form.password.trim()) {
          dto.password = this.form.password.trim();
        }

        await this.userMgmt.updateUser(editing.id, dto);
        this.notification.show({
          type: 'success',
          message: `Usuario "${editing.usuario}" actualizado con éxito.`
        });
        this.closeModal();
        this.fetchUsers();
      } catch (err: any) {
        this.notification.show({
          type: 'error',
          message: err?.response?.data?.message || 'Error al actualizar usuario.'
        });
      }
    } else {
      // Creación de nuevo usuario
      if (!this.form.usuario.trim() || !this.form.password.trim()) {
        this.notification.show({
          type: 'warning',
          message: 'Usuario y contraseña son requeridos.'
        });
        return;
      }

      try {
        const dto: CreateUserDto = {
          usuario: this.form.usuario.trim(),
          password: this.form.password.trim(),
          nombre: this.form.nombre.trim() || this.form.usuario.trim(),
          rol: this.form.rol
        };

        await this.userMgmt.createUser(dto);
        this.notification.show({
          type: 'success',
          message: `Usuario "${dto.usuario}" creado exitosamente como ${dto.rol === 'admin' ? 'Administrador' : 'Cliente'}.`
        });
        this.closeModal();
        this.fetchUsers();
      } catch (err: any) {
        this.notification.show({
          type: 'error',
          message: err?.response?.data?.message || 'Error al crear usuario.'
        });
      }
    }
  }

  async deleteUser(u: ManagedUser): Promise<void> {
    if (u.usuario === this.currentUsername()) {
      this.notification.show({
        type: 'warning',
        message: 'No puedes eliminar tu propia cuenta en sesión.'
      });
      return;
    }

    if (confirm(`¿Estás seguro de eliminar al usuario "${u.usuario}" (${u.nombre})? Esta acción es irreversible.`)) {
      try {
        await this.userMgmt.deleteUser(u.id);
        this.notification.show({
          type: 'success',
          message: `Usuario "${u.usuario}" eliminado del sistema.`
        });
        this.fetchUsers();
      } catch (err: any) {
        this.notification.show({
          type: 'error',
          message: err?.response?.data?.message || 'Error al eliminar usuario.'
        });
      }
    }
  }

  exportUsersCSV(): void {
    const rows = this.filteredUsers().map(u => [
      u.usuario,
      u.nombre || '',
      u.rol === 'admin' ? 'Administrador' : 'Cliente',
      u.createdAt ? toLocalDateInputString(u.createdAt) : 'N/A'
    ]);

    exportToCsv({
      filename: `Usuarios_Vought_${getLocalTodayString()}`,
      headers: ['Usuario', 'Nombre Completo', 'Rol', 'Fecha de Registro'],
      rows
    });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Registro inicial';
    return formatDisplayDate(date);
  }
}
