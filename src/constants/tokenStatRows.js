import {
  PhSword,
  PhFeather,
  PhBrain,
  PhStar,
  PhTarget,
  PhShieldCheck,
  PhWind,
  PhLightning,
  PhEye,
  PhChatTeardropText,
  PhShield,
  PhSkull,
  PhArrowFatLineRight,
  PhMagicWand,
  PhClover,
  PhDetective,
  PhFirstAidKit,
  PhMaskHappy,
} from '@phosphor-icons/vue'

export const STAT_ROWS = [
  {
    primary: {
      key: 'strength',
      label: 'Сила',
      icon: PhSword,
      hint: 'Физическая мощь, HP, тяжёлое оружие',
    },
    derived: [
      { key: 'block', label: 'Блок', icon: PhShield, hint: 'Сила ×2 + Ловк' },
      { key: 'critDamage', label: 'Крит. урон', icon: PhSkull, hint: 'Сила + Ловк' },
      { key: 'armorPen', label: 'Проб. брони', icon: PhArrowFatLineRight, hint: 'Сила ×2 + Ловк' },
    ],
  },
  {
    primary: {
      key: 'agility',
      label: 'Ловкость',
      icon: PhFeather,
      hint: 'Скорость, точность движений, реакция',
    },
    derived: [
      { key: 'critChance', label: 'Шанс удара', icon: PhTarget, hint: 'Ловк ×3 + Инт' },
      { key: 'evasion', label: 'Уклонение', icon: PhWind, hint: 'Ловк ×2 + Хар + Сила' },
      { key: 'stealth', label: 'Скрытность', icon: PhDetective, hint: 'Ловк ×2 + Инт' },
    ],
  },
  {
    primary: {
      key: 'intellect',
      label: 'Интеллект',
      icon: PhBrain,
      hint: 'Тактика, знание магии, концентрация',
    },
    derived: [
      { key: 'initiative', label: 'Инициатива', icon: PhLightning, hint: 'Ловк ×2 + Инт' },
      { key: 'perception', label: 'Восприятие', icon: PhEye, hint: 'Инт ×3 + Ловк' },
      { key: 'magicPen', label: 'Проб. маг.', icon: PhMagicWand, hint: 'Инт ×2 + Хар' },
      { key: 'healing', label: 'Лечение', icon: PhFirstAidKit, hint: 'Инт ×2 + Хар + Сила' },
    ],
  },
  {
    primary: {
      key: 'charisma',
      label: 'Харизма',
      icon: PhStar,
      hint: 'Воля, командный дух, устойчивость',
    },
    derived: [
      {
        key: 'persuasion',
        label: 'Убеждение',
        icon: PhChatTeardropText,
        hint: 'Хар ×3 + Инт',
      },
      {
        key: 'deception',
        label: 'Обман',
        icon: PhMaskHappy,
        hint: 'Хар ×2 + Ловк + Инт',
      },
      {
        key: 'magicResist',
        label: 'Маг. сопр.',
        icon: PhShieldCheck,
        hint: 'Хар ×2 + Инт + Сила',
      },
      { key: 'luck', label: 'Удача', icon: PhClover, hint: 'Хар ×2 + Ловк' },
    ],
  },
]
