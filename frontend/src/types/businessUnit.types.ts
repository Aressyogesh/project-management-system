export interface BusinessUnit {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessUnitRef {
  id: string;
  name: string;
}
