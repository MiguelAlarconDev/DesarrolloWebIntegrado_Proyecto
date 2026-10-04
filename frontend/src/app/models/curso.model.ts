export interface Curso {
  id: string;
  titulo: string;
  descripcion?: string;
  docenteId: string;
  docenteNombre?: string;
  fechaInicio: string;
  fechaFin: string;
  horario: string;
  modalidad: 'VIRTUAL' | 'PRESENCIAL';
  aforoMaximo: number;
  aforoDisponible: number;
  precio: number;
  enlaceClase?: string;
  direccionClase?: string;
  aula?: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'FINALIZADO';
  createdAt?: string;
}

export interface CrearCursoRequest {
  titulo: string;
  descripcion?: string;
  docenteId: string;
  fechaInicio: string;
  fechaFin: string;
  horario: string;
  modalidad: 'VIRTUAL' | 'PRESENCIAL';
  aforoMaximo: number;
  precio: number;
  enlaceClase?: string;
  direccionClase?: string;
  aula?: string;
}
