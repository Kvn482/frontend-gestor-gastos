export interface CategoriasResponse {
  id: number;
  categoria?: string;
  nombre?: string;
  color?: string;
  id_usuario: number | null;
  tipo?: 'gasto' | 'ingreso';
  icono?: string;
}
