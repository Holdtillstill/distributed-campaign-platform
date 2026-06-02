/// <reference types="vite/client" />

declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiBaseUrl?: string
      enableDesignRoutes?: boolean
      grafanaUrl?: string
      tempoUrl?: string
      prometheusUrl?: string
    }
  }
}

export {}
