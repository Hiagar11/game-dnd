// Composable для путешествия по глобальной карте.
// Управляет полным циклом: подтверждение → вход → выбор маршрута → анимация → выход.
//
// Фазы (phase):
//   idle     — ничего не происходит
//   confirm  — попап «Вы уверены?»
//   entering — fade-to-black, переход к глобальной карте
//   choosing — на карте видны маршруты, игрок выбирает куда ехать
//   traveling — колесница движется по маршруту (загрузка сценария параллельно)
//   exiting  — fade-to-black, возврат к игровому полю

import { ref, computed, shallowRef } from 'vue'

const MIN_TRAVEL_MS = 8000
const FINISH_AFTER_LOAD_MS = 3000

export function useGlobalMapTravel({
  globalMapsStore,
  scenariosStore,
  gameStore,
  selectScenario,
  centerOnDoor,
  placeBuffer,
}) {
  const phase = ref('idle')
  const globalMap = shallowRef(null)
  const sourceStopUid = ref(null)
  const targetStopUid = ref(null)
  const chariotProgress = ref(0)
  const reachableStops = ref([])
  const travelPayload = ref(null)

  let _animFrameId = 0

  // ── Computed ───────────────────────────────────────────────────────────────

  const sourceStop = computed(() =>
    globalMap.value?.stops.find((s) => s.uid === sourceStopUid.value)
  )

  const targetStop = computed(() =>
    globalMap.value?.stops.find((s) => s.uid === targetStopUid.value)
  )

  const activePath = computed(() => {
    const src = sourceStopUid.value
    const dst = targetStopUid.value
    if (!src || !dst || !globalMap.value) return null
    return globalMap.value.paths.find(
      (p) => (p.from === src && p.to === dst) || (p.to === src && p.from === dst)
    )
  })

  /** Массив точек маршрута: [source, ...waypoints, target] */
  const pathPoints = computed(() => {
    const p = activePath.value
    const src = sourceStop.value
    const dst = targetStop.value
    if (!p || !src || !dst) return []

    const forward = p.from === sourceStopUid.value
    const wps = forward ? [...(p.waypoints ?? [])] : [...(p.waypoints ?? [])].reverse()

    return [{ x: src.x, y: src.y }, ...wps, { x: dst.x, y: dst.y }]
  })

  // ── Инициализация (вызывается из onGlobalMapExit) ─────────────────────────

  async function initTravel(payload) {
    const campaign = gameStore.activeCampaign
    if (!campaign?.globalMapId) return

    const edge = campaign.edges.find(
      (e) => String(e.from) === String(payload.sourceScenarioId) && e.to == null && e.stopUid
    )
    if (!edge) return

    travelPayload.value = payload
    sourceStopUid.value = edge.stopUid

    const map = await globalMapsStore.fetchMap(campaign.globalMapId)

    // Обогащаем остановки: если scenarioId не записан на остановке,
    // берём его из edge кампании (edge.from = scenarioId, edge.stopUid = stop.uid)
    for (const stop of map.stops) {
      if (stop.scenarioId) continue
      const e = campaign.edges.find((ed) => ed.to == null && ed.stopUid === stop.uid && ed.from)
      if (e) stop.scenarioId = e.from
    }

    globalMap.value = map

    reachableStops.value = _findReachable(map, edge.stopUid)
    phase.value = 'confirm'
  }

  function _findReachable(map, fromUid) {
    const campaign = gameStore.activeCampaign
    // Собираем set остановок, привязанных к сценариям через edges кампании
    const linkedStopUids = new Set(
      (campaign?.edges ?? [])
        .filter((e) => e.to == null && e.stopUid && e.from)
        .map((e) => e.stopUid)
    )

    return map.paths
      .filter((p) => p.from === fromUid || p.to === fromUid)
      .map((p) => {
        const uid = p.from === fromUid ? p.to : p.from
        return map.stops.find((s) => s.uid === uid)
      })
      .filter((s) => s && (s.scenarioId || linkedStopUids.has(s.uid)))
  }

  // ── Подтверждение ─────────────────────────────────────────────────────────

  function confirmTravel() {
    phase.value = 'entering'
  }

  function cancelTravel() {
    _reset()
  }

  // ── Вход на глобальную карту (вызывается overlay после css-перехода) ───────

  function onEnterComplete() {
    if (reachableStops.value.length === 1) {
      chooseDestination(reachableStops.value[0].uid)
    } else {
      phase.value = 'choosing'
    }
  }

  // ── Выбор направления ─────────────────────────────────────────────────────

  async function chooseDestination(stopUid) {
    targetStopUid.value = stopUid
    phase.value = 'traveling'
    chariotProgress.value = 0

    const stop = globalMap.value.stops.find((s) => s.uid === stopUid)
    const payload = travelPayload.value

    // scenarioId может храниться на самой остановке или в edge кампании
    const campaign = gameStore.activeCampaign
    const scenarioId =
      stop?.scenarioId ||
      (campaign?.edges ?? []).find((e) => e.to == null && e.stopUid === stopUid && e.from)?.from ||
      null

    const loadPromise = (async () => {
      if (!scenarioId) return
      const scenario = scenariosStore.scenarios.find((s) => String(s.id) === String(scenarioId))
      if (!scenario) return

      await selectScenario(scenario)

      const backDoor = gameStore.placedTokens.find(
        (t) => t.systemToken === 'door' && t.globalMapExit
      )
      if (backDoor) {
        centerOnDoor(backDoor)
        if (payload?.buffer?.length) {
          placeBuffer(backDoor, payload.buffer, payload.initiatorUid)
        }
      }
    })()

    await _animateChariot(loadPromise)

    phase.value = 'exiting'
  }

  // ── Выход из глобальной карты (вызывается overlay после css-перехода) ──────

  function onExitComplete() {
    _reset()
  }

  // ── Анимация колесницы ────────────────────────────────────────────────────

  function _animateChariot(loadPromise) {
    return new Promise((resolve) => {
      let dataReadyTime = null
      loadPromise.then(() => {
        dataReadyTime = performance.now()
      })

      const startTime = performance.now()

      function tick(now) {
        const elapsed = now - startTime

        if (dataReadyTime !== null) {
          // Данные готовы — финишируем за FINISH_AFTER_LOAD_MS,
          // но не быстрее MIN_TRAVEL_MS с начала
          const totalNeeded = Math.max(
            MIN_TRAVEL_MS,
            dataReadyTime - startTime + FINISH_AFTER_LOAD_MS
          )
          chariotProgress.value = Math.min(1, elapsed / totalNeeded)
        } else if (elapsed < MIN_TRAVEL_MS) {
          // Данные ещё грузятся — двигаемся до 80%
          chariotProgress.value = (elapsed / MIN_TRAVEL_MS) * 0.8
        } else {
          // Данные грузятся дольше 3 с — медленно ползём к 95%
          const extra = elapsed - MIN_TRAVEL_MS
          chariotProgress.value = 0.8 + 0.15 * (1 - Math.exp(-extra / 5000))
        }

        if (chariotProgress.value >= 1) {
          chariotProgress.value = 1
          cancelAnimationFrame(_animFrameId)
          resolve()
        } else {
          _animFrameId = requestAnimationFrame(tick)
        }
      }

      _animFrameId = requestAnimationFrame(tick)
    })
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function _reset() {
    cancelAnimationFrame(_animFrameId)
    phase.value = 'idle'
    globalMap.value = null
    travelPayload.value = null
    sourceStopUid.value = null
    targetStopUid.value = null
    chariotProgress.value = 0
    reachableStops.value = []
  }

  return {
    phase,
    globalMap,
    sourceStop,
    targetStop,
    chariotProgress,
    reachableStops,
    pathPoints,
    initTravel,
    confirmTravel,
    cancelTravel,
    onEnterComplete,
    chooseDestination,
    onExitComplete,
  }
}
