export type Venue = {
  id: string;
  name: string;
  prefecture: string | null;
  capacity: number | null;
  mapUrl: string | null;
  officialUrl: string | null;
  access: string | null;
  notes: string | null;
};

export type VenueOption = {
  id: string;
  name: string;
};

export type CreateVenueInput = {
  name: string;
  prefecture: string;
  capacity: string;
  mapUrl: string;
  officialUrl: string;
  access: string;
  notes: string;
};

export type UpdateVenueInput = CreateVenueInput;
