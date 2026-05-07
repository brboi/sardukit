<template>
  <div>
    <h2>Import CSV</h2>

    <div v-if="!parsed">
      <label>
        Bank Source
        <input
          type="text"
          v-model="bankSource"
          list="bank-sources"
          placeholder="e.g. BNP, Belfius"
        />
        <datalist id="bank-sources">
          <option v-for="src in bankSources" :key="src" :value="src">{{ src }}</option>
        </datalist>
      </label>

      <label>
        Skip header lines
        <input type="number" v-model.number="skipLines" min="0" max="20" />
      </label>

      <label>
        CSV File
        <input type="file" accept=".csv" @change="onFileSelect" />
      </label>

      <div v-if="parsedHeaders.length" class="grid">
        <h3>Column Mapping (auto-detected)</h3>
        <div v-for="h in parsedHeaders" :key="h">
          <label>{{ h }}</label>
          <select v-model="columnMapping[h]">
            <option value="">-- ignore --</option>
            <option value="sequence_number">Sequence Number</option>
            <option value="extract_number">Extract Number</option>
            <option value="account_number">Account Number</option>
            <option value="execution_date">Execution Date</option>
            <option value="accounting_date">Accounting Date</option>
            <option value="value_date">Value Date</option>
            <option value="amount">Amount</option>
            <option value="currency">Currency</option>
            <option value="transaction_type">Transaction Type</option>
            <option value="counterparty_account">Counterparty Account</option>
            <option value="counterparty_name">Counterparty Name</option>
            <option value="counterparty_street">Counterparty Street</option>
            <option value="counterparty_city">Counterparty City</option>
            <option value="communication">Communication</option>
            <option value="details">Details</option>
            <option value="status">Status</option>
            <option value="rejection_reason">Rejection Reason</option>
            <option value="bic">BIC</option>
            <option value="country_code">Country Code</option>
          </select>
        </div>
        <button @click="parsePreview">Preview</button>
      </div>
    </div>

    <div v-else>
      <h3>Preview ({{ preview.length }} rows)</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Counterparty</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in preview.slice(0, 20)" :key="i">
            <td>{{ row.execution_date || row.accounting_date || row.value_date || '-' }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.counterparty_name || '-' }}</td>
            <td>{{ (row.details || '').slice(0, 80) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="preview.length > 20">... and {{ preview.length - 20 }} more</p>

      <button @click="saveTransactions" :disabled="saving || !bankSource">
        {{ saving ? 'Saving...' : 'Save All' }}
      </button>
      <button @click="reset">Back</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { parseCSV, detectColumns, mapRows } from '../services/csvParser.js'

const bankSource = ref('')
const bankSources = ref([])
const skipLines = ref(0)
const parsedHeaders = ref([])
const parsedRows = ref([])
const rawText = ref('')
const columnMapping = ref({})
const preview = ref([])
const parsed = ref(false)
const saving = ref(false)

onMounted(async () => {
  try {
    const res = await apiFetch('/api/transactions?sources_only=1')
    if (res.ok) {
      bankSources.value = await res.json()
    }
  } catch {
    // No sources yet
  }
})

watch(skipLines, () => {
  if (rawText.value) {
    reparse()
  }
})

function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    rawText.value = e.target.result
    reparse()
  }
  reader.readAsText(file)
}

function reparse() {
  const result = parseCSV(rawText.value, skipLines.value)
  parsedHeaders.value = result.headers
  parsedRows.value = result.rows

  const autoMapping = detectColumns(result.headers)
  columnMapping.value = {}
  result.headers.forEach((h, idx) => {
    const dbCol = Object.keys(autoMapping).find(k => autoMapping[k] === idx)
    columnMapping.value[h] = dbCol || ''
  })

  parsed.value = false
}

function parsePreview() {
  const colIdxMap = {}
  parsedHeaders.value.forEach((h, idx) => {
    if (columnMapping.value[h]) {
      colIdxMap[columnMapping.value[h]] = idx
    }
  })

  preview.value = mapRows(parsedRows.value, colIdxMap)
  parsed.value = true
}

async function saveTransactions() {
  if (!bankSource.value) return
  saving.value = true
  try {
    const res = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        bank_source: bankSource.value,
        transactions: preview.value,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Error: ' + (err.error || 'Unknown error'))
    } else {
      const data = await res.json()
      alert('Saved ' + data.saved + ' transactions')
    }
  } catch (e) {
    alert('Network error: ' + e.message)
  } finally {
    saving.value = false
  }
}

function reset() {
  parsed.value = false
  parsedHeaders.value = []
  parsedRows.value = []
  rawText.value = ''
  preview.value = []
  columnMapping.value = {}
}
</script>
