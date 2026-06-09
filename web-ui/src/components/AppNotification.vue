<script setup lang="ts">
defineProps<{
  type: 'success' | 'error'
  message: string
}>()
</script>

<template>
  <div
    :class="[
      'rounded-md px-4 py-3 text-sm font-medium',
      type === 'success'
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
    ]"
  >
    {{ message }}
  </div>
</template>
