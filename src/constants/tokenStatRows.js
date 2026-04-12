import {
  PhSword,
  PhFeather,
  PhBrain,
  PhStar,
  PhFlame,
  PhTarget,
  PhShield,
  PhShieldCheck,
  PhWind,
  PhLightning,
  PhMagicWand,
  PhChatTeardropText,
} from '@phosphor-icons/vue'

export const STAT_ROWS = [
  {
    primary: {
      key: 'strength',
      label: 'Сила',
      icon: PhSword,
      hint: 'Физическая мощь, тяжёлое оружие',
    },
    derived: [
      { key: 'damage', label: 'Урон', icon: PhFlame, hint: 'Сила ×2 + Ловкость' },
      { key: 'defense', label: 'Защита', icon: PhShield, hint: 'Сила + Ловкость' },
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
      { key: 'critChance', label: 'Шанс удара', icon: PhTarget, hint: 'Ловкость ×2 + Сила' },
      { key: 'evasion', label: 'Уклонение', icon: PhWind, hint: 'Ловкость ×3 + Сила' },
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
      { key: 'initiative', label: 'Инициатива', icon: PhLightning, hint: 'Ловкость + Интеллект' },
      { key: 'magicPower', label: 'Маг. сила', icon: PhMagicWand, hint: 'Интеллект ×2' },
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
        hint: 'Харизма ×2 + Интеллект',
      },
      {
        key: 'resistance',
        label: 'Сопротивление',
        icon: PhShieldCheck,
        hint: 'Интеллект + Сила',
      },
    ],
  },
]
