<template>
  <dialog ref="dialogEl" @close="onClose">
    <article>
      <header>
        <button aria-label="Close" class="close-btn" @click="close"></button>
        <h3>{{ title }}</h3>
      </header>
      <p>{{ message }}</p>
      <footer>
        <button @click="close">OK</button>
      </footer>
    </article>
  </dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModal } from '../composables/useModal.js'

const dialogEl = ref(null)
const { isOpen, message, title, close, setEl } = useModal()

onMounted(() => {
  setEl(dialogEl.value)
})

function onClose() {
  close()
}
</script>

<style scoped>
dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

dialog article {
  max-width: 400px;
}

.close-btn {
  float: right;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn::before {
  content: '✕';
}
</style>
