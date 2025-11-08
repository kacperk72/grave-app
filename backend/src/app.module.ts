import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { environmentValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { GravesModule } from './graves/graves.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validationSchema: environmentValidationSchema,
    }),
    DatabaseModule,
    GravesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
