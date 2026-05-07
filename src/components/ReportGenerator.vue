<template>
  <div>
    <h2>Report Generator</h2>

    <div v-if="!currentReport">
      <h3>Create New Report</h3>
      <div class="grid">
        <label>Name <input type="text" v-model="form.name" placeholder="Report name" /></label>
        <label>Year <input type="number" v-model.number="form.year" min="2000" max="2099" placeholder="2025" /></label>
        <label>Initial Balance <input type="number" step="0.01" v-model.number="form.initial_balance" /></label>
      </div>
      <button @click="createReport" :disabled="creating || !form.year">
        {{ creating ? 'Creating...' : 'Create Report' }}
      </button>
    </div>

    <template v-else>
      <h3>{{ currentReport.name }}</h3>
      <p>Year: {{ currentReport.year }}</p>

      <div class="grid">
        <button @click="generateReport" :disabled="generating">
          {{ generating ? 'Generating...' : 'Generate / Re-scan' }}
        </button>
        <button @click="currentReport = null">New Report</button>
      </div>

      <div v-if="breakdown.length" style="margin-top: 2rem">
        <h3>Balance Summary (Bilan)</h3>
        <table>
          <thead>
            <tr><th>Category</th><th>Sub-Category</th><th>Count</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in breakdown" :key="row.category + row.sub_category">
              <td>{{ row.category }}</td>
              <td>{{ row.sub_category || '-' }}</td>
              <td>{{ row.count }}</td>
              <td>{{ formatCurrency(row.total) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Initial Balance</strong></td>
              <td><strong>{{ formatCurrency(currentReport.initial_balance) }}</strong></td>
            </tr>
            <tr>
              <td colspan="3"><strong>Sum of Transactions</strong></td>
              <td><strong>{{ formatCurrency(sumTransactions) }}</strong></td>
            </tr>
            <tr :class="{ 'text-error': !isValid }">
              <td colspan="3"><strong>Expected Final Balance</strong></td>
              <td><strong>{{ formatCurrency(currentReport.initial_balance + sumTransactions) }}</strong></td>
            </tr>
            <tr>
              <td colspan="3"><strong>Reported Final Balance</strong></td>
              <td><strong>{{ formatCurrency(currentReport.final_balance) }}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p v-if="!isValid" style="color: var(--pico-color-red)">
          Warning: Balances do not match!
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiFetch } from '../services/api.js'

const currentReport = ref(null)
const creating = ref(false)
const generating = ref(false)
const breakdown = ref([])

const form = ref({
  name: '',
  year: new Date().getFullYear(),
  initial_balance: 0,
})

const sumTransactions = computed(() => {
  return breakdown.value.reduce((sum, row) => sum + parseFloat(row.total || 0), 0)
})

const isValid = computed(() => {
  if (!currentReport.value) return true
  const expected = parseFloat(currentReport.value.initial_balance) + sumTransactions.value
  const reported = parseFloat(currentReport.value.final_balance)
  return Math.abs(expected - reported) < 0.01
})

function formatCurrency(val) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val)
}

async function createReport() {
  if (!form.value.year) return
  creating.value = true
  try {
    const res = await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Error: ' + (err.error || 'Unknown error'))
    } else {
      currentReport.value = await res.json()
      breakdown.value = []
    }
  } catch (e) {
    alert('Network error: ' + e.message)
  } finally {
    creating.value = false
  }
}

async function generateReport() {
  if (!currentReport.value) return
  generating.value = true
  try {
    const res = await apiFetch(`/api/reports/generate?id=${currentReport.value.id}`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Error: ' + (err.error || 'Unknown error'))
    } else {
      const result = await res.json()
      alert(`Processed ${result.transactions_processed} transactions`)
      currentReport.value.final_balance = result.final_balance
      await loadBreakdown()
    }
  } catch (e) {
    alert('Network error: ' + e.message)
  } finally {
    generating.value = false
  }
}

async function loadBreakdown() {
  try {
    const res = await apiFetch(`/api/reports/generate?id=${currentReport.value.id}`)
    if (res.ok) {
      const data = await res.json()
      currentReport.value = data.report
      breakdown.value = data.breakdown
    }
  } catch {
    // ignore
  }
}
</script>
