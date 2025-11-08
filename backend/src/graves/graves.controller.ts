import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFloatPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateGraveDto } from './dto/create-grave.dto';
import { GraveResponseDto } from './dto/grave-response.dto';
import { UpdateGraveDto } from './dto/update-grave.dto';
import { GravesService } from './graves.service';

@ApiTags('graves')
@Controller('graves')
export class GravesController {
  constructor(private readonly gravesService: GravesService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all graves for the current user' })
  @ApiOkResponse({ description: 'List of graves', type: [GraveResponseDto] })
  findAll() {
    return this.gravesService.findAll();
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Retrieve graves near coordinates within a radius' })
  @ApiQuery({ name: 'lat', required: true, description: 'Latitude in WGS84' })
  @ApiQuery({ name: 'lng', required: true, description: 'Longitude in WGS84' })
  @ApiQuery({ name: 'radius', required: false, description: 'Radius in meters', example: 100 })
  findNearby(
    @Query('lat', ParseFloatPipe) latitude: number,
    @Query('lng', ParseFloatPipe) longitude: number,
    @Query('radius', new DefaultValuePipe(250), ParseFloatPipe) radius: number,
  ) {
    return this.gravesService.findNearby({
      latitude,
      longitude,
      radius,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve grave details by id' })
  @ApiOkResponse({ description: 'Grave details', type: GraveResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.gravesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new grave entry' })
  @ApiCreatedResponse({ description: 'Grave created successfully', type: GraveResponseDto })
  create(@Body() createGraveDto: CreateGraveDto) {
    return this.gravesService.create(createGraveDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a grave entry' })
  @ApiOkResponse({ description: 'Updated grave entry', type: GraveResponseDto })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateGraveDto: UpdateGraveDto,
  ) {
    return this.gravesService.update(id, updateGraveDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a grave entry' })
  @ApiOkResponse({ description: 'Grave removed', status: HttpStatus.OK })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.gravesService.remove(id);
  }
}
