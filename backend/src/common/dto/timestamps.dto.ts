import { ApiProperty } from '@nestjs/swagger';

export class TimestampsDto {
  @ApiProperty({ description: 'Creation timestamp in ISO8601 format' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp in ISO8601 format' })
  updatedAt!: string;
}
