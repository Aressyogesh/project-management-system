export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  businessUnit?: { id: string; name: string } | null;
}
