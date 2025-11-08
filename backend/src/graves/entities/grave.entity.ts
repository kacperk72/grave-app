export interface DeceasedPerson {
  id: string;
  graveId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  maidenName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grave {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  cemeteryName?: string;
  graveNumber?: string;
  sector?: string;
  notes?: string;
  paymentExpiryDate?: string;
  lastPaymentAmount?: number;
  paymentDurationMonths?: number;
  paymentCurrency?: string;
  photos: string[];
  deceasedPersons?: DeceasedPerson[];
  createdAt: string;
  updatedAt: string;
}
