import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey = this.configService.get<string>('supabase.serviceKey');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase credentials not configured. Database operations will fail.',
      );
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase client initialized successfully');
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase client not initialized. Check your environment configuration.',
      );
    }
    return this.client;
  }

  // Helper method for common database operations
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('graves').select('count', { count: 'exact', head: true });
      return !error;
    } catch {
      return false;
    }
  }
}
