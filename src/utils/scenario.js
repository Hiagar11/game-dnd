export function getCurrentScenarioId(store) {
  return String(store?.currentScenario?.id ?? '')
}
