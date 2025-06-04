<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<template>
  <div>
    <h3>Scan QR Code untuk Bayar</h3>
    <div v-if="loading">Memuat...</div>
    <div v-else-if="error" style="color: red">{{ error }}</div>
    <div v-else>
      <img :src="qrSrc" alt="QR Code" />
      <p><a :href="snapUrl" target="_blank">Klik di sini jika tidak bisa scan QR</a></p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PaymentPage' })
import { ref, onMounted } from 'vue'

const loading = ref(true)
const error = ref(null)
const snapUrl = ref(null)
const qrSrc = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/api/midtrans/start', { method: 'POST' })
    if (!res.ok) {
      const errData = await res.json()
      error.value = errData.error || 'Gagal memuat Snap URL'
      loading.value = false
      return
    }
    const data = await res.json()
    snapUrl.value = data.snap_url
    if (!snapUrl.value) {
      error.value = 'Snap URL tidak ditemukan'
      loading.value = false
      return
    }
    qrSrc.value = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(snapUrl.value)}`
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>
