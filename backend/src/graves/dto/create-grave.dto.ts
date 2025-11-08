import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DeceasedPersonDto {
  @ApiProperty({ description: 'First name of the deceased person', example: 'Jan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ description: 'Last name of the deceased person', example: 'Kowalski' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ description: 'Date of birth in ISO 8601 format', example: '1950-03-15' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Date of death in ISO 8601 format', example: '2020-11-01' })
  @IsDateString()
  @IsOptional()
  deathDate?: string;

  @ApiPropertyOptional({ description: 'Maiden name (if applicable)', example: 'Nowak' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  maidenName?: string;

  @ApiPropertyOptional({ description: 'Additional notes about this person', example: 'Veteran WWII' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}

export class CreateGraveDto {
  @ApiProperty({ description: 'Latitude coordinate in WGS84', example: 52.2297 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: 'Longitude coordinate in WGS84', example: 21.0122 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

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

  @ApiPropertyOptional({ description: 'Additional notes about the grave location', example: 'Przy dużym dębie' })
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

  @ApiPropertyOptional({ description: 'Currency code', example: 'PLN', default: 'PLN' })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  paymentCurrency?: string;

  @ApiProperty({ 
    description: 'List of deceased persons buried in this grave',
    type: [DeceasedPersonDto],
    example: [{
      firstName: 'Jan',
      lastName: 'Kowalski',
      birthDate: '1950-03-15',
      deathDate: '2020-11-01'
    }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeceasedPersonDto)
  deceasedPersons!: DeceasedPersonDto[];
}
