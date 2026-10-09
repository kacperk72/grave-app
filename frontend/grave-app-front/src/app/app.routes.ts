import { Routes } from '@angular/router';

import { onboardingGuard } from './core/services/onboarding';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
  {
    path: 'welcome',
    loadComponent: () =>
      import('./features/welcome/welcome-page.component').then((m) => m.WelcomePageComponent),
  },
  {
    // Rodzinny link: /rodzina#<klucz>
    path: 'rodzina',
    loadComponent: () =>
      import('./features/family/join-family-page.component').then((m) => m.JoinFamilyPageComponent),
  },
  {
    path: 'start',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/home/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/map-page.component').then((m) => m.MapPageComponent),
  },
  {
    // Dawna lista „Moje groby" — teraz jest częścią ekranu Start
    path: 'graves',
    pathMatch: 'full',
    redirectTo: 'start',
  },
  {
    path: 'graves/add',
    loadComponent: () =>
      import('./features/graves/pages/add-grave/add-grave-page.component').then(
        (m) => m.AddGravePageComponent
      ),
  },
  {
    path: 'graves/:id/edit',
    loadComponent: () =>
      import('./features/graves/pages/add-grave/add-grave-page.component').then(
        (m) => m.AddGravePageComponent
      ),
  },
  {
    path: 'graves/:id',
    loadComponent: () =>
      import('./features/graves/pages/grave-details/grave-details-page.component').then(
        (m) => m.GraveDetailsPageComponent
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings-page.component').then((m) => m.SettingsPageComponent),
  },
  {
    path: 'mapy/nowa',
    loadComponent: () =>
      import('./features/family/create-space-page.component').then(
        (m) => m.CreateSpacePageComponent
      ),
  },
  {
    path: 'mapy/:id',
    loadComponent: () =>
      import('./features/family/space-page.component').then((m) => m.SpacePageComponent),
  },
  {
    path: 'logowanie',
    loadComponent: () =>
      import('./features/account/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'regulamin',
    loadComponent: () =>
      import('./features/legal/terms-page.component').then((m) => m.TermsPageComponent),
  },
  {
    path: 'prywatnosc',
    loadComponent: () =>
      import('./features/legal/privacy-page.component').then((m) => m.PrivacyPageComponent),
  },
  {
    path: '**',
    redirectTo: 'start',
  },
];
