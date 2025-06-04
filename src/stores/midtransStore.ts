// stores/midtransStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMidtransStore = defineStore('midtrans', () => {
  const clientKey = ref('')
  const serverKey = ref('')
  const merchantId = ref('')
  const isProduction = ref(false)

  function setMidtransConfig(config: { clientKey: string; serverKey: string; merchantId: string; isProduction: boolean }) {
    clientKey.value = config.clientKey
    serverKey.value = config.serverKey
    merchantId.value = config.merchantId
    isProduction.value = config.isProduction

    // Simpan manual ke localStorage
    localStorage.setItem('midtrans_config', JSON.stringify(config))
  }

  // Load dari localStorage
  const saved = localStorage.getItem('midtrans_config')
  if (saved) {
    const parsed = JSON.parse(saved)
    clientKey.value = parsed.clientKey || ''
    serverKey.value = parsed.serverKey || ''
    merchantId.value = parsed.merchantId || ''
    isProduction.value = parsed.isProduction || false
  }

  return {
    clientKey,
    serverKey,
    merchantId,
    isProduction,
    setMidtransConfig,
  }
})
