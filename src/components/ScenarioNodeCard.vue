<template>
  <!--
    Корневой элемент — сам .scenario-node div.
    @mousedown, @dblclick, @mouseenter, @mouseleave применяются снаружи
    через inheritAttrs и автоматически передаются на этот корневой элемент.
  -->
  <div
    class="scenario-node"
    :class="{
      'scenario-node--target': isTarget,
      'scenario-node--start': isStart,
    }"
    :style="{ left: node.x + 'px', top: node.y + 'px', width: nodeW + 'px', height: nodeH + 'px' }"
  >
    <div v-if="isStart" class="scenario-node__start-badge" title="Стартовая локация">⭐</div>

    <img
      v-if="node.scenario.mapImageUrl"
      :src="node.scenario.mapImageUrl"
      class="scenario-node__img"
      draggable="false"
    />
    <div v-else class="scenario-node__no-img">Нет карты</div>

    <div class="scenario-node__footer">
      <span class="scenario-node__name">{{ node.scenario.name || 'Без названия' }}</span>
      <button
        class="scenario-node__start-btn"
        :class="{ 'scenario-node__start-btn--active': isStart }"
        :title="isStart ? 'Снять как стартовую' : 'Назначить стартовой'"
        @mousedown.stop
        @click.stop="$emit('toggle-start', node.scenarioId)"
      >
        {{ isStart ? '★' : '☆' }}
      </button>
    </div>

    <!-- Золотая точка: потянуть к другой карточке чтобы создать связь -->
    <div
      class="scenario-node__port"
      title="Перетяните к другой карточке чтобы создать связь"
      @mousedown.stop="$emit('start-connect', $event)"
    />
  </div>
</template>

<script setup>
  defineProps({
    node: { type: Object, required: true },
    isStart: { type: Boolean, default: false },
    isTarget: { type: Boolean, default: false },
    nodeW: { type: Number, required: true },
    nodeH: { type: Number, required: true },
  })

  defineEmits(['start-connect', 'toggle-start'])
</script>

<style scoped>
  .scenario-node {
    position: absolute;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    overflow: visible;
    cursor: grab;
    user-select: none;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      border-color: rgb(200 154 74 / 50%);
    }

    &--target {
      border-color: var(--color-primary);
      box-shadow: 0 0 12px var(--color-primary-glow);
    }

    &--start {
      border-color: #facc15;
      box-shadow: 0 0 10px rgb(250 204 21 / 40%);
    }
  }

  .scenario-node__start-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 14px;
    line-height: 1;
    pointer-events: none;
    z-index: 3;
    filter: drop-shadow(0 0 3px rgb(250 204 21 / 80%));
  }

  .scenario-node__img {
    display: block;
    width: 100%;
    height: 74px;
    object-fit: cover;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    pointer-events: none;
  }

  .scenario-node__no-img {
    height: 74px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--color-text-muted);
    background: rgb(255 255 255 / 3%);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    pointer-events: none;
  }

  .scenario-node__footer {
    display: flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    gap: var(--space-1);
  }

  .scenario-node__name {
    flex: 1;
    font-size: 12px;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }

  .scenario-node__start-btn {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid rgb(255 255 255 / 20%);
    border-radius: 50%;
    background: rgb(0 0 0 / 40%);
    color: rgb(255 255 255 / 60%);
    font-size: 12px;
    line-height: 18px;
    text-align: center;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: rgb(0 0 0 / 70%);
      color: #facc15;
      border-color: #facc15;
    }

    &--active {
      background: rgb(0 0 0 / 70%);
      color: #facc15;
      border-color: #facc15;
    }
  }

  .scenario-node__port {
    position: absolute;
    right: -7px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg);
    cursor: crosshair;
    z-index: 2;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      transform: translateY(-50%) scale(1.4);
      box-shadow: 0 0 8px var(--color-primary-glow);
    }
  }
</style>
