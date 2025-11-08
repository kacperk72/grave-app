import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimestampsDto } from '../../common/dto/timestamps.dto';

export class DeceasedPersonResponseDto extends TimestampsDto {
  @ApiProperty({ description: 'Unique identifier', example: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e' })
  id!: string;

  @ApiProperty({ description: 'Grave ID this person belongs to' })
  graveId!: string;

  @ApiProperty({ description: 'First name', example: 'Jan' })
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Kowalski' })
  lastName!: string;

  @ApiPropertyOptional({ description: 'Date of birth (ISO8601)', example: '1950-03-15' })
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Date of death (ISO8601)', example: '2020-11-01' })
  deathDate?: string;

  @ApiPropertyOptional({ description: 'Maiden name', example: 'Nowak' })
  maidenName?: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Veteran WWII' })
  notes?: string;
}

export class GraveResponseDto extends TimestampsDto {
  @ApiProperty({ description: 'Unique identifier of the grave', example: 'a0e0196c-b8e0-4f71-9f78-4bf0abf2b4c8' })
  id!: string;

  @ApiProperty({ description: 'Identifier of the owner user', example: 'demo-user' })
  userId!: string;

  @ApiProperty({ description: 'Latitude in WGS84', example: 52.2297 })
  latitude!: number;

  @ApiProperty({ description: 'Longitude in WGS84', example: 21.0122 })
  longitude!: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters', example: 4.5 })
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Cemetery name', example: 'Cmentarz Powązkowski' })
  cemeteryName?: string;

  @ApiPropertyOptional({ description: 'Grave number or identifier', example: 'A-123' })
  graveNumber?: string;

  @ApiPropertyOptional({ description: 'Cemetery sector or area', example: 'Sektor 5' })
  sector?: string;

  @ApiPropertyOptional({ description: 'Additional notes about grave location', example: 'Przy dużym dębie' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Date until which plot is paid', example: '2030-12-31' })
  paymentExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Last payment amount', example: 500.00 })
  lastPaymentAmount?: number;

  @ApiPropertyOptional({ description: 'Payment duration in months', example: 120 })
  paymentDurationMonths?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'PLN' })
  paymentCurrency?: string;

  @ApiProperty({ description: 'List of photo URLs attached to the grave', example: ['https://example.com/photo.jpg'] })
  photos!: string[];

  @ApiProperty({ description: 'List of deceased persons buried here', type: [DeceasedPersonResponseDto] })
  deceasedPersons!: DeceasedPersonResponseDto[];
}
