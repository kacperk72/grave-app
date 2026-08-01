// Production configuration — same keys as dev (publishable + URL are not
// secrets); only the SSO base URL differs.
export const environment = {
  production: true,

  supabase: {
    url: 'https://scchquywdstchfjpxbhm.supabase.co',
    publishableKey: 'sb_publishable_F8XhkOP8g-A_HJskg9cH1g_cun0lacU',
  },

  sso: {
    baseUrl: 'https://sso.kubitk.eu', // TODO confirm actual production SSO host
    appSlug: 'grave-app',
  },
};
