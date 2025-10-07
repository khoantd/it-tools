import type { Component } from 'vue';

export interface SearchResult {
  type: 'tool' | 'external'
  name: string
  description: string
  icon: Component
  action: () => void
  url?: string
  keywords?: string[]
  category?: string
}

export interface ExternalShortcut {
  name: string
  description: string
  icon: Component
  searchUrl: string
  prefix: string
  keywords: string[]
}

export interface GroupedSearchResults {
  name: string
  items: SearchResult[]
}
