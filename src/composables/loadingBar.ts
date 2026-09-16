import { computed, ref } from 'vue';

const activeCount = ref(0);

// A route navigation that gets redirected (e.g. the initial "/" -> "/home"
// -> "/login" chain) fires the router's beforeEach guard once per hop but
// only ever fires afterEach/onError once, for the final navigation. Counting
// those with the same activeCount used by withLoading() would leak: more
// starts than stops, leaving the bar stuck on forever. A separate flag sidesteps
// that — it only needs to go true/false, never accumulate.
const routeNavigating = ref(false);

export const isLoading = computed(() => activeCount.value > 0 || routeNavigating.value);

export function startLoading(): void {
  activeCount.value += 1;
}

export function stopLoading(): void {
  activeCount.value = Math.max(0, activeCount.value - 1);
}

export function startRouteNavigation(): void {
  routeNavigating.value = true;
}

export function endRouteNavigation(): void {
  routeNavigating.value = false;
}

export async function withLoading<T>(task: () => Promise<T>): Promise<T> {
  startLoading();
  try {
    return await task();
  } finally {
    stopLoading();
  }
}
