export type ScenarioName = 'default' | 'empty' | 'slow' | 'flaky' | 'offline';

export interface NetworkConditions {
  latencyMin: number;
  latencyMax: number;
  failureRate: number;
  outOfOrder: boolean;
  offline: boolean;
  forceEmptyCatalog: boolean;
}

export type OrderOutcome = 'confirmed' | 'rejected' | 'timeout';

export interface BusinessFlags {
  orderOutcome: OrderOutcome;
  repriceNftId: string | null;
  forceSessionExpired: boolean;
}

export interface Scenario {
  network: NetworkConditions;
  flags: BusinessFlags;
}

const DEFAULT_FLAGS: BusinessFlags = {
  orderOutcome: 'confirmed',
  repriceNftId: null,
  forceSessionExpired: false,
};

export const SCENARIOS: Record<ScenarioName, Scenario> = {
  default: {
    network: { latencyMin: 120, latencyMax: 420, failureRate: 0, outOfOrder: false, offline: false, forceEmptyCatalog: false },
    flags: { ...DEFAULT_FLAGS },
  },
  empty: {
    network: { latencyMin: 120, latencyMax: 300, failureRate: 0, outOfOrder: false, offline: false, forceEmptyCatalog: true },
    flags: { ...DEFAULT_FLAGS },
  },
  slow: {
    network: { latencyMin: 1500, latencyMax: 3200, failureRate: 0, outOfOrder: true, offline: false, forceEmptyCatalog: false },
    flags: { ...DEFAULT_FLAGS },
  },
  flaky: {
    network: { latencyMin: 200, latencyMax: 1600, failureRate: 0.35, outOfOrder: true, offline: false, forceEmptyCatalog: false },
    flags: { ...DEFAULT_FLAGS },
  },
  offline: {
    network: { latencyMin: 0, latencyMax: 0, failureRate: 0, outOfOrder: false, offline: true, forceEmptyCatalog: false },
    flags: { ...DEFAULT_FLAGS },
  },
};

const SCENARIO_KEY = 'nftm.mock.scenario';
const FLAGS_KEY = 'nftm.mock.flags';

function clone(s: Scenario): Scenario {
  return { network: { ...s.network }, flags: { ...s.flags } };
}

let current: Scenario = loadInitial();

function loadInitial(): Scenario {
  const envName = (import.meta.env.VITE_MOCK_SCENARIO as ScenarioName) ?? 'default';
  let base = clone(SCENARIOS[envName] ?? SCENARIOS.default);
  try {
    const savedName = localStorage.getItem(SCENARIO_KEY) as ScenarioName | null;
    if (savedName && SCENARIOS[savedName]) base = clone(SCENARIOS[savedName]);
    const savedFlags = localStorage.getItem(FLAGS_KEY);
    if (savedFlags) base.flags = { ...base.flags, ...JSON.parse(savedFlags) };
  } catch {
    /* ignore */
  }
  return base;
}

export function getScenario(): Scenario {
  return current;
}

export function setScenario(name: ScenarioName): Scenario {
  current = clone(SCENARIOS[name] ?? SCENARIOS.default);
  try {
    localStorage.setItem(SCENARIO_KEY, name);
    localStorage.removeItem(FLAGS_KEY);
  } catch {
    /* ignore */
  }
  return current;
}

export function setFlags(patch: Partial<BusinessFlags>): BusinessFlags {
  current.flags = { ...current.flags, ...patch };
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify(current.flags));
  } catch {
    /* ignore */
  }
  return current.flags;
}

export function resetScenario(): void {
  current = clone(SCENARIOS.default);
  try {
    localStorage.removeItem(SCENARIO_KEY);
    localStorage.removeItem(FLAGS_KEY);
  } catch {
    /* ignore */
  }
}
