import { Routes } from '@angular/router';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { CursoDetalleComponent } from './pages/curso-detalle/curso-detalle.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { ConfirmacionComponent } from './pages/confirmacion/confirmacion.component';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { EstudiantePanelComponent } from './pages/estudiante-panel/estudiante-panel.component';
import { DocentePanelComponent } from './pages/docente-panel/docente-panel.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'curso/:id', component: CursoDetalleComponent },
  { path: 'checkout/:id', component: CheckoutComponent },
  { path: 'confirmacion/:id', component: ConfirmacionComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'mis-cursos', component: EstudiantePanelComponent },
  { path: 'docente', component: DocentePanelComponent },
  { path: 'admin', component: AdminPanelComponent },
  { path: '**', redirectTo: '' }
];
