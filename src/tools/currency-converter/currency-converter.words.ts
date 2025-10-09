// @ts-ignore - written-number doesn't have TypeScript definitions
import writtenNumber from 'written-number';
import { LOCALE_TO_WRITTEN_NUMBER, CURRENCY_UNITS } from './currency-converter.types';

/**
 * Convert a number to words in the specified locale
 * @param amount - The numeric amount to convert
 * @param locale - The current i18n locale
 * @returns The number spelled out in words
 */
export function numberToWords(amount: number, locale: string): string {
  try {
    // Get the written-number locale, fallback to English if not supported
    const writtenNumberLocale = LOCALE_TO_WRITTEN_NUMBER[locale] || 'en';
    
    // Convert number to words
    const words = writtenNumber(amount, { lang: writtenNumberLocale });
    
    return words;
  } catch (error) {
    console.warn(`Failed to convert number to words for locale ${locale}:`, error);
    // Fallback to English
    try {
      return writtenNumber(amount, { lang: 'en' });
    } catch (fallbackError) {
      console.error('Failed to convert number to words even with English fallback:', fallbackError);
      return amount.toString();
    }
  }
}

/**
 * Format currency amount with words including currency units
 * @param amount - The numeric amount
 * @param currencyCode - The currency code (e.g., 'USD', 'EUR')
 * @param locale - The current i18n locale
 * @param t - Translation function for i18n
 * @returns Formatted string with currency name and amount in words
 */
export function formatCurrencyWithWords(
  amount: number, 
  currencyCode: string, 
  locale: string,
  t: (key: string, fallback?: string) => string
): string {
  if (amount === 0) return '';
  
  try {
    // Split amount into major and minor units
    const majorAmount = Math.floor(Math.abs(amount));
    const minorAmount = Math.round((Math.abs(amount) - majorAmount) * 100);
    
    // Get currency units from i18n or fallback to English
    const majorUnitSingular = t(`currencies.${currencyCode}.unit.major.singular`, CURRENCY_UNITS[currencyCode]?.major.singular || '');
    const majorUnitPlural = t(`currencies.${currencyCode}.unit.major.plural`, CURRENCY_UNITS[currencyCode]?.major.plural || '');
    const minorUnitSingular = t(`currencies.${currencyCode}.unit.minor.singular`, CURRENCY_UNITS[currencyCode]?.minor.singular || '');
    const minorUnitPlural = t(`currencies.${currencyCode}.unit.minor.plural`, CURRENCY_UNITS[currencyCode]?.minor.plural || '');
    const connector = t('currencies.connector', 'and');
    
    // Convert major amount to words
    const majorWords = majorAmount > 0 ? numberToWords(majorAmount, locale) : '';
    
    // Convert minor amount to words
    const minorWords = minorAmount > 0 ? numberToWords(minorAmount, locale) : '';
    
    // Build the result
    let result = '';
    
    if (majorAmount > 0) {
      const majorUnit = majorAmount === 1 ? majorUnitSingular : majorUnitPlural;
      result = `${majorWords} ${majorUnit}`;
    }
    
    if (minorAmount > 0) {
      const minorUnit = minorAmount === 1 ? minorUnitSingular : minorUnitPlural;
      if (result) {
        result += ` ${connector} ${minorWords} ${minorUnit}`;
      } else {
        result = `${minorWords} ${minorUnit}`;
      }
    }
    
    // Handle negative amounts
    if (amount < 0 && result) {
      result = `negative ${result}`;
    }
    
    return result;
  } catch (error) {
    console.warn('Failed to format currency with words:', error);
    return '';
  }
}
