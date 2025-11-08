import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../database/supabase.service';
import { CreateGraveDto } from './dto/create-grave.dto';
import { UpdateGraveDto } from './dto/update-grave.dto';
import { Grave } from './entities/grave.entity';

interface FindNearbyParams {
  latitude: number;
  longitude: number;
  radius?: number;
}

@Injectable()
export class GravesService {
  private readonly logger = new Logger(GravesService.name);
  private readonly defaultUserId = 'demo-user';

  constructor(private readonly supabase: SupabaseService) {}

  async create(createGraveDto: CreateGraveDto): Promise<Grave> {
    const graveId = randomUUID();
    const now = new Date().toISOString();

    // Create grave record
    const graveData = {
      id: graveId,
      user_id: this.defaultUserId,
      latitude: createGraveDto.latitude,
      longitude: createGraveDto.longitude,
      accuracy: createGraveDto.accuracy,
      cemetery_name: createGraveDto.cemeteryName,
      grave_number: createGraveDto.graveNumber,
      sector: createGraveDto.sector,
      notes: createGraveDto.notes,
      payment_expiry_date: createGraveDto.paymentExpiryDate,
      last_payment_amount: createGraveDto.lastPaymentAmount,
      payment_duration_months: createGraveDto.paymentDurationMonths,
      payment_currency: createGraveDto.paymentCurrency || 'PLN',
      created_at: now,
      updated_at: now,
    };

    const { data: grave, error: graveError } = await this.supabase
      .getClient()
      .from('graves')
      .insert(graveData)
      .select()
      .single();

    if (graveError) {
      this.logger.error(`Failed to create grave: ${graveError.message}`);
      throw new Error(`Database error: ${graveError.message}`);
    }

    // Create deceased persons
    if (createGraveDto.deceasedPersons && createGraveDto.deceasedPersons.length > 0) {
      const deceasedData = createGraveDto.deceasedPersons.map((person) => ({
        id: randomUUID(),
        grave_id: graveId,
        first_name: person.firstName,
        last_name: person.lastName,
        birth_date: person.birthDate,
        death_date: person.deathDate,
        maiden_name: person.maidenName,
        notes: person.notes,
        created_at: now,
        updated_at: now,
      }));

      const { error: personsError } = await this.supabase
        .getClient()
        .from('deceased_persons')
        .insert(deceasedData);

      if (personsError) {
        this.logger.error(`Failed to create deceased persons: ${personsError.message}`);
        // Rollback grave if persons creation failed
        await this.supabase.getClient().from('graves').delete().eq('id', graveId);
        throw new Error(`Database error: ${personsError.message}`);
      }
    }

    this.logger.debug(`Created grave ${graveId} with ${createGraveDto.deceasedPersons?.length || 0} deceased persons`);
    return this.findOne(graveId);
  }

  async findAll(): Promise<Grave[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('graves')
      .select('*')
      .eq('user_id', this.defaultUserId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch graves: ${error.message}`);
      throw new Error(`Database error: ${error.message}`);
    }

    return Promise.all((data || []).map((row) => this.mapToGrave(row)));
  }

  async findOne(id: string): Promise<Grave> {
    const { data, error } = await this.supabase
      .getClient()
      .from('graves')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Grave with id ${id} not found`);
    }

    return this.mapToGrave(data);
  }

  async update(id: string, updateGraveDto: UpdateGraveDto): Promise<Grave> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateGraveDto.latitude !== undefined) updateData.latitude = updateGraveDto.latitude;
    if (updateGraveDto.longitude !== undefined) updateData.longitude = updateGraveDto.longitude;
    if (updateGraveDto.accuracy !== undefined) updateData.accuracy = updateGraveDto.accuracy;
    if (updateGraveDto.cemeteryName !== undefined) updateData.cemetery_name = updateGraveDto.cemeteryName;
    if (updateGraveDto.graveNumber !== undefined) updateData.grave_number = updateGraveDto.graveNumber;
    if (updateGraveDto.sector !== undefined) updateData.sector = updateGraveDto.sector;
    if (updateGraveDto.notes !== undefined) updateData.notes = updateGraveDto.notes;
    if (updateGraveDto.paymentExpiryDate !== undefined) updateData.payment_expiry_date = updateGraveDto.paymentExpiryDate;
    if (updateGraveDto.lastPaymentAmount !== undefined) updateData.last_payment_amount = updateGraveDto.lastPaymentAmount;
    if (updateGraveDto.paymentDurationMonths !== undefined) updateData.payment_duration_months = updateGraveDto.paymentDurationMonths;
    if (updateGraveDto.paymentCurrency !== undefined) updateData.payment_currency = updateGraveDto.paymentCurrency;

    const { data, error } = await this.supabase
      .getClient()
      .from('graves')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Grave with id ${id} not found or update failed`);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const { error } = await this.supabase
      .getClient()
      .from('graves')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException(`Grave with id ${id} not found`);
    }

    return { deleted: true };
  }

  async findNearby({ latitude, longitude, radius = 250 }: FindNearbyParams): Promise<Grave[]> {
    const allGraves = await this.findAll();
    return allGraves.filter((grave) => {
      const distance = this.calculateDistance(latitude, longitude, grave.latitude, grave.longitude);
      return distance <= radius;
    });
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3; // meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Map Supabase row (snake_case) to domain entity (camelCase)
  private async mapToGrave(row: any): Promise<Grave> {
    // Fetch deceased persons for this grave
    const { data: deceasedData } = await this.supabase
      .getClient()
      .from('deceased_persons')
      .select('*')
      .eq('grave_id', row.id);

    const deceasedPersons = (deceasedData || []).map((person: any) => ({
      id: person.id,
      graveId: person.grave_id,
      firstName: person.first_name,
      lastName: person.last_name,
      birthDate: person.birth_date,
      deathDate: person.death_date,
      maidenName: person.maiden_name,
      notes: person.notes,
      createdAt: person.created_at,
      updatedAt: person.updated_at,
    }));

    return {
      id: row.id,
      userId: row.user_id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      cemeteryName: row.cemetery_name,
      graveNumber: row.grave_number,
      sector: row.sector,
      notes: row.notes,
      paymentExpiryDate: row.payment_expiry_date,
      lastPaymentAmount: row.last_payment_amount,
      paymentDurationMonths: row.payment_duration_months,
      paymentCurrency: row.payment_currency,
      photos: row.photos || [],
      deceasedPersons,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
