import { ref } from 'vue'

const isOpen = ref(false)
const message = ref('')
const title = ref('')
let dialogEl = null

const titles = {
  success: 'Succès',
  error: 'Erreur',
  warning: 'Attention',
  info: 'Information',
}

export function useModal() {
  function open(msg, type = 'info') {
    title.value = titles[type] || titles.info
    message.value = msg
    isOpen.value = true
    dialogEl?.showModal()
  }

  function close() {
    dialogEl?.close()
    isOpen.value = false
  }

  function setEl(el) {
    dialogEl = el
  }

  return { isOpen, message, title, open, close, setEl }
}

const modal = useModal()
export function showSuccess(msg) { modal.open(msg, 'success') }
export function showError(msg) { modal.open(msg, 'error') }
export function showWarning(msg) { modal.open(msg, 'warning') }
