<template>
  <!--
    Teleport — рендерит попап прямо в <body>, вне любого stacking context.
    Это гарантирует, что попап будет поверх всего интерфейса независимо от z-index родителей.
  -->
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="visible" class="token-edit-overlay" @click.self="onCancel">
        <div
          class="token-edit-popup"
          role="dialog"
          aria-modal="true"
          :aria-label="isEditMode ? 'Редактировать токен' : 'Добавить токен'"
        >
          <h2 class="token-edit-popup__title">
            {{ isEditMode ? 'Редактировать токен' : 'Добавить токен' }}
          </h2>

          <div class="token-edit-popup__body">
            <!-- Превью: в режиме создания — клик открывает выбор файла.
                 В режиме редактирования — образ фиксирован, клик не действует. -->
            <div class="token-edit-popup__preview-wrap">
              <div
                class="token-edit-popup__preview"
                :class="{ 'token-edit-popup__preview--static': isEditMode }"
                @click="!isEditMode && triggerFilePicker()"
              >
                <img
                  v-if="previewSrc"
                  :src="previewSrc"
                  alt="Превью токена"
                  class="token-edit-popup__preview-img"
                />
                <span v-else class="token-edit-popup__preview-placeholder">
                  <span class="token-edit-popup__preview-icon">+</span>
                  <span>Выбрать<br />изображение</span>
                </span>
              </div>
              <input
                v-if="!isEditMode"
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="token-edit-popup__file-input"
                @change="onFileChange"
              />
            </div>

            <!-- Основные поля -->
            <div class="token-edit-popup__fields">
              <label class="token-edit-popup__label">
                Название
                <input
                  v-model.trim="form.name"
                  type="text"
                  class="token-edit-popup__input"
                  placeholder="Например: Goblin"
                  maxlength="40"
                  @keydown.esc="onCancel"
                />
              </label>
            </div>
          </div>

          <!-- Характеристики токена -->
          <div class="token-edit-popup__stats">
            <div class="token-edit-popup__stats-title">Характеристики</div>
            <div class="token-edit-popup__stats-grid">
              <label
                v-for="stat in STATS"
                :key="stat.key"
                class="token-edit-popup__stat-label"
                :title="stat.hint"
              >
                <span class="token-edit-popup__stat-name">{{ stat.label }}</span>
                <input
                  v-model.number="form[stat.key]"
                  type="number"
                  min="0"
                  class="token-edit-popup__stat-input"
                />
              </label>
            </div>
          </div>

          <div class="token-edit-popup__footer">
            <button
              v-if="isEditMode"
              class="token-edit-popup__btn token-edit-popup__btn--delete"
              :disabled="saving"
              @click="onDelete"
            >
              Удалить
            </button>
            <button
              class="token-edit-popup__btn token-edit-popup__btn--cancel"
              :disabled="saving"
              @click="onCancel"
            >
              Отмена
            </button>
            <button
              class="token-edit-popup__btn token-edit-popup__btn--save"
              :disabled="!canSave"
              @click="onSave"
            >
              <span v-if="saving" class="token-edit-popup__spinner" />
              <span v-else>{{ isEditMode ? 'Сохранить' : 'Добавить' }}</span>
            </button>
          </div>
          <p v-if="saveError" class="token-edit-popup__save-error">{{ saveError }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useGameStore } from '../stores/game'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    // Если передан tokenId — попап работает в режиме редактирования.
    // Без tokenId — режим создания нового токена.
    tokenId: { type: [Number, String], default: null },
  })

  const emit = defineEmits(['close'])

  const store = useGameStore()
  const fileInputRef = ref(null)
  const saving = ref(false)
  const saveError = ref('')

  // Режим редактирования активен когда есть tokenId
  const isEditMode = computed(() => props.tokenId !== null)

  /*
    Описание характеристик токена.
    key    — ключ в объекте form (и в store)
    label  — короткая подпись для поля
    hint   — подсказка в title при наведении
  */
  const STATS = [
    { key: 'meleeDmg', label: 'Урон (ближн.)', hint: 'Урон в ближнем бою' },
    { key: 'rangedDmg', label: 'Урон (дальн.)', hint: 'Урон в дальнем бою' },
    { key: 'visionRange', label: 'Дальн. видим.', hint: 'Дальность видимости (в ячейках)' },
    { key: 'defense', label: 'Защита', hint: 'Бонус к броне/защите' },
    { key: 'evasion', label: 'Уклонение', hint: 'Бонус к уклонению от атак' },
  ]

  const DEFAULT_STATS = { meleeDmg: 0, rangedDmg: 0, visionRange: 6, defense: 0, evasion: 0 }

  // Форма — локальное состояние, не реактивно через store до сохранения
  const form = ref({ name: '', ...DEFAULT_STATS })
  const previewSrc = ref(null) // blob URL при создании, imageUrl при редактировании
  const fileRef = ref(null) // сам File-объект

  /*
    Кнопка "Добавить"/"Сохранить" активна:
    - в режиме создания: требуется имя + картинка
    - в режиме редактирования: достаточно только имя
  */
  const canSave = computed(
    () =>
      !saving.value &&
      (isEditMode.value
        ? form.value.name.length > 0
        : form.value.name.length > 0 && previewSrc.value !== null)
  )

  // Сброс/заполнение формы при каждом открытии попапа
  watch(
    () => props.visible,
    (val) => {
      if (val) resetForm()
    }
  )

  function resetForm() {
    saveError.value = ''
    if (isEditMode.value) {
      // Режим редактирования: популяруем форму текущими данными токена
      const token = store.tokens.find((t) => t.id === props.tokenId)
      if (token) {
        const { name, src, meleeDmg, rangedDmg, visionRange, defense, evasion } = token
        form.value = { name, meleeDmg, rangedDmg, visionRange, defense, evasion }
        previewSrc.value = src
      }
    } else {
      // Режим создания: пустая форма
      form.value = { name: '', ...DEFAULT_STATS }
      previewSrc.value = null
      fileRef.value = null
      if (fileInputRef.value) fileInputRef.value.value = ''
    }
  }

  // Открываем системный диалог выбора файла по клику на превью
  function triggerFilePicker() {
    fileInputRef.value?.click()
  }

  /*
    При выборе файла создаём объектный URL (blob:) для превью.
    Это безопаснее и быстрее чем FileReader + base64.
    Память освобождается при закрытии вкладки или явном revokeObjectURL.
  */
  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Освобождаем предыдущий blob URL, если был
    if (previewSrc.value?.startsWith('blob:')) {
      URL.revokeObjectURL(previewSrc.value)
    }

    fileRef.value = file
    previewSrc.value = URL.createObjectURL(file)
  }

  async function onSave() {
    if (!canSave.value) return

    saving.value = true
    saveError.value = ''

    try {
      const { name, meleeDmg, rangedDmg, visionRange, defense, evasion } = form.value

      if (isEditMode.value) {
        // Редактирование: отправляем только текстовые поля (изображение не меняется)
        await store.editToken(props.tokenId, {
          name,
          meleeDmg,
          rangedDmg,
          visionRange,
          defense,
          evasion,
        })
      } else {
        // Создание: собираем FormData — файл + поля
        const fd = new FormData()
        fd.append('image', fileRef.value)
        fd.append('name', name)
        fd.append('meleeDmg', meleeDmg)
        fd.append('rangedDmg', rangedDmg)
        fd.append('visionRange', visionRange)
        fd.append('defense', defense)
        fd.append('evasion', evasion)
        await store.addToken(fd)
      }

      emit('close')
    } catch (err) {
      saveError.value = err.message ?? 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  function onCancel() {
    // Освобождаем blob URL при отмене
    if (previewSrc.value?.startsWith('blob:')) {
      URL.revokeObjectURL(previewSrc.value)
    }
    emit('close')
  }

  async function onDelete() {
    if (!confirm(`Удалить токен «${form.name}»?`)) return
    saving.value = true
    try {
      await store.deleteToken(props.tokenId)
      emit('close')
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped>
  /* Затемнённый фон — клик по нему закрывает попап */
  .token-edit-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-popup, 300);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-overlay-strong);
    backdrop-filter: blur(2px);
  }

  .token-edit-popup {
    width: min(480px, 90vw);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-lg);
    box-shadow:
      0 8px 32px rgb(0 0 0 / 70%),
      0 0 16px var(--color-primary-glow);
  }

  .token-edit-popup__title {
    margin: 0;
    font-family: var(--font-base);
    font-size: 20px;
    font-weight: normal;
    color: var(--color-primary);
    text-align: center;
    letter-spacing: 0.05em;
  }

  .token-edit-popup__body {
    display: flex;
    gap: var(--space-6);
    align-items: flex-start;
  }

  /* Круглое превью-поле — клик открывает выбор файла */
  .token-edit-popup__preview-wrap {
    flex-shrink: 0;
  }

  .token-edit-popup__preview {
    width: 96px;
    height: 96px;
    border-radius: var(--radius-full);
    border: 2px dashed var(--color-primary);
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 4%);
    transition: background var(--transition-fast);

    &:hover {
      background: rgb(255 255 255 / 10%);
    }

    /* В режиме редактирования — обычный курсор, бордер сплошной */
    &--static {
      cursor: default;
      border-style: solid;

      &:hover {
        background: rgb(255 255 255 / 4%);
      }
    }
  }

  .token-edit-popup__preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .token-edit-popup__preview-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.3;
    padding: var(--space-2);
    pointer-events: none;
    user-select: none;
  }

  .token-edit-popup__preview-icon {
    font-size: 24px;
    color: var(--color-primary);
  }

  .token-edit-popup__file-input {
    display: none;
  }

  .token-edit-popup__fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .token-edit-popup__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: 13px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .token-edit-popup__input {
    padding: var(--space-2) var(--space-3);
    background: rgb(255 255 255 / 6%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 14px;
    font-family: var(--font-ui);
    outline: none;
    transition: border-color var(--transition-fast);

    &:focus {
      border-color: var(--color-primary);
    }

    &::placeholder {
      color: var(--color-text-muted);
    }
  }

  /* Блок характеристик */
  .token-edit-popup__stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .token-edit-popup__stats-title {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  /*
    Сетка характеристик: 2 колонки, автоматически заполняет строки.
    auto-fill + minmax — адаптивно под ширину попапа.
  */
  .token-edit-popup__stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: var(--space-3);
  }

  .token-edit-popup__stat-label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-family: var(--font-ui);
    cursor: default;
  }

  .token-edit-popup__stat-name {
    font-size: 11px;
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
  }

  .token-edit-popup__stat-input {
    padding: var(--space-2) var(--space-3);
    background: rgb(255 255 255 / 6%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 14px;
    font-family: var(--font-ui);
    outline: none;
    text-align: center;
    transition: border-color var(--transition-fast);

    /* Скрываем стрелки number input — они некрасивы и не нужны */
    appearance: textfield;

    &:focus {
      border-color: var(--color-primary);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      appearance: none;
    }
  }

  .token-edit-popup__footer {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .token-edit-popup__btn {
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &--cancel {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);

      &:hover {
        border-color: var(--color-text-muted);
        color: var(--color-text);
      }
    }

    &--save {
      background: var(--color-primary);
      border: 1px solid var(--color-primary);
      color: #1a1200;
      font-weight: 600;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
        border-color: var(--color-primary-hover);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    &--delete {
      margin-right: auto;
      background: transparent;
      border: 1px solid rgb(220 38 38 / 50%);
      color: #f87171;

      &:hover:not(:disabled) {
        background: rgb(220 38 38 / 15%);
        border-color: #f87171;
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }
  }

  /* Анимация появления попапа */
  .popup-fade-enter-active,
  .popup-fade-leave-active {
    transition: opacity 200ms ease;

    .token-edit-popup {
      transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }

  .popup-fade-enter-from,
  .popup-fade-leave-to {
    opacity: 0;

    .token-edit-popup {
      transform: scale(0.95) translateY(8px);
    }
  }

  .token-edit-popup__spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgb(26 26 26 / 30%);
    border-top-color: #1a1a1a;
    border-radius: 50%;
    animation: token-spin 0.7s linear infinite;
  }

  .token-edit-popup__save-error {
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: rgb(220 38 38 / 10%);
    border: 1px solid rgb(220 38 38 / 40%);
    color: #f87171;
    font-size: 13px;
    text-align: center;
  }

  @keyframes token-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
