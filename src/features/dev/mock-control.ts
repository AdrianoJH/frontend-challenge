import { api } from '@/lib/axios';
import { queryClient } from '@/lib/query-client';
import type { ScenarioName } from '@/mocks/scenarios';

export const mockControl = {
  async setScenario(name: ScenarioName) {
    await api.post('/__mock__/scenario', { name });
    await queryClient.invalidateQueries();
  },
  async setFlags(patch: Record<string, unknown>) {
    await api.post('/__mock__/flags', patch);
  },
  async reset() {
    await api.post('/__mock__/reset');
    queryClient.clear();
  },
  async reprice(nftId: string, patch: { price?: string; editionsAvailable?: number }) {
    await api.post('/__mock__/reprice', { nftId, ...patch });
  },
};
