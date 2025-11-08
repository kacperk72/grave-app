import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateGraveDto {
  @ApiPropertyOptional({ description: 'Latitude coordinate in WGS84', example: 52.2297 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate in WGS84', example: 21.0122 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Accuracy of the GPS measurement in meters', example: 4.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Name of the cemetery', example: 'Cmentarz Powązkowski' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  cemeteryName?: string;

  @ApiPropertyOptional({ description: 'Identifier of the grave', example: 'A-123' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  graveNumber?: string;

  @ApiPropertyOptional({ description: 'Cemetery sector or row', example: 'Sektor 5' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the grave', example: 'Przy dużym dębie' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Date until which the grave plot is paid', example: '2030-12-31' })
  @IsDateString()
  @IsOptional()
  paymentExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Amount of last payment', example: 500.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lastPaymentAmount?: number;

  @ApiPropertyOptional({ description: 'Duration of payment in months', example: 120 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  paymentDurationMonths?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'PLN' })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  paymentCurrency?: string;
}