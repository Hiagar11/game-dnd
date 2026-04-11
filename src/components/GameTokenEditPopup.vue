<template>
  <PopupShell :visible="visible" :aria-label="popupTitle" @close="onCancel">
    <h2 class="token-edit-popup__title">{{ popupTitle }}</h2>

    <!-- Табы — для placed-токена на карте и для шаблонов -->
    <div v-if="isEditMode || !isPlacedMode" class="token-edit-popup__tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="token-edit-popup__tab"
        :class="{ 'token-edit-popup__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="13" weight="fill" />
        {{ tab.label }}
      </button>
    </div>

    <div v-show="activeTab === 'stats'" class="token-edit-popup__body">
      <TokenPreviewPicker :src="previewSrc" :readonly="isEditMode" @file="onFile" />

      <div class="token-edit-popup__fields">
        <label class="token-edit-popup__label">
          Класс / Тип
          <input
            v-model.trim="form.name"
            type="text"
            class="token-edit-popup__input"
            placeholder="Например: Goblin"
            maxlength="40"
            @keydown.esc="onCancel"
          />
        </label>

        <!-- Отношение — видно только для шаблонов НПС (не для placed-редактирования) -->
        <label v-if="showAttitude" class="token-edit-popup__label">
          Отношение к героям
          <div class="token-edit-popup__attitude">
            <button
              v-for="opt in ATTITUDE_OPTIONS"
              :key="opt.value"
              type="button"
              class="token-edit-popup__attitude-btn"
              :class="{
                'token-edit-popup__attitude-btn--active': form.attitude === opt.value,
                [`token-edit-popup__attitude-btn--${opt.value}`]: true,
              }"
              @click="form.attitude = opt.value"
            >
              <span class="token-edit-popup__attitude-dot" />
              {{ opt.label }}
            </button>
          </div>
        </label>

        <TokenStatsGrid v-model="form" />

        <!-- Шкала здоровья -->
        <div class="token-edit-popup__hp">
          <div class="token-edit-popup__hp-header">
            <PhHeart :size="14" weight="fill" class="token-edit-popup__hp-icon" />
            <span class="token-edit-popup__hp-label">Здоровье</span>
            <span class="token-edit-popup__hp-value">
              <template v-if="isPlacedMode">
                <b>{{ placedHp }}</b> / {{ placedMaxHp }}
              </template>
              <template v-else> {{ formulaMaxHp }} (макс.) </template>
            </span>
          </div>
          <div class="token-edit-popup__hp-bar">
            <div
              class="token-edit-popup__hp-fill"
              :style="{ width: isPlacedMode ? `${placedHpPercent}%` : '100%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Панель: Инвентарь -->
    <div v-if="activeTab === 'inventory'" class="token-edit-popup__panel-empty">
      <PhBackpack :size="40" weight="duotone" class="token-edit-popup__panel-empty-icon" />
      <p class="token-edit-popup__panel-empty-text">Инвентарь пока не реализован</p>
      <p class="token-edit-popup__panel-empty-hint">Здесь будут предметы, зелья и снаряжение</p>
    </div>

    <!-- Панель: Способности -->
    <div v-if="activeTab === 'abilities'" class="token-edit-popup__panel-empty">
      <PhMagicWand :size="40" weight="duotone" class="token-edit-popup__panel-empty-icon" />
      <p class="token-edit-popup__panel-empty-text">Способности пока не реализованы</p>
      <p class="token-edit-popup__panel-empty-hint">Здесь будут активные и пассивные умения</p>
    </div>

    <!-- Панель: Личность ИИ — только для НПС -->
    <div
      v-if="activeTab === 'personality' && props.tokenType === 'npc'"
      class="token-edit-popup__panel-personality"
    >
      <div class="token-edit-popup__personality-header">
        <PhRobot :size="18" weight="duotone" class="token-edit-popup__personality-icon" />
        <span class="token-edit-popup__personality-title">Личность для ИИ-диалога</span>
        <div class="token-edit-popup__personality-name">
          <input
            v-model.trim="form.npcName"
            type="text"
            class="token-edit-popup__input token-edit-popup__input--name"
            placeholder="Личное имя НПС..."
            maxlength="40"
          />
          <button
            type="button"
            class="token-edit-popup__random-btn"
            title="Случайное имя"
            @click="randomizeName"
          >
            <PhArrowsClockwise :size="14" weight="bold" />
          </button>
        </div>
      </div>

      <div class="token-edit-popup__personality-body">
        <!-- Левая колонка: textarea + счётчик -->
        <div class="token-edit-popup__personality-left">
          <textarea
            ref="personalityTextarea"
            v-model="form.personality"
            class="token-edit-popup__textarea"
            placeholder="Опиши характер, манеру речи, что знает персонаж..."
            maxlength="500"
          />
          <p class="token-edit-popup__personality-counter">{{ form.personality.length }} / 500</p>
        </div>

        <!-- Правая колонка: группы тегов -->
        <div class="token-edit-popup__personality-tags">
          <div
            v-for="group in PERSONALITY_TAGS"
            :key="group.id"
            class="token-edit-popup__tag-group"
          >
            <p class="token-edit-popup__tag-group-label" :style="{ color: group.color }">
              {{ group.label }}
            </p>
            <div class="token-edit-popup__tag-row">
              <button
                v-for="tag in group.tags"
                :key="tag.phrase"
                type="button"
                class="token-edit-popup__tag"
                :class="{ 'token-edit-popup__tag--active': isTagActive(tag.phrase) }"
                :style="{ '--tag-color': group.color }"
                @click="toggleTag(tag.phrase)"
              >
                {{ tag.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="token-edit-popup__footer">
      <button
        v-if="isEditMode && activeTab === 'stats'"
        class="token-edit-popup__btn token-edit-popup__btn--delete"
        :disabled="saving"
        @mouseenter="playHover"
        @click="onDelete"
      >
        <PhTrash :size="15" />
        {{ isPlacedMode ? 'Убрать с карты' : 'Удалить' }}
      </button>
      <button
        class="token-edit-popup__btn token-edit-popup__btn--cancel"
        :disabled="saving"
        @mouseenter="playHover"
        @click="onCancel"
      >
        <PhX :size="15" />
        Отмена
      </button>
      <button
        v-if="activeTab === 'stats' || activeTab === 'personality'"
        class="token-edit-popup__btn token-edit-popup__btn--save"
        :disabled="!canSave"
        @mouseenter="playHover"
        @click="onSave"
      >
        <span v-if="saving" class="token-edit-popup__spinner" />
        <template v-else>
          <PhFloppyDisk :size="15" />
          {{ isPlacedMode ? 'Сохранить' : isEditMode ? 'Сохранить шаблон' : 'Добавить' }}
        </template>
      </button>
    </div>
    <p v-if="saveError" class="token-edit-popup__save-error">{{ saveError }}</p>
  </PopupShell>
</template>

<script setup>
  import { ref, computed, watch, inject } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import PopupShell from './PopupShell.vue'
  import TokenPreviewPicker from './TokenPreviewPicker.vue'
  import TokenStatsGrid from './TokenStatsGrid.vue'
  import {
    PhTrash,
    PhX,
    PhFloppyDisk,
    PhHeart,
    PhBackpack,
    PhMagicWand,
    PhScroll,
    PhRobot,
    PhArrowsClockwise,
  } from '@phosphor-icons/vue'
  import { useSocket } from '../composables/useSocket'
  import { useSound } from '../composables/useSound'

  const props = defineProps({
    visible: { type: Boolean, required: true },
    tokenId: { type: [Number, String], default: null },
    placedUid: { type: String, default: null },
    // Дефолтное имя при создании (приходит из вкладки — NPC или Герой)
    defaultName: { type: String, default: '' },
    // 'npc' | 'hero' — сохраняется в БД при создании и не меняется
    tokenType: { type: String, default: 'npc' },
    // Дефолтное отношение — предзаполняется из вкладки чтобы новый токен сразу попадал в нужную
    defaultAttitude: { type: String, default: 'neutral' },
  })

  const emit = defineEmits(['close'])

  const store = useGameStore()
  const tokensStore = useTokensStore()
  const { getSocket } = useSocket()
  const { playHover, playClick } = useSound()
  const saving = ref(false)
  const saveError = ref('')
  const activeTab = ref('stats')

  const TABS = computed(() => [
    { id: 'stats', label: 'Характеристики', icon: PhScroll },
    { id: 'inventory', label: 'Инвентарь', icon: PhBackpack },
    { id: 'abilities', label: 'Способности', icon: PhMagicWand },
    ...(props.tokenType === 'npc'
      ? [{ id: 'personality', label: 'Личность ИИ', icon: PhRobot }]
      : []),
  ])

  // Блокировка курсора мастера у зрителей пока попап открыт.
  // inject(..., null) — безопасный fallback: если нет GameView-провайдера (напр. в редакторе) — ничего не делаем.
  const blockCursor = inject('blockCursor', null)
  const unblockCursor = inject('unblockCursor', null)

  watch(
    () => props.visible,
    (val) => {
      if (val) blockCursor?.()
      else unblockCursor?.()
    }
  )

  const isPlacedMode = computed(() => props.placedUid !== null)
  const isEditMode = computed(() => props.tokenId !== null || isPlacedMode.value)

  const popupTitle = computed(() =>
    isPlacedMode.value
      ? 'Токен на карте'
      : isEditMode.value
        ? 'Редактировать шаблон'
        : 'Добавить шаблон'
  )

  const DEFAULT_STATS = { strength: 0, agility: 0, intellect: 0, charisma: 0 }
  const form = ref({
    name: '',
    npcName: '',
    attitude: 'neutral',
    personality: '',
    ...DEFAULT_STATS,
  })

  // ─── Теги личности ────────────────────────────────────────────────────────
  // Каждая группа — характеристика; tag.phrase добавляется в textarea при клике.
  const PERSONALITY_TAGS = [
    {
      id: 'aggression',
      label: '⚔ Агрессивность',
      color: '#f87171',
      tags: [
        { label: 'Миролюбивый', phrase: 'Избегает конфликтов, никогда не начинает драку первым.' },
        { label: 'Осторожный', phrase: 'Насторожён, но не агрессивен.' },
        { label: 'Вспыльчивый', phrase: 'Легко выходит из себя.' },
        { label: 'Воинственный', phrase: 'Жаждет битвы, провоцирует соперников.' },
      ],
    },
    {
      id: 'honesty',
      label: '🔍 Честность',
      color: '#60a5fa',
      tags: [
        { label: 'Кристально честный', phrase: 'Никогда не лжёт, даже во вред себе.' },
        { label: 'Дипломатичный', phrase: 'Говорит правду, но осторожно подбирает слова.' },
        { label: 'Хитрый', phrase: 'Умело уводит разговор в сторону, избегая прямых ответов.' },
        { label: 'Лжец', phrase: 'Врёт непринуждённо и с удовольствием.' },
      ],
    },
    {
      id: 'speech',
      label: '💬 Речь',
      color: '#a78bfa',
      tags: [
        { label: 'Немногословный', phrase: 'Говорит коротко, только по делу.' },
        { label: 'Цветистый', phrase: 'Любит сложные обороты, украшает речь метафорами.' },
        { label: 'Уличный', phrase: 'Говорит грубо, с жаргоном.' },
        { label: 'Велеречивый', phrase: 'Не может остановиться — отвечает длинными монологами.' },
        { label: 'Шёпот', phrase: 'Говорит тихо и осторожно, будто вокруг враги.' },
      ],
    },
    {
      id: 'humor',
      label: '😄 Юмор',
      color: '#fbbf24',
      tags: [
        { label: 'Серьёзный', phrase: 'Лишён чувства юмора, воспринимает всё буквально.' },
        { label: 'Саркастичный', phrase: 'Часто говорит с иронией и сарказмом.' },
        { label: 'Балагур', phrase: 'Любит шутки, прибаутки и каламбуры.' },
        { label: 'Чёрный юмор', phrase: 'Шутит о смерти и трагедиях без смущения.' },
      ],
    },
    {
      id: 'flirt',
      label: '💘 Флирт',
      color: '#f472b6',
      tags: [
        { label: 'Холодный', phrase: 'Равнодушен к лести и заигрываниям.' },
        { label: 'Застенчивый', phrase: 'Краснеет и теряется от комплиментов.' },
        { label: 'Кокетливый', phrase: 'Любит намекать и флиртовать.' },
        { label: 'Обольститель', phrase: 'Виртуозно флиртует, умеет очаровывать.' },
      ],
    },
    {
      id: 'trust',
      label: '🤝 Доверие',
      color: '#34d399',
      tags: [
        { label: 'Параноик', phrase: 'Не доверяет никому, видит опасность в каждом.' },
        { label: 'Осмотрительный', phrase: 'Доверяет, но сначала проверяет.' },
        { label: 'Открытый', phrase: 'Легко сходится с людьми, доверяет незнакомцам.' },
        { label: 'Наивный', phrase: 'Верит всему на слово, легко обмануть.' },
      ],
    },
    {
      id: 'knowledge',
      label: '📚 Знания',
      color: '#fb923c',
      tags: [
        { label: 'Невежда', phrase: 'Знает лишь своё ремесло, в остальном тёмен.' },
        { label: 'Местный', phrase: 'Хорошо знает этот город и его слухи.' },
        { label: 'Эрудит', phrase: 'Образован, знает историю, магию и географию.' },
        { label: 'Шпион', phrase: 'Располагает тайными сведениями, но не спешит делиться.' },
      ],
    },
    {
      id: 'motive',
      label: '🎯 Мотив',
      color: '#e2e8f0',
      tags: [
        { label: 'Корыстный', phrase: 'Думает только о выгоде и деньгах.' },
        { label: 'Мститель', phrase: 'Одержим местью — помнит каждую обиду.' },
        { label: 'Защитник', phrase: 'Готов умереть ради тех, кого любит.' },
        { label: 'Нигилист', phrase: 'Потерял смысл жизни, ему всё равно.' },
        { label: 'Авантюрист', phrase: 'Любит риск и приключения ради самого процесса.' },
      ],
    },
  ]

  const personalityTextarea = ref(null)

  // Случайные фэнтезийные имена для НПС
  const NPC_NAMES = [
    'Арторик',
    'Брандус',
    'Вельгар',
    'Гардимар',
    'Дравен',
    'Ерсика',
    'Жанар',
    'Зорин',
    'Ирендир',
    'Кастрон',
    'Лунара',
    'Малинда',
    'Наера',
    'Оринда',
    'Палдрик',
    'Равенна',
    'Сальдур',
    'Талана',
    'Урван',
    'Фалкрин',
    'Хелена',
    'Цветана',
    'Шалира',
    'Элдрик',
    'Борин',
    'Громмаш',
    'Дургал',
    'Жаргус',
    'Крорн',
    'Мурдак',
    'Трогдар',
    'Ульрик',
    'Амара',
    'Бенда',
    'Галюна',
    'Дария',
    'Инара',
    'Кира',
    'Лилиа',
    'Мира',
    'Нари',
    'Ольга',
    'Рейна',
    'Сильва',
    'Таринья',
    'Уна',
    'Фарида',
    'Халееда',
    'Шара',
    'Эвныя',
  ]

  function randomizeName() {
    const pool = NPC_NAMES.filter((n) => n !== form.value.npcName)
    form.value.npcName = pool[Math.floor(Math.random() * pool.length)]
  }

  // Тег считается активным если его фраза есть в тексте
  function isTagActive(phrase) {
    return form.value.personality.includes(phrase)
  }

  // Клик по тегу: добавляет фразу в конец или убирает её из текста
  function toggleTag(phrase) {
    if (isTagActive(phrase)) {
      // Убираем фразу — и лишний пробел рядом
      form.value.personality = form.value.personality
        .replace(` ${phrase}`, '')
        .replace(`${phrase} `, '')
        .replace(phrase, '')
        .trim()
    } else {
      const current = form.value.personality.trim()
      const separator = current.length > 0 ? ' ' : ''
      const next = `${current}${separator}${phrase}`
      // Не превышаем лимит в 500 символов
      if (next.length <= 500) form.value.personality = next
    }
  }
  const ATTITUDE_OPTIONS = [
    { value: 'neutral', label: 'Нейтральное' },
    { value: 'friendly', label: 'Дружественное' },
    { value: 'hostile', label: 'Враждебное' },
  ]

  // Показывать selector для всех НПС — и шаблонов, и placed (но не для героев)
  const showAttitude = computed(() => props.tokenType === 'npc')
  const previewSrc = ref(null)
  const fileRef = ref(null)

  const canSave = computed(
    () =>
      !saving.value &&
      (isEditMode.value
        ? form.value.name.length > 0
        : form.value.name.length > 0 && previewSrc.value !== null)
  )

  watch(
    () => props.visible,
    (val) => {
      if (val) resetForm()
    }
  )

  function resetForm() {
    saveError.value = ''
    activeTab.value = 'stats'
    if (isPlacedMode.value) {
      const token = store.placedTokens.find((t) => t.uid === props.placedUid)
      if (token) {
        const {
          name,
          npcName,
          src,
          strength,
          agility,
          intellect,
          charisma,
          attitude,
          personality,
        } = token
        form.value = {
          name,
          npcName: npcName ?? '',
          attitude: attitude ?? 'neutral',
          personality: personality ?? '',
          strength,
          agility,
          intellect,
          charisma,
        }
        previewSrc.value = src
      }
    } else if (isEditMode.value) {
      const token = tokensStore.tokens.find((t) => t.id === props.tokenId)
      if (token) {
        const {
          name,
          npcName,
          src,
          strength,
          agility,
          intellect,
          charisma,
          attitude,
          personality,
        } = token
        form.value = {
          name,
          npcName: npcName ?? '',
          attitude: attitude ?? 'neutral',
          personality: personality ?? '',
          strength,
          agility,
          intellect,
          charisma,
        }
        previewSrc.value = src
      }
    } else {
      form.value = {
        name: props.defaultName,
        npcName: '',
        attitude: props.defaultAttitude ?? 'neutral',
        personality: '',
        ...DEFAULT_STATS,
      }
      previewSrc.value = null
      fileRef.value = null
    }
  }

  // Шкала HP: для placed-режима читаем из стора, для шаблона — вычисляем по формуле
  const formulaMaxHp = computed(
    () => 10 + (form.value.strength ?? 0) * 2 + (form.value.agility ?? 0)
  )
  const placedToken = computed(() =>
    isPlacedMode.value ? store.placedTokens.find((t) => t.uid === props.placedUid) : null
  )
  const placedHp = computed(() => placedToken.value?.hp ?? formulaMaxHp.value)
  const placedMaxHp = computed(() => placedToken.value?.maxHp ?? formulaMaxHp.value)
  const placedHpPercent = computed(() =>
    placedMaxHp.value > 0
      ? Math.max(0, Math.min(100, (placedHp.value / placedMaxHp.value) * 100))
      : 100
  )

  function onFile(file) {
    if (previewSrc.value?.startsWith('blob:')) URL.revokeObjectURL(previewSrc.value)
    fileRef.value = file
    previewSrc.value = URL.createObjectURL(file)
  }

  async function onSave() {
    if (!canSave.value) return
    playClick()
    saving.value = true
    saveError.value = ''
    try {
      const { name, npcName, strength, agility, intellect, charisma } = form.value
      if (isPlacedMode.value) {
        store.editPlacedToken(props.placedUid, {
          name,
          npcName,
          attitude: form.value.attitude,
          personality: form.value.personality,
          strength,
          agility,
          intellect,
          charisma,
        })
      } else if (isEditMode.value) {
        await tokensStore.editToken(props.tokenId, {
          name,
          npcName,
          attitude: form.value.attitude,
          personality: form.value.personality,
          strength,
          agility,
          intellect,
          charisma,
        })
      } else {
        const fd = new FormData()
        fd.append('image', fileRef.value)
        fd.append('name', name)
        fd.append('npcName', npcName ?? '')
        fd.append('tokenType', props.tokenType)
        fd.append('attitude', form.value.attitude)
        fd.append('personality', form.value.personality)
        fd.append('strength', strength)
        fd.append('agility', agility)
        fd.append('intellect', intellect)
        fd.append('charisma', charisma)
        await tokensStore.addToken(fd)
      }
      emit('close')
    } catch (err) {
      saveError.value = err.message ?? 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  function onCancel() {
    playClick()
    if (previewSrc.value?.startsWith('blob:')) URL.revokeObjectURL(previewSrc.value)
    emit('close')
  }

  async function onDelete() {
    playClick()
    if (isPlacedMode.value) {
      if (!confirm(`Убрать токен «${form.value.name}» с карты?`)) return
      store.removeToken(props.placedUid)
      const scenarioId = String(store.currentScenario?.id ?? '')
      if (scenarioId) getSocket()?.emit('token:remove', { scenarioId, uid: props.placedUid })
      emit('close')
      return
    }
    if (!confirm(`Удалить токен «${form.value.name}»?`)) return
    saving.value = true
    try {
      await tokensStore.deleteToken(props.tokenId)
      emit('close')
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }
</script>

<style scoped lang="scss">
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
    @include form-input(rgb(255 255 255 / 6%), 14px);
  }

  // ─── Селектор отношения ────────────────────────────────────────────
  .token-edit-popup__attitude {
    display: flex;
    gap: var(--space-2);
  }

  .token-edit-popup__attitude-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid rgb(255 255 255 / 12%);
    background: rgb(255 255 255 / 4%);
    color: var(--color-text-muted);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: rgb(255 255 255 / 25%);
      color: var(--color-text);
    }

    &--active.token-edit-popup__attitude-btn--neutral {
      border-color: rgb(156 163 175 / 70%);
      background: rgb(156 163 175 / 10%);
      color: rgb(156 163 175);
    }

    &--active.token-edit-popup__attitude-btn--friendly {
      border-color: rgb(74 222 128 / 70%);
      background: rgb(74 222 128 / 10%);
      color: rgb(74 222 128);
    }

    &--active.token-edit-popup__attitude-btn--hostile {
      border-color: rgb(248 113 113 / 70%);
      background: rgb(248 113 113 / 10%);
      color: rgb(248 113 113);
    }
  }

  .token-edit-popup__attitude-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    .token-edit-popup__attitude-btn--neutral & {
      background: rgb(156 163 175);
    }

    .token-edit-popup__attitude-btn--friendly & {
      background: rgb(74 222 128);
    }

    .token-edit-popup__attitude-btn--hostile & {
      background: rgb(248 113 113);
    }
  }

  .token-edit-popup__footer {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .token-edit-popup__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-6);
    font-size: 14px;

    &--cancel {
      @include btn-ghost;

      padding: var(--space-2) var(--space-6);
      font-size: 14px;

      // Менее акцентный hover: text-muted → text (не primary)
      &:hover {
        border-color: var(--color-text-muted);
        color: var(--color-text);
      }
    }

    &--save {
      @include btn-primary;

      padding: var(--space-2) var(--space-6);
      font-size: 14px;
    }

    &--delete {
      @include btn-danger;

      margin-right: auto;
      padding: var(--space-2) var(--space-6);
      font-size: 14px;
    }
  }

  .token-edit-popup__spinner {
    @include spinner(16px, $anim: token-spin, $light: false);
  }

  .token-edit-popup__save-error {
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: rgb(220 38 38 / 10%);
    border: 1px solid rgb(220 38 38 / 40%);
    color: var(--color-error);
    font-size: 13px;
    text-align: center;
  }

  // ─── Шкала здоровья ───────────────────────────────────────────────
  .token-edit-popup__hp {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .token-edit-popup__hp-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .token-edit-popup__hp-icon {
    color: #f87171;
    flex-shrink: 0;
  }

  .token-edit-popup__hp-label {
    font-size: 13px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .token-edit-popup__hp-value {
    margin-left: auto;
    font-size: 13px;
    font-weight: 600;
    color: rgb(255 255 255 / 80%);
    font-family: var(--font-ui);

    b {
      color: #f87171;
      font-size: 16px;
    }
  }

  .token-edit-popup__hp-bar {
    width: 100%;
    height: 7px;
    background: rgb(255 255 255 / 10%);
    border-radius: 4px;
    overflow: hidden;
  }

  .token-edit-popup__hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f87171);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .token-edit-popup__hp-hint {
    margin: 0;
    font-size: 11px;
    color: rgb(255 255 255 / 25%);
    font-family: var(--font-ui);
  }

  // ─── Табы ─────────────────────────────────────────────────────────
  .token-edit-popup__tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid rgb(255 255 255 / 8%);
    margin-bottom: var(--space-4);
  }

  .token-edit-popup__tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--color-text-muted);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      color 150ms ease,
      border-color 150ms ease;
    margin-bottom: -1px;

    &:hover {
      color: var(--color-text);
    }

    &--active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
  }

  // ─── Панель личности ИИ ───────────────────────────────────────────
  .token-edit-popup__panel-personality {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-2) 0;
  }

  .token-edit-popup__personality-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .token-edit-popup__personality-name {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
  }

  .token-edit-popup__input--name {
    width: 160px;
    padding: var(--space-1) var(--space-3);
    font-size: 13px;
  }

  .token-edit-popup__random-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: 1px solid rgb(255 255 255 / 12%);
    background: rgb(255 255 255 / 5%);
    color: var(--color-text-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: rgb(from var(--color-primary) r g b / 10%);
    }

    &:active {
      transform: rotate(180deg);
    }
  }

  .token-edit-popup__personality-icon {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .token-edit-popup__personality-title {
    font-size: 15px;
    font-family: var(--font-ui);
    color: var(--color-text);
    font-weight: 600;
  }

  // Двухколоночная компоновка: textarea слева, теги справа
  .token-edit-popup__personality-body {
    display: grid;
    grid-template-columns: 1fr 260px;
    gap: var(--space-4);
    align-items: start;
  }

  .token-edit-popup__personality-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .token-edit-popup__textarea {
    @include form-input(rgb(255 255 255 / 6%), 13px);

    resize: none;
    height: 220px;
    line-height: 1.6;
    font-family: var(--font-ui);
    white-space: pre-wrap;
  }

  .token-edit-popup__personality-counter {
    margin: 0;
    font-size: 11px;
    font-family: var(--font-ui);
    color: rgb(255 255 255 / 25%);
    text-align: right;
  }

  // Правая колонка — прокручиваемый список групп тегов
  .token-edit-popup__personality-tags {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-height: 240px;
    overflow-y: auto;
    padding-right: var(--space-1);

    // Тонкий скроллбар
    scrollbar-width: thin;
    scrollbar-color: rgb(255 255 255 / 15%) transparent;
  }

  .token-edit-popup__tag-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .token-edit-popup__tag-group-label {
    margin: 0;
    font-size: 10px;
    font-family: var(--font-ui);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .token-edit-popup__tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .token-edit-popup__tag {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 20px;
    border: 1px solid rgb(from var(--tag-color) r g b / 30%);
    background: rgb(from var(--tag-color) r g b / 7%);
    color: rgb(from var(--tag-color) r g b / 70%);
    font-size: 11px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: all 0.15s ease;
    line-height: 1;

    &:hover {
      border-color: rgb(from var(--tag-color) r g b / 60%);
      color: var(--tag-color);
      background: rgb(from var(--tag-color) r g b / 15%);
    }

    &--active {
      border-color: var(--tag-color);
      background: rgb(from var(--tag-color) r g b / 20%);
      color: var(--tag-color);
    }
  }

  // ─── Пустые панели (инвентарь / способности) ─────────────────────
  .token-edit-popup__panel-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-8) var(--space-4);
    min-height: 180px;
  }

  .token-edit-popup__panel-empty-icon {
    color: rgb(255 255 255 / 15%);
  }

  .token-edit-popup__panel-empty-text {
    margin: 0;
    font-size: 14px;
    font-family: var(--font-ui);
    color: rgb(255 255 255 / 40%);
  }

  .token-edit-popup__panel-empty-hint {
    margin: 0;
    font-size: 12px;
    font-family: var(--font-ui);
    color: rgb(255 255 255 / 20%);
  }

  @keyframes token-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // Ширина попапа подстраивается под содержимое
  :deep(.popup-shell__box) {
    width: fit-content;
    max-width: 94vw;
  }
</style>
