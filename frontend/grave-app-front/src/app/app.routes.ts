import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full',
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/map-page.component').then((m) => m.MapPageComponent),
  },
  {
    path: 'graves',
    loadComponent: () =>
      import('./features/graves/graves-page.component').then((m) => m.GravesPageComponent),
  },
  {
    path: 'graves/add',
    loadComponent: () =>
      import('./features/graves/pages/add-grave/add-grave-page.component').then(
        (m) => m.AddGravePageComponent
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings-page.component').then((m) => m.SettingsPageComponent),
  },
  {
    path: '**',
    redirectTo: 'map',
  },
];
