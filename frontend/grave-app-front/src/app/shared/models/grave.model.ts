/**
 * Modele danych zgodne ze schematem bazy danych backend (NestJS + Supabase)
 */

export interface DeceasedPerson {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  deathDate: string | null;
  graveId: string;
}

export interface GravePhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  isPrimary: boolean;
  graveId: string;
  uploadedAt: string;
}

export interface Grave {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  cemeteryName: string;
  graveNumber?: string;
  sector?: string;
  notes?: string;

  // Płatności
  paymentDueDate?: string;
  lastPaymentAmount?: number;
  paymentPeriodMonths?: number;
  currency: string;

  // Relacje
  deceasedPersons: DeceasedPerson[];
  photos: GravePhoto[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastVisited?: string;
}

export interface CreateGraveDto {
  latitude: number;
  longitude: number;
  accuracy?: number;
  cemeteryName: string;
  graveNumber?: string;
  sector?: string;
  notes?: string;
  paymentDueDate?: string;
  lastPaymentAmount?: number;
  paymentPeriodMonths?: number;
  currency?: string;
  deceasedPersons: Omit<DeceasedPerson, 'id' | 'graveId'>[];
}

export interface UpdateGraveDto extends Partial<CreateGraveDto> {
  lastVisited?: string;
}

export interface GraveWithDistance extends Grave {
  distance?: number; // w metrach
  bearing?: number; // kierunek w stopniach (0-360)
}

export type SortOption = 'name' | 'distance' | 'date-added' | 'last-visited';
export type FilterOption = 'all' | 'with-payment-due' | 'cemetery';
