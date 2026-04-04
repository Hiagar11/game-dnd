<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'

  const router = useRouter()
  const auth = useAuthStore()

  const username = ref('')
  const password = ref('')
  const remember = ref(false)
  const error = ref('')
  const loading = ref(false)

  async function handleSubmit() {
    error.value = ''
    loading.value = true

    const err = await auth.login(username.value, password.value, remember.value)

    loading.value = false

    if (err) {
      error.value = err
      return
    }

    router.push({ name: 'menu' })
  }
</script>

<template>
  <div class="login">
    <div class="login__card">
      <h1 class="login__title">Dungeon Master</h1>
      <p class="login__subtitle">Войдите, чтобы продолжить</p>

      <form class="login__form" @submit.prevent="handleSubmit">
        <div class="login__field">
          <label class="login__label" for="username">Логин</label>
          <input
            id="username"
            v-model="username"
            class="login__input"
            type="text"
            autocomplete="username"
            required
            :disabled="loading"
          />
        </div>

        <div class="login__field">
          <label class="login__label" for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            class="login__input"
            type="password"
            autocomplete="current-password"
            required
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="login__error">{{ error }}</p>

        <label class="login__remember">
          <input
            v-model="remember"
            class="login__remember-checkbox"
            type="checkbox"
            :disabled="loading"
          />
          <span class="login__remember-label">Запомнить меня</span>
        </label>

        <button class="login__btn" type="submit" :disabled="loading">
          <span v-if="loading" class="login__spinner" />
          <span v-else>Войти</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .login {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    background: var(--color-bg);

    &__card {
      width: 100%;
      max-width: 360px;
      padding: var(--space-8);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 8px 32px rgb(0 0 0 / 60%);
    }

    &__title {
      margin: 0 0 var(--space-1);
      font-family: var(--font-base);
      font-size: 1.75rem;
      color: var(--color-primary);
      text-align: center;
      letter-spacing: 0.05em;
    }

    &__subtitle {
      margin: 0 0 var(--space-8);
      font-size: 0.85rem;
      color: var(--color-text-muted);
      text-align: center;
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    &__label {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    &__input {
      padding: var(--space-3) var(--space-4);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-size: 1rem;
      font-family: var(--font-ui);
      transition: border-color var(--transition-fast);
      outline: none;

      &:focus {
        border-color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &__error {
      margin: 0;
      padding: var(--space-2) var(--space-3);
      background: rgb(200 50 50 / 15%);
      border: 1px solid rgb(200 50 50 / 40%);
      border-radius: var(--radius-sm);
      color: #e07070;
      font-size: 0.85rem;
    }

    &__remember {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      user-select: none;

      &-checkbox {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin: 0;
        accent-color: var(--color-primary);
        cursor: pointer;
      }

      &-label {
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
    }

    &__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      margin-top: var(--space-2);
      background: var(--color-primary);
      border: none;
      border-radius: var(--radius-md);
      color: #1a1a1a;
      font-size: 1rem;
      font-weight: 600;
      font-family: var(--font-ui);
      cursor: pointer;
      transition:
        background var(--transition-fast),
        opacity var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    &__spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid rgb(26 26 26 / 30%);
      border-top-color: #1a1a1a;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
