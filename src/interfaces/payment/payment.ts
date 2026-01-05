export interface CreditCardData {
  cardNumber: string;
  cardHolderName: string;
  cardExpirationDate: string;
  cardCvv: string;
}

export interface CustomerData {
  externalId: string;
  name: string;
  email: string;
  type?: 'individual' | 'corporation';
  country?: string;
  documents?: Array<{
    type: 'cpf' | 'cnpj';
    number: string;
  }>;
  phoneNumbers?: string[];
  birthday?: string;
}

export interface AddressData {
  country: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  streetNumber: string;
  zipcode: string;
  complement?: string;
}

export interface TransactionItem {
  id: string;
  title: string;
  unitPrice: number;
  quantity: number;
  tangible?: boolean;
}

export interface SplitOptions {
  charge_processing_fee?: boolean;
  charge_remainder_fee?: boolean;
  liable?: boolean;
}

export interface PaymentSplit {
  type: 'percentage' | 'flat';
  amount: number;
  recipient_id: string;
  options?: SplitOptions;
}

export interface RecipientPhoneNumber {
  ddd: string;
  number: string;
  type: 'mobile' | 'landline';
}

export interface RecipientAddress {
  street: string;
  complementary?: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string;
}

export interface ManagingPartner {
  self_declared_legal_representative: boolean;
  address: RecipientAddress;
  phone_numbers: RecipientPhoneNumber[];
  name: string;
  email: string;
  document: string;
  type: 'individual';
  mother_name: string;
  birthdate: string;
  monthly_income: number;
  professional_occupation: string;
}

export interface DefaultBankAccount {
  holder_name: string;
  holder_type: 'individual' | 'corporation';
  holder_document: string;
  bank: string;
  branch_number: string;
  branch_check_digit: string;
  account_number: string;
  account_check_digit: string;
  type: 'checking' | 'savings';
}

export interface TransferSettings {
  transfer_enabled: boolean | string;
  transfer_interval?: 'Daily' | 'Weekly' | 'Monthly';
  transfer_day?: number;
}

export interface AutomaticAnticipationSettings {
  enabled: boolean | string;
  type?: 'full' | 'partial';
  volume_percentage?: number | string;
  delay?: number | string | null;
}

export interface IndividualRecipientData {
  register_information: {
    phone_numbers: RecipientPhoneNumber[];
    address: RecipientAddress;
    name: string;
    email: string;
    document: string;
    type: 'individual';
    site_url?: string;
    mother_name: string;
    birthdate: string;
    monthly_income: number;
    professional_occupation: string;
  };
  default_bank_account: DefaultBankAccount;
  transfer_settings: TransferSettings;
  automatic_anticipation_settings?: AutomaticAnticipationSettings;
  code?: string;
}

export interface CorporationRecipientData {
  register_information: {
    phone_numbers: RecipientPhoneNumber[];
    main_address: RecipientAddress;
    managing_partners: ManagingPartner[];
    company_name: string;
    trading_name: string;
    email: string;
    document: string;
    type: 'corporation';
    site_url?: string;
    annual_revenue: number;
    corporation_type: string;
    founding_date: string;
  };
  default_bank_account: DefaultBankAccount;
  transfer_settings: TransferSettings;
  automatic_anticipation_settings?: AutomaticAnticipationSettings;
  code?: string;
}

