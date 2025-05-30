const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')
require('dotenv').config() // <= Load .env file

const app = express()
const PORT = 3000

app.use(cors({ origin: 'http://localhost:9000' }))

// Gunakan environment variable
const frameDir = process.env.FRAME_DIR

app.get('/api/frame-list', (req, res) => {
  fs.readdir(frameDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Gagal baca folder frame' })

    const pngFiles = files.filter((f) => f.endsWith('.png'))
    res.json(pngFiles)
  })
})

app.listen(PORT, () => {
  console.log(`Proxy server jalan di http://localhost:${PORT}`)
  console.log(`Mengambil frame dari: ${frameDir}`)
})
