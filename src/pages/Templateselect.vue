<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<template>
  <div
    class="fullscreen bg-primary text-white text-center row flex-center"
    style="padding-left: 32px; padding-right: 32px; padding-top: 16px; padding-bottom: 16px"
  >
    <div class="col-9 scroll-area q-pr-md" :class="{ 'hidden-on-preview': showCountdownPreview || showLetsGoAnimation }">
      <h2 class="text-center">Pilih Template Frame</h2>
      <div class="frame-list q-mt-md">
        <div
          v-for="(frame, idx) in frames"
          :key="idx"
          class="frame-item"
          :class="{ selected: frame.name === selected?.name }"
          @click="selectFrame(frame)"
        >
          <img :src="`/userdata/frame/${frame.name}`" :alt="frame.name" width="150" height="auto" loading="lazy" />
        </div>
      </div>
    </div>

    <div
      class="col-3 q-pl-md sticky-frame"
      :class="{ 'hidden-on-preview': showCountdownPreview || showLetsGoAnimation }"
      style="position: sticky; top: 80px"
    >
      <h3 class="text-center">Preview Pilihan</h3>

      <div v-if="selected" class="q-mt-md text-center">
        <q-btn unelevated rounded color="white" text-color="primary" class="q-mt-xl q-px-xl q-py-md" size="xl" @click="handleCollageAction">
          Lanjut
        </q-btn>
      </div>

      <transition name="fade-zoom">
        <img v-if="selected" :src="`/userdata/frame/${selected.name}`" :alt="selected.name" class="q-mt-lg selected-preview" />
      </transition>
    </div>

    <div v-if="showCountdownPreview" class="fullscreen column justify-center items-center preview-overlay">
      <preview-stream
        :frame-overlay-image="frameOverlayImage"
        :enable-blurred-background-stream="configurationStore.configuration.uisettings.livestream_blurredbackground"
        :enable-mirror-effect-stream="configurationStore.configuration.uisettings.livestream_mirror_effect"
        :enable-mirror-effect-frame="configurationStore.configuration.uisettings.livestream_frameoverlay_mirror_effect"
      ></preview-stream>

      <div
        id="frontpage-countdown"
        style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 32px;
          background-color: rgba(0, 0, 0, 0.6);
          border-radius: 12px;
        "
      >
        <h2 class="preview-title" style="color: white; text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5); margin: 0">Sesi Anda akan dimulai dalam</h2>

        <countdown-timer
          ref="countdowntimer"
          :duration="15"
          number-color="limegreen"
          number-font-size="4rem"
          number-font-weight="bold"
        ></countdown-timer>
      </div>
    </div>

    <div v-if="showLetsGoAnimation" class="fullscreen column justify-center items-center lets-go-overlay">
      <h1 class="lets-go-text">Let's Go!</h1>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAccessToken } from 'src/util/auth'

// Import store dan komponen
import { useConfigurationStore } from '../stores/configuration-store'
import { default as PreviewStream } from '../components/PreviewStream.vue'
import CountdownTimer from '../components/CountdownTimer.vue'

import { Notify } from 'quasar'
// --- State Reaktif ---
const selected = ref(null)
const showCountdownPreview = ref(false)
const showLetsGoAnimation = ref(false)

// --- Router instance ---
const router = useRouter()

// --- Variabel Internal ---
const refreshInterval = null
let countdownTimeout = null
let letsGoTimeout = null

// --- Interaksi Pengguna & Update Konfigurasi ---
function selectFrame(frame) {
  selected.value = frame
}

// akses Pinia store konfigurasi
const configurationStore = useConfigurationStore()

// reactive local copy untuk binding (jika perlu)
const configuration = ref(configurationStore.configuration)

// fungsi untuk update properti spesifik
function updateServerConfig(frame: string): boolean {
  if (
    configuration.value.actions &&
    Array.isArray(configuration.value.actions.collage) &&
    configuration.value.actions.collage[0] &&
    configuration.value.actions.collage[0].processing
  ) {
    configuration.value.actions.collage[0].processing.canvas_img_front_file = frame

    // update juga di store (sinkronisasi)
    configurationStore.configuration = configuration.value
    // Log nilai yang diperbarui
    console.log('Frame updated to:', frame)
    console.log('Updated config:', configuration.value.actions.collage[0].processing)

    Notify.create({
      message: 'Canvas image front file updated!',
      color: 'positive',
    })
    return true
  } else {
    Notify.create({
      message: 'Structure not found or invalid!',
      color: 'negative',
    })
    return false
  }
}

async function handleCollageAction() {
  if (!selected.value) {
    alert('Silakan pilih frame terlebih dahulu.')
    return
  }

  const updateSuccess = await updateServerConfig(selected.value.name)

  if (updateSuccess) {
    if (updateSuccess) {
      showCountdownPreview.value = true

      countdownTimeout = setTimeout(() => {
        showCountdownPreview.value = false
        showLetsGoAnimation.value = true

        letsGoTimeout = setTimeout(async () => {
          showLetsGoAnimation.value = false
          await invokeAction('actions/collage', 0)
        }, 2000) // Durasi animasi 2 detik
      }, 15000) // Durasi hitung mundur 15 detik
    }
  }
}

// --- Computed Property untuk Preview ---
const frameOverlayImage = computed(() => {
  return configurationStore.configuration.uisettings?.livestream_frameoverlay_image || ''
})

async function invokeAction(path, id) {
  const url = `/api/${path}/${id}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Gagal menjalankan aksi. Status: ${res.status} - ${errorText}`)
    }

    const data = await res.json().catch(() => ({}))
    console.log('Aksi berhasil:', data)

    if (data && data.redirect_url) {
      window.location.href = data.redirect_url
    } else {
      router.push({ name: 'indexPage' })
    }
  } catch (error) {
    console.error('invokeAction error:', error)
  }
}

const frames = ref([])

onMounted(async () => {
  await loadFrames()
})

async function loadFrames() {
  try {
    const token = getAccessToken()
    if (!token) {
      throw new Error('No access token available')
    }

    const response = await fetch('/api/admin/files/list/userdata/frame', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    frames.value = Array.isArray(result) ? result : []
  } catch (error) {
    console.error('Error load frames:', error)
  }
}

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  if (countdownTimeout) clearTimeout(countdownTimeout)
  if (letsGoTimeout) clearTimeout(letsGoTimeout)
})
</script>

<style scoped>
.scroll-area {
  max-height: 100vh;
  overflow-y: auto;
}

.frame-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: flex-start;
}

.frame-item {
  border: 3px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition:
    transform 0.3s,
    border-color 0.3s;
}

.frame-item:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.5);
}

.frame-item.selected {
  border-color: #fff;
  transform: scale(1.05);
}

.sticky-frame {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 16px;
}

.selected-preview {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

/* Animasi transisi */
.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition: all 0.5s ease;
}
.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Gaya untuk Overlay */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Menyembunyikan elemen utama saat overlay aktif */
.hidden-on-preview {
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0s 0.5s,
    opacity 0.5s ease;
}

/* Gaya untuk Animasi "Let's Go" */
.lets-go-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  z-index: 2000;
}

.lets-go-text {
  font-size: 10rem;
  font-weight: bold;
  color: limegreen;
  text-shadow:
    0 0 20px limegreen,
    0 0 40px rgba(0, 255, 0, 0.5);
  animation: pop-in 1.5s ease-out forwards;
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  70% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
