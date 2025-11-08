import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { GravesService } from './graves.service';

describe('GravesService', () => {
  let service: GravesService;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GravesService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              from: jest.fn().mockReturnThis(),
              insert: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'test-id',
                  user_id: 'demo-user',
                  latitude: 52.2297,
                  longitude: 21.0122,
                  first_name: 'Jan',
                  last_name: 'Kowalski',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GravesService>(GravesService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a grave entry with generated id', async () => {
    const result = await service.create({
      latitude: 52.2297,
      longitude: 21.0122,
      accuracy: 5,
      firstName: 'Jan',
      lastName: 'Kowalski',
    });

    expect(result.id).toBeDefined();
    expect(result.firstName).toBe('Jan');
    expect(supabaseService.getClient).toHaveBeenCalled();
  });
});
