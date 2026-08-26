// app/composables/useSocket.ts
export function useSocket() {
  return useNuxtApp().$socket;
}