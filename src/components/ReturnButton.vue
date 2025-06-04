<template>
  <!-- show back button on all pages except / -->

  <q-page-sticky position="top-left" class="q-ma-lg">
    <q-btn id="layout-button-back" color="primary" rounded no-caps @click="goToPaymentUrl" class="action-button glass-effect">
      <q-icon left :name="icon" />
      <div>{{ t('BTN_LABEL_BACK') }}</div>
    </q-btn>
  </q-page-sticky>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { QBtn, QIcon } from 'quasar'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useConfigStore } from '../stores/configStore' // 1. Import store

// --- Menggabungkan semua setup script ---
const { t } = useI18n()

// Ambil props
const { icon = 'sym_o_arrow_back_ios_new' } = defineProps<{
  icon?: string
}>()

// 2. Panggil dan gunakan config store
const configStore = useConfigStore()
// 3. Ambil 'config' dari store dengan reaktivitas menggunakan storeToRefs
const { config } = storeToRefs(configStore)

// 4. Buat fungsi untuk navigasi ke URL pembayaran
const goToPaymentUrl = () => {
  // Pastikan URL ada sebelum mencoba mengarahkan
  if (config.value.url_payment) {
    window.location.href = config.value.url_payment
  } else {
    console.warn('url_payment tidak tersedia di dalam config.')
  }
}
onMounted(() => {
  // Tambahkan log ini untuk memastikan kode ini berjalan
  console.log('App.vue mounted, memanggil loadConfig()...')

  configStore.loadConfig()
})
// 'defineEmits' tidak diperlukan lagi dan sudah dihapus.
</script>

<style lang="scss"></style>
