import { apiFetch } from './api.js'
import { showError, showSuccess } from '../composables/useModal.js'

export async function handleApi(res, { onSuccess, onError } = {}) {
  if (!res.ok) {
    const err = await res.json()
    const msg = 'Erreur: ' + (err.error || 'Erreur inconnue')
    if (onError) onError(msg)
    else showError(msg)
    return null
  }
  const data = await res.json()
  if (onSuccess) onSuccess(data)
  return data
}

export async function apiCall(path, options, { onSuccess, onError } = {}) {
  try {
    const res = await apiFetch(path, options)
    return handleApi(res, { onSuccess, onError })
  } catch (e) {
    const msg = 'Erreur réseau: ' + e.message
    if (onError) onError(msg)
    else showError(msg)
    return null
  }
}
