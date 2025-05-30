<template>
  <div class="fullscreen bg-primary text-white text-center q-pa-md flex flex-center">
    <div>
      <h1 class="text-h3">CLiq Booth</h1>
      <p class="text-subtitle1 q-mt-md">Solusi photobooth modern, open-source, dan siap digunakan untuk acara kamu.</p>
      <q-btn label="🎬 Mulai" color="white" text-color="primary" class="q-mt-xl q-px-xl q-py-md" size="xl" unelevated rounded @click="start" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function start() {
  router.push({ name: 'templateSelector' })
}
</script>
