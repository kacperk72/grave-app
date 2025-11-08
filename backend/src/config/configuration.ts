export interface ApplicationConfiguration {
  environment: string;
  port: number;
  supabase: {
    url: string;
    serviceKey: string;
    publicKey: string;
  };
  database: {
    url: string;
  };
}

export default (): ApplicationConfiguration => ({
  environment: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
    publicKey: process.env.SUPABASE_PUBLIC_KEY ?? '',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
});
