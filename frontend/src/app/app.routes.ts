import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { CursoDetalleComponent } from './pages/curso-detalle/curso-detalle.component';
import { CarritoComponent } from './pages/carrito/carrito.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { ConfirmacionComponent } from './pages/confirmacion/confirmacion.component';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { EstudiantePanelComponent } from './pages/estudiante-panel/estudiante-panel.component';
import { MisComprobantesComponent } from './pages/mis-comprobantes/mis-comprobantes.component';
import { MisCertificadosComponent } from './pages/mis-certificados/mis-certificados.component';
import { DocentePanelComponent } from './pages/docente-panel/docente-panel.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { ContactoComponent } from './pages/contacto/contacto.component';
import { BeneficiosComponent } from './pages/beneficios/beneficios.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'index.html', redirectTo: '', pathMatch: 'full' },
  { path: 'beneficios', component: BeneficiosComponent },
  { path: 'beneficios.html', redirectTo: 'beneficios', pathMatch: 'full' },
  { path: 'cursos', component: CatalogoComponent },
  { path: 'cursos.html', redirectTo: 'cursos', pathMatch: 'full' },
  { path: 'contacto', component: ContactoComponent },
  { path: 'contacto.html', redirectTo: 'contacto', pathMatch: 'full' },
  { path: 'curso-detalle', component: CursoDetalleComponent },
  { path: 'curso-detalle.html', redirectTo: 'curso-detalle', pathMatch: 'full' },
  { path: 'curso/:id', component: CursoDetalleComponent },
  { path: 'carrito', component: CarritoComponent },
  { path: 'carrito.html', redirectTo: 'carrito', pathMatch: 'full' },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'checkout.html', redirectTo: 'checkout', pathMatch: 'full' },
  { path: 'confirmacion', component: ConfirmacionComponent },
  { path: 'confirmacion.html', redirectTo: 'confirmacion', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'login.html', redirectTo: 'login', pathMatch: 'full' },
  { path: 'registro', component: RegistroComponent },
  { path: 'registro.html', redirectTo: 'registro', pathMatch: 'full' },
  { path: 'mis-cursos', component: EstudiantePanelComponent },
  { path: 'mis-cursos.html', redirectTo: 'mis-cursos', pathMatch: 'full' },
  { path: 'mis-comprobantes', component: MisComprobantesComponent },
  { path: 'mis-comprobantes.html', redirectTo: 'mis-comprobantes', pathMatch: 'full' },
  { path: 'mis-certificados', component: MisCertificadosComponent },
  { path: 'mis-certificados.html', redirectTo: 'mis-certificados', pathMatch: 'full' },
  { path: 'portal-estudiante', component: EstudiantePanelComponent },
  { path: 'portal-estudiante.html', redirectTo: 'portal-estudiante', pathMatch: 'full' },
  { path: 'portal-docente', component: DocentePanelComponent },
  { path: 'portal-docente.html', redirectTo: 'portal-docente', pathMatch: 'full' },
  { path: 'portal-admin', component: AdminPanelComponent },
  { path: 'portal-admin.html', redirectTo: 'portal-admin', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
