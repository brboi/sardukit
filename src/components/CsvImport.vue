<template>
  <div>
    <h2>Import CSV</h2>

    <div v-if="!parsed">
      <label>
        Skip header lines
        <input type="number" v-model.number="skipLines" min="0" max="20" />
      </label>

      <label>
        CSV File
        <input type="file" accept=".csv" @change="onFileSelect" />
      </label>

      <div v-if="rawHeaders.length" class="grid">
        <h3>Map Columns</h3>
        <div v-for="h in rawHeaders" :key="h">
          <label>{{ h }}</label>
          <select v-model="columnMap[h]">
            <option value="">-- ignore --</option>
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="description">Description</option>
          </select>
        </div>
        <button @click="parsePreview">Preview</button>
      </div>
    </div>

    <div v-else>
      <h3>Preview ({{ preview.length }} rows)</h3>
      <table>
        <thead>
          <tr><th>Date</th><th>Amount</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in preview.slice(0, 20)" :key="i">
            <td>{{ row.date }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.description }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="preview.length > 20">... and {{ preview.length - 20 }} more</p>

      <button @click="saveTransactions" :disabled="saving">
        {{ saving ? 'Saving...' : 'Save All' }}
      </button>
      <button @click="reset">Back</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { apiFetch } from '../services/api.js'

const skipLines = ref(0)
const rawHeaders = ref([])
const rawRows = ref([])
const columnMap = ref({})
const preview = ref([])
const parsed = ref(false)
const saving = ref(false)

function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const startIdx = skipLines.value
    if (startIdx >= lines.length) return
    rawHeaders.value = parseCSVLine(lines[startIdx])
    rawRows.value = lines.slice(startIdx + 1).map(parseCSVLine)
    columnMap.value = {}
    parsed.value = false
  }
  reader.readAsText(file)
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

function parsePreview() {
  const dateIdx = rawHeaders.value.findIndex(h => columnMap.value[h] === 'date')
  const amountIdx = rawHeaders.value.findIndex(h => columnMap.value[h] === 'amount')
  const descIdx = rawHeaders.value.findIndex(h => columnMap.value[h] === 'description')

  preview.value = rawRows.value
    .filter(row => row.length > Math.max(dateIdx, amountIdx, descIdx))
    .map(row => ({
      date: dateIdx >= 0 ? normalizeDate(row[dateIdx]) : '',
      amount: amountIdx >= 0 ? parseFloat(row[amountIdx].replace(/[^\d.-]/g, '')) : 0,
      description: descIdx >= 0 ? row[descIdx] : '',
    }))
    .filter(r => r.date || r.amount || r.description)

  parsed.value = true
}

function normalizeDate(val) {
  if (!val) return ''
  val = val.trim()
  const m = val.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return val
}

async function saveTransactions() {
  saving.value = true
  try {
    const res = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ transactions: preview.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Error: ' + (err.error || 'Unknown error'))
    } else {
      alert('Saved ' + preview.value.length + ' transactions')
    }
  } catch (e) {
    alert('Network error: ' + e.message)
  } finally {
    saving.value = false
  }
}

function reset() {
  parsed.value = false
  rawHeaders.value = []
  rawRows.value = []
  preview.value = []
}
</script>
