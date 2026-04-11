<template>
  <button class="end-turn" @click="onClick" @mouseenter="playHover">
    <span class="end-turn__glow" />

    <!-- Песочные часы SVG -->
    <svg class="end-turn__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Верхняя рамка -->
      <path d="M5 2h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      <!-- Нижняя рамка -->
      <path d="M5 22h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      <!-- Корпус часов -->
      <path
        d="M7 2v3.5c0 1.4.6 2.7 1.6 3.6L12 12l-3.4 2.9A5 5 0 0 0 7 18.5V22"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <path
        d="M17 2v3.5a5 5 0 0 1-1.6 3.6L12 12l3.4 2.9A5 5 0 0 1 17 18.5V22"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <!-- Песок сверху -->
      <path
        d="M9 5.5h6"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        class="end-turn__sand-top"
      />
      <!-- Песок снизу (заполненный треугольник) -->
      <path
        d="M9 18.5c0 0 1.2-2.5 3-2.5s3 2.5 3 2.5H9z"
        fill="currentColor"
        class="end-turn__sand-bot"
      />
    </svg>

    <span class="end-turn__label">Закончить ход</span>
  </button>
</template>

<script setup>
  import { useGameStore } from '../stores/game'
  import { useSound } from '../composables/useSound'

  const store = useGameStore()
  const { playHover, playNext } = useSound()

  function onClick() {
    playNext()
    store.endTurn()
  }
</script>

<style scoped>
  .end-turn {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 14px;
    background: linear-gradient(135deg, rgb(30 15 5 / 95%), rgb(60 30 8 / 95%));
    border: 1px solid rgb(180 120 40 / 50%);
    border-radius: 8px;
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 60%),
      0 4px 24px rgb(0 0 0 / 60%),
      inset 0 1px 0 rgb(255 200 80 / 15%);
    color: rgb(220 170 60);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      box-shadow 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease,
      transform 0.15s ease;
    overflow: hidden;
    position: relative;
  }

  .end-turn:hover {
    border-color: rgb(220 170 60 / 80%);
    color: rgb(255 215 90);
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 60%),
      0 4px 32px rgb(0 0 0 / 70%),
      0 0 20px rgb(200 140 30 / 30%),
      inset 0 1px 0 rgb(255 200 80 / 25%);
    transform: translateY(-1px);
  }

  .end-turn:active {
    transform: translateY(1px);
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 60%),
      0 2px 10px rgb(0 0 0 / 60%),
      inset 0 1px 0 rgb(255 200 80 / 10%);
  }

  /* Анимированный свет за кнопкой */
  .end-turn__glow {
    position: absolute;
    inset: -40%;
    background: radial-gradient(circle, rgb(200 140 30 / 12%) 0%, transparent 70%);
    animation: glow-pulse 3s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes glow-pulse {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.9);
    }

    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  .end-turn__icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    filter: drop-shadow(0 0 4px rgb(200 150 30 / 60%));
    animation: hourglass-flip 4s ease-in-out infinite;
  }

  @keyframes hourglass-flip {
    0%,
    45% {
      transform: rotate(0deg);
    }

    50%,
    95% {
      transform: rotate(180deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  .end-turn__sand-top {
    opacity: 0.7;
  }

  .end-turn__sand-bot {
    opacity: 0.9;
  }

  .end-turn__label {
    position: relative;
    white-space: nowrap;
    text-shadow: 0 0 8px rgb(200 150 30 / 50%);
  }
</style>
