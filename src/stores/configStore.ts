import { getAccessToken } from 'src/util/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Interface CustomConfig yang fleksibel dengan Index Signature.
 */
export interface CustomConfig {
  // Properti yang sudah dikenal untuk type-safety
  plugin_enabled: boolean
  url_payment: string
  timer_duration: number

  // Index Signature untuk properti tambahan dari API
  [key: string]: unknown
}

export const useConfigStore = defineStore('customConfig', () => {
  // State Awal: Sediakan nilai default yang aman untuk render awal.
  const config = ref<CustomConfig>({
    plugin_enabled: false,
    url_payment: '',
    timer_duration: 0,
  })

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function loadConfig() {
    isLoading.value = true
    error.value = null
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/admin/config/Customsetting.Customsetting', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const resultFromApi: CustomConfig = await response.json()

      // Menggabungkan state default dengan data dari API.
      // Ini memastikan semua properti baru dari API akan ditambahkan ke state.
      config.value = { ...config.value, ...resultFromApi }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred'
      error.value = errorMessage
      console.error('Error loading custom config:', errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  return {
    config,
    isLoading,
    error,
    loadConfig,
  }
})
