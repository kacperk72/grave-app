import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    const environment = this.configService.get<string>('environment', 'unknown');
    const port = this.configService.get<number>('port');

    return {
      status: 'ok',
      service: 'GraveMap API',
      environment,
      port,
      timestamp: new Date().toISOString(),
    };
  }
}
