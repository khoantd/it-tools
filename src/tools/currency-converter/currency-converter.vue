<script setup lang="ts">
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { currencyConverterService } from './currency-converter.service';
import { SUPPORTED_CURRENCIES, type Currency } from './currency-converter.types';
import { formatCurrencyWithWords } from './currency-converter.words';
import { useCopy } from '@/composable/copy';
import { useTracker } from '@/modules/tracker/tracker.services';

const { locale, t } = useI18n();
const { copy, isSupported } = useCopy();
const message = useMessage();
const { tracker } = useTracker();


const currencies = reactive<Record<string, { currency: Currency; value: number }>>({});

// Initialize currencies with default values
SUPPORTED_CURRENCIES.forEach((currency) => {
  currencies[currency.code] = {
    currency,
    value: currency.code === 'USD' ? 1 : 0,
  };
});

const isLoading = ref(false);
const error = ref<string | null>(null);
const lastUpdated = ref<Date | null>(null);
const exchangeRates = ref<Record<string, number>>({});
const focusedCurrency = ref<string | null>(null);

// Load exchange rates on component mount
onMounted(async () => {
  await loadExchangeRates();
});

async function loadExchangeRates() {
  isLoading.value = true;
  error.value = null;
  
  try {
    const rates = await currencyConverterService.getExchangeRates();
    exchangeRates.value = rates;
    
    const state = currencyConverterService.getState();
    lastUpdated.value = state.lastUpdated;
    
    // Update all currency values based on USD = 1
    updateAllCurrencies('USD');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load exchange rates';
    console.error('Error loading exchange rates:', err);
  } finally {
    isLoading.value = false;
  }
}

async function refreshRates() {
  isLoading.value = true;
  error.value = null;
  
  // Track refresh rates event
  tracker.trackEvent({ eventName: 'currency-refresh-rates' });
  
  try {
    const rates = await currencyConverterService.refreshRates();
    exchangeRates.value = rates;
    
    const state = currencyConverterService.getState();
    lastUpdated.value = state.lastUpdated;
    
    // Update all currency values based on USD = 1
    updateAllCurrencies('USD');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to refresh exchange rates';
    console.error('Error refreshing exchange rates:', err);
  } finally {
    isLoading.value = false;
  }
}

function updateAllCurrencies(changedCurrencyCode: string) {
  const changedValue = currencies[changedCurrencyCode].value;
  
  if (changedValue === 0) {
    // If the changed value is 0, set all others to 0
    Object.keys(currencies).forEach((code) => {
      if (code !== changedCurrencyCode) {
        currencies[code].value = 0;
      }
    });
    return;
  }

  // Convert from the changed currency to all others
  Object.keys(currencies).forEach((code) => {
    if (code !== changedCurrencyCode) {
      const convertedValue = currencyConverterService.convertCurrency(
        changedValue,
        changedCurrencyCode,
        code,
        exchangeRates.value
      );
      currencies[code].value = Math.round(convertedValue * 10000) / 10000; // Round to 4 decimal places
    }
  });
}

// Debounced update function to avoid excessive recalculations
const debouncedUpdate = _.debounce((currencyCode: string) => {
  updateAllCurrencies(currencyCode);
}, 100);

function onCurrencyChange(currencyCode: string) {
  debouncedUpdate(currencyCode);
  // Track currency conversion event
  tracker.trackEvent({ eventName: 'currency-conversion' });
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  return date.toLocaleString();
}

function getCurrencyNameInLocale(currencyCode: string): string {
  return t(`currencies.${currencyCode}.name`, currencies[currencyCode]?.currency.name || currencyCode);
}

function getAmountInWords(amount: number, currencyCode: string): string {
  if (amount === 0) return '';
  
  try {
    return formatCurrencyWithWords(amount, currencyCode, locale.value, t);
  } catch (error) {
    console.warn('Failed to convert amount to words:', error);
    return '';
  }
}

    async function copyAmountInWords(amount: number, currencyCode: string, event: Event) {
      // Prevent the click from causing focus loss
      event.preventDefault();
      event.stopPropagation();
      
      const words = getAmountInWords(amount, currencyCode);
      
      if (words && isSupported) {
        try {
          // Track copy amount in words event
          tracker.trackEvent({ eventName: 'currency-copy-amount-words' });
          
          // Create a localized success message with text interpolation
          const successMessage = t('tools.currency-converter.copy-success', `Copied "{text}" to clipboard`).replace('{text}', words);
          
          await copy(words, {
            notificationMessage: successMessage
          });
        } catch (error) {
          console.error('Copy failed:', error);
          // Fallback: try to show a simple success message even if copy fails
          message.success('Text copied to clipboard');
        }
      }
    }

function onCurrencyFocus(currencyCode: string) {
  focusedCurrency.value = currencyCode;
}

function onCurrencyBlur() {
  focusedCurrency.value = null;
}
</script>

<template>
  <div>
    <!-- Header with refresh button and status -->
    <div class="mb-4 flex items-center justify-between">
      
      <div class="flex items-center gap-2">
        <n-button
          :loading="isLoading"
          @click="refreshRates"
          type="primary"
          size="small"
        >
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </n-icon>
          </template>
          Refresh Rates
        </n-button>
        
        <div class="text-sm text-gray-500">
          Last updated: {{ formatLastUpdated(lastUpdated) }}
        </div>
      </div>
    </div>

    <!-- Error message -->
    <n-alert
      v-if="error"
      type="error"
      class="mb-4"
      closable
      @close="error = null"
    >
      {{ error }}
    </n-alert>

    <!-- Loading state -->
    <div v-if="isLoading && Object.keys(exchangeRates).length === 0" class="text-center py-8">
      <n-spin size="large" />
      <div class="mt-2 text-gray-500">Loading exchange rates...</div>
    </div>


    <!-- Currency converter -->
    <div v-else>
       
    <div>
      <!-- Info message -->
      <n-alert type="info" class="mt-4">
         <template #header>
           <div class="font-medium">{{ t('tools.currency-converter.how-it-works.title') }}</div>
         </template>
         <div class="text-sm">
           {{ t('tools.currency-converter.how-it-works.description') }}
         </div>
        </n-alert>
      </div>
      <br />
      <div v-for="[code, { currency, value }] in Object.entries(currencies)" :key="code" class="mb-3">
        <n-input-group w-full>
          <n-input-group-label style="width: 120px">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ currency.code }}</span>
              <span class="text-gray-500 text-sm">{{ currency.symbol }}</span>
            </div>
          </n-input-group-label>

          <n-input-number
            :value="value"
            style="flex: 1"
            :precision="4"
            :show-button="false"
            @update:value="(newValue: number | null) => { currencies[code].value = newValue || 0; onCurrencyChange(code); }"
            @focus="onCurrencyFocus(code)"
          />

          <n-input-group-label style="width: 200px">
            <div class="text-sm text-gray-600">
              {{ getCurrencyNameInLocale(code) }}
            </div>
          </n-input-group-label>
        </n-input-group>

        <!-- Show amount in words for focused currency -->
        <div v-if="focusedCurrency === code && value > 0" class="ml-4 mt-2">
          <div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div class="text-sm text-gray-700 dark:text-gray-300 flex-1">
              {{ getAmountInWords(value, code) }}
            </div>
            <n-button
              v-if="isSupported"
              size="tiny"
              type="primary"
              ghost
              @click="copyAmountInWords(value, code, $event)"
              class="shrink-0"
              :title="'Copy to clipboard'"
            >
              <template #icon>
                <n-icon>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </div>

    
  </div>
</template>
