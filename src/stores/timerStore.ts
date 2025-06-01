// stores/timerStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTimerStore = defineStore('timer', () => {
  const durasiTimer = ref(15)

  function setDurasi(value: number) {
    durasiTimer.value = value
    localStorage.setItem('durasi_timer', value.toString())
  }

  // Load dari localStorage saat store diinisialisasi
  if (localStorage.getItem('durasi_timer')) {
    durasiTimer.value = Number(localStorage.getItem('durasi_timer'))
  }

  return { durasiTimer, setDurasi }
})
