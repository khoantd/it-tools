export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyUnit {
  major: {
    singular: string;
    plural: string;
  };
  minor: {
    singular: string;
    plural: string;
  };
}

export interface ExchangeRates {
  [currencyCode: string]: number;
}

export interface ExchangeRateResponse {
  rates: ExchangeRates;
  base: string;
  date: string;
}

export interface CurrencyConverterState {
  rates: ExchangeRates;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
];

// Map Vue i18n locales to written-number supported locales
export const LOCALE_TO_WRITTEN_NUMBER: Record<string, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  pt: 'pt',
  uk: 'uk',
  vi: 'vi',
  // Fallback to English for unsupported locales
  de: 'en',
  no: 'en',
  zh: 'en',
};

// Currency unit mappings for major currencies
export const CURRENCY_UNITS: Record<string, CurrencyUnit> = {
  USD: {
    major: { singular: 'dollar', plural: 'dollars' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  EUR: {
    major: { singular: 'euro', plural: 'euros' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  GBP: {
    major: { singular: 'pound', plural: 'pounds' },
    minor: { singular: 'penny', plural: 'pence' }
  },
  JPY: {
    major: { singular: 'yen', plural: 'yen' },
    minor: { singular: 'sen', plural: 'sen' }
  },
  CNY: {
    major: { singular: 'yuan', plural: 'yuan' },
    minor: { singular: 'fen', plural: 'fen' }
  },
  CAD: {
    major: { singular: 'dollar', plural: 'dollars' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  AUD: {
    major: { singular: 'dollar', plural: 'dollars' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  CHF: {
    major: { singular: 'franc', plural: 'francs' },
    minor: { singular: 'centime', plural: 'centimes' }
  },
  INR: {
    major: { singular: 'rupee', plural: 'rupees' },
    minor: { singular: 'paisa', plural: 'paise' }
  },
  RUB: {
    major: { singular: 'ruble', plural: 'rubles' },
    minor: { singular: 'kopeck', plural: 'kopecks' }
  },
  BRL: {
    major: { singular: 'real', plural: 'reais' },
    minor: { singular: 'centavo', plural: 'centavos' }
  },
  MXN: {
    major: { singular: 'peso', plural: 'pesos' },
    minor: { singular: 'centavo', plural: 'centavos' }
  },
  ZAR: {
    major: { singular: 'rand', plural: 'rands' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  SGD: {
    major: { singular: 'dollar', plural: 'dollars' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  HKD: {
    major: { singular: 'dollar', plural: 'dollars' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  NOK: {
    major: { singular: 'krone', plural: 'kroner' },
    minor: { singular: 'øre', plural: 'øre' }
  },
  SEK: {
    major: { singular: 'krona', plural: 'kronor' },
    minor: { singular: 'öre', plural: 'öre' }
  },
  DKK: {
    major: { singular: 'krone', plural: 'kroner' },
    minor: { singular: 'øre', plural: 'øre' }
  },
  NZD: {
    major: { singular: 'dollar', plural: 'dollars' },
    minor: { singular: 'cent', plural: 'cents' }
  },
  KRW: {
    major: { singular: 'won', plural: 'won' },
    minor: { singular: 'jeon', plural: 'jeon' }
  },
  TRY: {
    major: { singular: 'lira', plural: 'liras' },
    minor: { singular: 'kuruş', plural: 'kuruş' }
  },
  PLN: {
    major: { singular: 'zloty', plural: 'zlotys' },
    minor: { singular: 'grosz', plural: 'groszy' }
  },
  CZK: {
    major: { singular: 'koruna', plural: 'korunas' },
    minor: { singular: 'haler', plural: 'halers' }
  },
  HUF: {
    major: { singular: 'forint', plural: 'forints' },
    minor: { singular: 'fillér', plural: 'fillér' }
  },
  ILS: {
    major: { singular: 'shekel', plural: 'shekels' },
    minor: { singular: 'agora', plural: 'agorot' }
  },
  AED: {
    major: { singular: 'dirham', plural: 'dirhams' },
    minor: { singular: 'fils', plural: 'fils' }
  },
  SAR: {
    major: { singular: 'riyal', plural: 'riyals' },
    minor: { singular: 'halala', plural: 'halalas' }
  },
  THB: {
    major: { singular: 'baht', plural: 'baht' },
    minor: { singular: 'satang', plural: 'satang' }
  },
  MYR: {
    major: { singular: 'ringgit', plural: 'ringgits' },
    minor: { singular: 'sen', plural: 'sen' }
  },
  PHP: {
    major: { singular: 'peso', plural: 'pesos' },
    minor: { singular: 'centavo', plural: 'centavos' }
  },
  VND: {
    major: { singular: 'dong', plural: 'dong' },
    minor: { singular: 'xu', plural: 'xu' }
  }
};
