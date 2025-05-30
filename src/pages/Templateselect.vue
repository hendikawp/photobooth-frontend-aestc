<template>
  <div
    class="fullscreen bg-primary text-white text-center row flex-center"
    style="padding-left: 32px; padding-right: 32px; padding-top: 16px; padding-bottom: 16px"
  >
    <div class="col-9 scroll-area q-pr-md" :class="{ 'hidden-on-preview': showCountdownPreview }">
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

    <div class="col-3 q-pl-md sticky-frame" :class="{ 'hidden-on-preview': showCountdownPreview }" style="position: sticky; top: 80px">
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
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue' // Tambahkan 'computed', 'nextTick'
import { jwtDecode } from 'jwt-decode'

// Import store dan komponen yang diperlukan untuk preview
import { useStateStore } from '../stores/state-store'
import { useConfigurationStore } from '../stores/configuration-store'
import { default as PreviewStream } from '../components/PreviewStream.vue'
import CountdownTimer from '../components/CountdownTimer.vue' // Import CountdownTimer

const router = useRouter()
const stateStore = useStateStore() // Inisialisasi store
const configurationStore = useConfigurationStore() // Inisialisasi store

const frames = ref([])
const selected = ref(null)
const tokenKey = 'photobooth_access_token'
const API_BASE = 'http://localhost:9000'

let refreshInterval = null
let countdownTimeout = null // Untuk mengelola timeout preview

// State baru untuk mengontrol tampilan preview dan overlay
const showCountdownPreview = ref(false)

function goToIndexPage() {
  router.push({ name: 'indexPage' })
}

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
    // alert('Login otomatis gagal. Pastikan aplikasi backend berjalan dan kredensial benar.') // Dihapus sesuai permintaan
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
    // alert('Gagal memuat daftar frame. Coba refresh halaman.') // Dihapus sesuai permintaan
  }
}

function selectFrame(frame) {
  selected.value = frame
}

async function refreshTokenPeriodically() {
  refreshInterval = setInterval(
    async () => {
      const currentToken = getToken()
      if (!isTokenValid(currentToken) || jwtDecode(currentToken).exp < Math.floor(Date.now() / 1000) + 5 * 60) {
        console.log('Token expired atau hampir expired, login ulang...')
        await login()
      }
    },
    5 * 60 * 1000,
  )
}

// Computed property frameOverlayImage yang dibutuhkan PreviewStream
const frameOverlayImage = computed(() => {
  // Anda bisa menyesuaikan logika ini. Misalnya, mengambil overlay dari frame yang dipilih jika ada
  return configurationStore.configuration.uisettings.livestream_frameoverlay_image || ''
})

// --- Fungsi Baru untuk Menangani Aksi Kolase ---
async function handleCollageAction() {
  // 1. Tampilkan preview dan overlay
  showCountdownPreview.value = true

  // 2. Tunggu 15 detik
  countdownTimeout = setTimeout(async () => {
    // 3. Sembunyikan preview
    showCountdownPreview.value = false
    // 4. Lanjutkan dengan invokeAction
    await invokeAction('actions/collage', 0)
  }, 15 * 1000) // 15 detik
}

// Fungsi untuk memanggil aksi API (sudah dimodifikasi sebelumnya tanpa alert)
async function invokeAction(path, id) {
  const url = `${API_BASE}/api/${path}/${id}`
  try {
    const token = await getValidToken()
    if (!token) {
      console.error('Token tidak tersedia. Tidak dapat menjalankan aksi.')
      return
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`Gagal menjalankan aksi. Status: ${res.status} - ${errorText}`)
      return
    }

    let data = {}
    try {
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await res.json()
        if (jsonResponse) {
          data = jsonResponse
        }
      } else {
        const textResponse = await res.text()
        console.log('Respons non-JSON dari API:', textResponse)
      }
    } catch (e) {
      console.warn('Gagal parse respons API sebagai JSON (mungkin kosong atau format lain):', e)
    }

    console.log('Aksi berhasil (respons diproses):', data)

    if (data && typeof data === 'object' && data.redirect_url) {
      window.location.href = data.redirect_url
    } else {
      console.warn('Aksi berhasil dieksekusi, namun tidak ada redirect_url yang disediakan atau respons bukan objek yang diharapkan:', data)
      router.push({ name: 'indexPage' })
    }
  } catch (error) {
    console.error('invokeAction error:', error)
  }
}

onMounted(async () => {
  const validToken = await getValidToken()
  if (validToken) {
    await loadFrames()
    refreshTokenPeriodically()
  }
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  if (countdownTimeout) clearTimeout(countdownTimeout) // Bersihkan timeout saat unmount
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
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition:
    transform 0.3s,
    border-color 0.3s;
}

.frame-item:hover {
  transform: scale(1.05);
}

.frame-item.selected {
  border-color: #fff;
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
}

.selected-preview {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
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

/* --- Gaya untuk Overlay --- */
.preview-overlay {
  position: fixed; /* Menjadikan overlay menutupi seluruh layar */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85); /* Latar belakang semi-transparan */
  z-index: 1000; /* Pastikan di atas elemen lain */
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-overlay .q-spinner-grid,
.preview-overlay .q-spinner-puff {
  position: absolute; /* Pastikan spinner overlay di tengah */
  z-index: 1001;
}

/* Menyembunyikan elemen utama saat preview overlay aktif */
.hidden-on-preview {
  display: none !important;
}
</style>
