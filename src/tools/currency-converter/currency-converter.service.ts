import type { ExchangeRates, ExchangeRateResponse, CurrencyConverterState } from './currency-converter.types';

class CurrencyConverterService {
  private state: CurrencyConverterState = {
    rates: {},
    lastUpdated: null,
    isLoading: false,
    error: null,
  };

  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

  async getExchangeRates(): Promise<ExchangeRates> {
    // Check if we have cached rates that are still valid
    if (this.state.lastUpdated && this.isCacheValid()) {
      return this.state.rates;
    }

    // If already loading, wait for the current request
    if (this.state.isLoading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!this.state.isLoading) {
            resolve(this.state.rates);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    this.state.isLoading = true;
    this.state.error = null;

    try {
      const response = await fetch(this.API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ExchangeRateResponse = await response.json();
      
      // Store the rates with USD as base
      this.state.rates = data.rates;
      this.state.lastUpdated = new Date();
      this.state.isLoading = false;

      return this.state.rates;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to fetch exchange rates';
      this.state.isLoading = false;
      
      // If we have old rates, return them as fallback
      if (Object.keys(this.state.rates).length > 0) {
        console.warn('Using cached exchange rates due to API error:', this.state.error);
        return this.state.rates;
      }
      
      throw error;
    }
  }

  convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // If converting from USD, use direct rate
    if (fromCurrency === 'USD') {
      return amount * (rates[toCurrency] || 0);
    }

    // If converting to USD, divide by the rate
    if (toCurrency === 'USD') {
      return amount / (rates[fromCurrency] || 1);
    }

    // For any-to-any conversion: convert to USD first, then to target currency
    const usdAmount = amount / (rates[fromCurrency] || 1);
    return usdAmount * (rates[toCurrency] || 0);
  }

  getState(): CurrencyConverterState {
    return { ...this.state };
  }

  async refreshRates(): Promise<ExchangeRates> {
    // Force refresh by clearing cache
    this.state.lastUpdated = null;
    return this.getExchangeRates();
  }

  private isCacheValid(): boolean {
    if (!this.state.lastUpdated) {
      return false;
    }
    
    const now = new Date();
    const timeDiff = now.getTime() - this.state.lastUpdated.getTime();
    return timeDiff < this.CACHE_DURATION;
  }
}

export const currencyConverterService = new CurrencyConverterService();
