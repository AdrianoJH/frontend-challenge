import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { env } from '@/lib/env';
import { mockControl } from '@/features/dev/mock-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { ScenarioName } from '@/mocks/scenarios';

const OPTIONS: Array<{ value: ScenarioName; label: string }> = [
  { value: 'default', label: 'Padrão' },
  { value: 'empty', label: 'Catálogo vazio' },
  { value: 'slow', label: 'Rede lenta' },
  { value: 'flaky', label: 'Rede instável' },
  { value: 'offline', label: 'Offline' },
];

export function ScenarioSwitcher() {
  const { toast } = useToast();
  const [scenario, setScenario] = useState<ScenarioName>(
    (import.meta.env.VITE_MOCK_SCENARIO as ScenarioName) ?? 'default',
  );

  if (!env.enableMocks) return null;

  async function change(name: ScenarioName) {
    setScenario(name);
    await mockControl.setScenario(name);
    toast({ title: 'Cenário aplicado', description: OPTIONS.find((o) => o.value === name)?.label });
  }

  async function reset() {
    await mockControl.reset();
    setScenario('default');
    toast({ title: 'Mocks reiniciados', variant: 'success' });
  }

  return (
    <div className="flex items-center gap-2" aria-label="Controle de cenário dos mocks">
      <span className="text-xs">Cenário:</span>
      <Select value={scenario} onValueChange={(v) => change(v as ScenarioName)}>
        <SelectTrigger className="h-8 w-40 text-xs" aria-label="Selecionar cenário">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={reset} aria-label="Reiniciar mocks">
        <RotateCcw className="size-3.5" /> Reset
      </Button>
    </div>
  );
}
