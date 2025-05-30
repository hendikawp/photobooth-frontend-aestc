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
          <img :src="`${API_BASE}/userdata/frame/${frame.name}`" :alt="frame.name" width="150" height="auto" loading="lazy" />
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
        <img v-if="selected" :src="`${API_BASE}/userdata/frame/${selected.name}`" :alt="selected.name" class="q-mt-lg selected-preview" />
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

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'

// Import store dan komponen
import { useStateStore } from '../stores/state-store'
import { useConfigurationStore } from '../stores/configuration-store'
import { default as PreviewStream } from '../components/PreviewStream.vue'
import CountdownTimer from '../components/CountdownTimer.vue'

// --- Inisialisasi ---
const router = useRouter()
const stateStore = useStateStore()
const configurationStore = useConfigurationStore()

// --- State Reaktif ---
const frames = ref([])
const selected = ref(null)
const showCountdownPreview = ref(false)
const showLetsGoAnimation = ref(false)

// --- Konstanta ---
const tokenKey = 'photobooth_access_token'
const API_BASE = 'http://localhost:9000' // Pastikan port ini sesuai dengan backend Anda

// --- Variabel Internal ---
let refreshInterval = null
let countdownTimeout = null
let letsGoTimeout = null

// --- Manajemen Token & Autentikasi ---
function getToken() {
  return localStorage.getItem(tokenKey)
}

function saveToken(newToken) {
  localStorage.setItem(tokenKey, newToken)
}

async function login() {
  try {
    const formData = new URLSearchParams()
    formData.append('grant_type', 'password')
    formData.append('username', 'admin')
    formData.append('password', '0000')
    formData.append('scope', '')
    formData.append('client_id', 'string')
    formData.append('client_secret', 'string')

    const res = await fetch(`${API_BASE}/api/admin/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formData.toString(),
    })

    if (!res.ok) throw new Error('Login gagal. Status: ' + res.status)
    const data = await res.json()
    saveToken(data.access_token)
    return data.access_token
  } catch (e) {
    console.error('Login error:', e)
    return null
  }
}

function isTokenValid(token) {
  if (!token) return false
  try {
    const decoded = jwtDecode(token)
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp > now + 60
  } catch {
    return false
  }
}

async function getValidToken() {
  let currentToken = getToken()
  if (!isTokenValid(currentToken)) {
    console.log('Token tidak valid atau kedaluwarsa, mencoba login ulang...')
    currentToken = await login()
  }
  return currentToken
}

// --- Pengambilan Data ---
async function loadFrames() {
  try {
    const validToken = await getValidToken()
    if (!validToken) {
      throw new Error('Tidak ada token valid untuk memuat frame.')
    }

    const res = await fetch(`${API_BASE}/api/admin/files/list/userdata/frame`, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    })
    if (!res.ok) throw new Error(`Gagal load list frame. Status: ${res.status}`)

    frames.value = await res.json()
  } catch (error) {
    console.error('Error load frames:', error)
  }
}

// --- Interaksi Pengguna & Update Konfigurasi ---
function selectFrame(frame) {
  selected.value = frame
}

async function updateServerConfig(frameFileName) {
  try {
    const configCopy = JSON.parse(JSON.stringify(configurationStore.configuration))

    if (
      configCopy.actions &&
      configCopy.actions.collage &&
      Array.isArray(configCopy.actions.collage) &&
      configCopy.actions.collage.length > 0 &&
      configCopy.actions.collage[0].processing
    ) {
      configCopy.actions.collage[0].processing.canvas_img_front_file = `userdata/frame/${frameFileName}`
    } else {
      throw new Error('Struktur konfigurasi tidak valid atau item kolase tidak ditemukan.')
    }

    const token = await getValidToken()
    if (!token) throw new Error('Token tidak tersedia.')

    const url = `${API_BASE}/api/admin/config/app?reload=true`
    console.log(`Mengirim PATCH ke: ${url}`)

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(configCopy),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Gagal update konfigurasi. Status: ${res.status} - ${errorText}`)
    }

    const responseData = await res.json()
    console.log('Konfigurasi berhasil diupdate di server. Respons:', responseData)

    await configurationStore.initStore(true)

    return true
  } catch (error) {
    console.error('updateServerConfig error:', error)
    alert(`Terjadi kesalahan saat menyimpan konfigurasi: ${error.message}`)
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

// --- Computed Property untuk Preview ---
const frameOverlayImage = computed(() => {
  return configurationStore.configuration.uisettings?.livestream_frameoverlay_image || ''
})

// --- Panggilan API Generik ---
async function invokeAction(path, id) {
  const url = `${API_BASE}/api/${path}/${id}`
  try {
    const token = await getValidToken()
    if (!token) throw new Error('Token tidak tersedia.')

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
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

// --- Lifecycle Hooks ---
async function refreshTokenPeriodically() {
  refreshInterval = setInterval(
    async () => {
      await getValidToken()
    },
    5 * 60 * 1000,
  )
}

onMounted(async () => {
  configurationStore.initStore()

  const validToken = await getValidToken()
  if (validToken) {
    await loadFrames()
    refreshTokenPeriodically()
  }
})

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
