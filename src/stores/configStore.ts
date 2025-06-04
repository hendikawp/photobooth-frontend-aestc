/* eslint-disable @typescript-eslint/no-explicit-any */
// stores/configStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { _fetch } from '../util/fetch_api'
import { getAccessToken } from 'src/util/auth'
// Import store dan komponen

// Interface AppConfig tetap sama
export interface AppConfig {
  plugin_enabled: boolean
  url_payment: string
  timer_duration: number
}

export const useConfigStore = defineStore('config', () => {
  // --- STATE ---
  const config = ref<AppConfig>({
    plugin_enabled: true,
    url_payment: '',
    timer_duration: 15,
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- BAGIAN YANG DITAMBAHKAN KEMBALI: Inisialisasi dari LocalStorage ---
  // Saat store pertama kali dibuat, coba muat data yang sudah tersimpan.
  // Ini penting agar UI tidak "berkedip" dengan nilai default saat halaman di-refresh.
  const savedConfig = localStorage.getItem('app_config')
  if (savedConfig) {
    try {
      config.value = JSON.parse(savedConfig)
    } catch (e) {
      console.error('Gagal mem-parsing config dari localStorage', e)
    }
  }

  // --- ACTIONS ---
  /**
   * Mengambil seluruh data konfigurasi dari server menggunakan _fetch dengan otorisasi.
   */
  async function fetchConfigFromServer() {
    isLoading.value = true
    error.value = null
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Token otorisasi tidak ditemukan.')
      }

      const endpoint = '/api/admin/config/Customsetting.Customsetting'
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      const response = await _fetch(endpoint, {
        method: 'GET',
        headers: headers,
      })

      if (!response.ok) {
        throw new Error(`Gagal mengambil data dari server (status: ${response.status})`)
      }

      const data: AppConfig = await response.json()

      // Memperbarui state di Pinia
      config.value = data

      // --- BARIS YANG ANDA MINTA UNTUK DITAMBAHKAN ---
      // Menyimpan data yang baru diambil ke localStorage untuk persistensi
      localStorage.setItem('app_config', JSON.stringify(data))
    } catch (err: any) {
      console.error('Gagal mengambil konfigurasi dari API:', err)
      error.value = err.message || 'Terjadi kesalahan yang tidak diketahui.'
    } finally {
      isLoading.value = false
    }
  }

  // --- GETTERS (tetap sama) ---
  const timerDuration = computed(() => config.value.timer_duration)
  const isPluginEnabled = computed(() => config.value.plugin_enabled)
  const paymentUrl = computed(() => config.value.url_payment)

  // --- EXPOSE (tetap sama) ---
  return {
    config,
    isLoading,
    error,
    fetchConfigFromServer,
    timerDuration,
    isPluginEnabled,
    paymentUrl,
  }
})
