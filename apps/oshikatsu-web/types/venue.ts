export type Venue = {
  id: string;
  name: string;
  prefecture: string | null;
  address: string | null;
  capacity: number | null;
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
  address: string;
  capacity: string;
  access: string;
  notes: string;
};

export type UpdateVenueInput = CreateVenueInput;
