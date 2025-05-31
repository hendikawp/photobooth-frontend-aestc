<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<template>
  <div class="fullscreen bg-primary text-white text-center q-pa-md flex flex-center">
    <div>
      <h1 class="text-h3">CLiq Booth</h1>
      <p class="text-subtitle1 q-mt-md">{{ subtitleText }}</p>
      <q-btn label="🎬 Mulai" color="white" text-color="primary" class="q-mt-xl q-px-xl q-py-md" size="xl" unelevated rounded @click="start" />
    </div>
  </div>
</template>

// eslint-disable-next-line vue/block-lang
<script setup lang="ts">
defineOptions({ name: 'StartPage' })
import { useRouter } from 'vue-router'

const router = useRouter()

const subtitleText = 'Solusi photobooth modern, open-source, dan siap digunakan untuk acara kamu.'

function start() {
  router.push({ name: 'templateSelector' })
}
</script>
