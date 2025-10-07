export interface Tip {
  id: string
  title: string
  description: string
  category: 'search' | 'shortcuts' | 'tools' | 'general'
  keywords?: string[]
}

export interface TipsConfig {
  autoRotate: boolean
  rotationInterval: number // in milliseconds
  showControls: boolean
}
