<template>
  <div>
    <h2>Rules Manager</h2>

    <div v-if="loading">Loading rules...</div>

    <template v-else>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Pattern</th>
            <th>Match Type</th>
            <th>Category</th>
            <th>Sub-Category</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, idx) in rules" :key="rule.id">
            <td>
              <input type="number" v-model.number="rule.priority" style="width: 60px" />
            </td>
            <td><input type="text" v-model="rule.pattern" /></td>
            <td>
              <select v-model="rule.match_type">
                <option value="contains">Contains</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="regex">Regex</option>
                <option value="exact">Exact</option>
              </select>
            </td>
            <td><input type="text" v-model="rule.category" /></td>
            <td><input type="text" v-model="rule.sub_category" /></td>
            <td>
              <button @click="moveRule(idx, -1)" :disabled="idx === 0" title="Move Up">↑</button>
              <button @click="moveRule(idx, 1)" :disabled="idx === rules.length - 1" title="Move Down">↓</button>
              <button @click="deleteRule(idx)" title="Delete">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="grid" style="margin-top: 1rem">
        <h3>Add Rule</h3>
        <input type="text" v-model="newRule.pattern" placeholder="Pattern" />
        <select v-model="newRule.match_type">
          <option value="contains">Contains</option>
          <option value="starts_with">Starts With</option>
          <option value="ends_with">Ends With</option>
          <option value="regex">Regex</option>
          <option value="exact">Exact</option>
        </select>
        <input type="text" v-model="newRule.category" placeholder="Category" />
        <input type="text" v-model="newRule.sub_category" placeholder="Sub-Category (optional)" />
        <button @click="addRule">Add</button>
      </div>

      <button @click="saveRules" :disabled="saving" style="margin-top: 1rem">
        {{ saving ? 'Saving...' : 'Save All Rules' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'

const RULES_KEY = 'categorization_rules'
const rules = ref([])
const loading = ref(true)
const saving = ref(false)
const newRule = ref({
  pattern: '',
  match_type: 'contains',
  category: '',
  sub_category: '',
})

onMounted(async () => {
  await loadRules()
})

async function loadRules() {
  loading.value = true
  try {
    const res = await apiFetch(`/api/settings?key=${RULES_KEY}`)
    if (res.ok) {
      const data = await res.json()
      rules.value = Array.isArray(data.value) ? data.value : []
    } else {
      rules.value = []
    }
  } catch {
    rules.value = []
  } finally {
    loading.value = false
  }
}

function addRule() {
  if (!newRule.value.pattern || !newRule.value.category) return
  const maxPriority = rules.value.reduce((max, r) => Math.max(max, r.priority ?? 0), 0)
  rules.value.push({
    id: Date.now().toString(),
    pattern: newRule.value.pattern,
    match_type: newRule.value.match_type,
    category: newRule.value.category,
    sub_category: newRule.value.sub_category || null,
    priority: maxPriority + 1,
    tags: [],
  })
  newRule.value = { pattern: '', match_type: 'contains', category: '', sub_category: '' }
}

function deleteRule(idx) {
  rules.value.splice(idx, 1)
}

function moveRule(idx, direction) {
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= rules.value.length) return
  const temp = rules.value[idx]
  rules.value[idx] = rules.value[newIdx]
  rules.value[newIdx] = temp
  rules.value.forEach((r, i) => { r.priority = i + 1 })
}

async function saveRules() {
  saving.value = true
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: RULES_KEY, value: rules.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Error: ' + (err.error || 'Unknown error'))
    } else {
      alert('Rules saved')
    }
  } catch (e) {
    alert('Network error: ' + e.message)
  } finally {
    saving.value = false
  }
}
</script>
