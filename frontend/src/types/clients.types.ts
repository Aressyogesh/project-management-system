export interface AdditionalContact {
  contactPerson: string;
  designation?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  designation: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  additionalContacts: AdditionalContact[];
  isActive: boolean;
  createdAt: string;
  businessUnit?: { id: string; name: string } | null;
}
