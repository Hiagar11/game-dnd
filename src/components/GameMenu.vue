<script setup></script>

<template>
  <aside class="game-menu">
    <div class="game-menu__icon">иконка выбранного токена</div>
    <div class="game-menu__info">
      информация выбранного токена - при сбросе фокуса будут отображаться загруженные токены
    </div>
    <div class="game-menu__empty">пока пустой блок</div>
  </aside>
</template>

<style lang="scss">
  .game-menu {
    position: fixed;
    bottom: 0;
    background-color: rgb(0 0 0 / 50%);
    z-index: 10;
    inline-size: 100%;
    display: flex;
    block-size: 15vh;
    animation: menu-slide-in 0.4s ease-out 0.6s both;

    &__icon,
    &__empty {
      inline-size: 15%;
      block-size: calc(100% + 30px);
      margin-block-start: -30px;
      background-image: url('/systemImage/panel-side.jpg');
      background-size: cover;
      background-position: top;
      padding: 10px;
    }

    &__icon {
      border-top-right-radius: 12px;
    }

    &__empty {
      background-position: bottom;
      border-top-left-radius: 12px;
    }

    &__info {
      padding: 10px;
      box-shadow:
        inset 15px 0 15px -5px rgb(0 0 0 / 80%),
        inset -15px 0 15px -5px rgb(0 0 0 / 80%);
      flex-grow: 1;
      background-image: url('/systemImage/panel-center.jpg');
      background-size: 240px;
      background-position: center;
    }
  }

  /*
    @keyframes — описывает состояния анимации.
    from — начало: меню спрятано ниже экрана (translateY = 100%)
    to   — конец: меню на своём месте (translateY = 0)
  */
  @keyframes menu-slide-in {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }
</style>
