// Public frontend configuration. Safe to commit:
//   - SUPABASE_URL + publishable key are publicly visible by design — they're
//     the same values served to every visitor of the deployed app. The keys
//     that MUST stay secret (service_role) live only in backend/.env and
//     never reach this file.
//   - SSO base URL is also public.
export const environment = {
  production: false,

  supabase: {
    url: 'https://scchquywdstchfjpxbhm.supabase.co',
    publishableKey: 'sb_publishable_F8XhkOP8g-A_HJskg9cH1g_cun0lacU',
  },

  sso: {
    // Adjust to your local SSO backend port in dev.
    baseUrl: 'http://localhost:3001',
    appSlug: 'grave-app',
  },
};
