# Чеклист реализации способностей

> Отмечаем ✅ когда способность **полностью реализована** (константа + логика + эффекты + анимация + тесты).
> Двигаемся сверху вниз по тирам. Каждую способность обсуждаем отдельно.

---

## Тир 1 — Базовые (8 способностей)

Одна характеристика ≥ 3. Открываются на старте игры.

### ⚔️ Сила (S ≥ 3)

- [x] `power_strike` — Силовой удар (active, 2AP, ×1.5 урон)
- [x] `shield_bash` — Удар щитом (active, 2AP, оглушение 1 ход)

### 🏹 Ловкость (A ≥ 3)

- [x] `quick_step` — Быстрый шаг (active, 1AP, +3 MP)
- [x] `dodge_roll` — Перекат (passive, +2 уклонение)

### 🔮 Интеллект (I ≥ 3)

- [x] `blood_bolt` — Кровавый снаряд (active, 2AP, d8+INT, кастер −2HP)
- [x] `mana_sense` — Чутьё маны (passive, +2 восприятие)

### 👑 Харизма (C ≥ 3)

- [x] `inspire` — Воодушевление (active, 2AP, союзник +1AP)
- [ ] `taunt` — Провокация (active, 1AP, таунт 2 хода)

---

## Тир 2 — Продвинутые (11 способностей)

Два стата ≥ 3 или один ≥ 5. Открываются к 6-8 уровню.

### ⚔️ S ≥ 5

- [ ] `cleave` — Раскол (active, 3AP, 2 соседние цели)

### ⚔️🏹 S ≥ 3 + A ≥ 3

- [ ] `berserker_rage` — Ярость берсерка (active, 2AP, +50% урон / −20% уклон, 3 хода)
- [ ] `charge` — Рывок (active, 3AP, прыжок 4 кл + удар)

### 🏹 A ≥ 5

- [ ] `backstab` — Удар в спину (active, 2AP, ×2 урон из невидимости)

### 🏹🔮 A ≥ 3 + I ≥ 3

- [ ] `shadow_step` — Теневой шаг (active, 2AP, телепорт 2 кл)
- [ ] `poison_blade` — Ядовитый клинок (active, 2AP, яд 3 хода)

### 🔮 I ≥ 5

- [ ] `gravity_crush` — Грав. сжатие (active, 3AP, AoE радиус 2)

### 🔮👑 I ≥ 3 + C ≥ 3

- [ ] `gravity_bolt` — Грав. удар (active, 2AP, d8+INT + притяг 1 кл)
- [ ] `heal` — Исцеление (active, 2AP, 5+INT×1.5 HP)

### ⚔️👑 S ≥ 3 + C ≥ 3

- [ ] `battle_cry` — Боевой клич (active, 2AP, +2 урон союзникам 2 кл, 2 хода)
- [ ] `intimidate` — Запугивание (active, 2AP, враг −1AP 2 хода)

---

## Тир 3 — Экспертные (12 способностей)

Два стата ≥ 5 или три ≥ 3. Открываются к 9-11 уровню.

### S ≥ 5 + A ≥ 3

- [ ] `whirlwind` — Вихрь клинков (active, 3AP, AoE 1 кл вокруг)
- [ ] `stunning_blow` — Оглушающий удар (active, 3AP, 100% оглушение)

### S ≥ 5 + C ≥ 3

- [ ] `iron_skin` — Железная кожа (passive, +3 блок)

### A ≥ 5 + I ≥ 3

- [ ] `invisibility` — Невидимость (active, 2AP, 3 хода)
- [ ] `blood_leech` — Кров. иссушение (active, 3AP, 3 цели + хил 50%)

### A ≥ 5 + C ≥ 3

- [ ] `evasion_master` — Мастер уклонений (passive, +3 уклонение)
- [ ] `disguise` — Маскировка (active, 2AP, копия облика)

### I ≥ 5 + C ≥ 3

- [ ] `gravity_well` — Грав. колодец (active, 3AP, AoE стягивание)
- [ ] `teleport` — Телепорт (active, 2AP, любая видимая клетка)

### I ≥ 5 + C ≥ 5

- [ ] `gravity_shield` — Грав. щит (passive, −5 дальнего урона)

### I ≥ 3 + C ≥ 5

- [ ] `rallying_speech` — Вдохновляющая речь (active, 3AP, +3HP +1AP 3 кл)

### S ≥ 3 + A ≥ 5

- [ ] `counter_attack` — Контратака (passive, 30% ответный удар)

---

## Тир 4 — Мастерские (12 способностей)

Один стат ≥ 7 или три стата ≥ 5. Открываются к 13-15 уровню.

### S ≥ 7

- [ ] `earthquake` — Землетрясение (active, 4AP, AoE 3 кл + сбивает с ног)

### A ≥ 7

- [ ] `blade_dance` — Танец клинков (active, 4AP, 3 удара по случайным целям)

### I ≥ 7

- [ ] `singularity` — Сингулярность (active, 4AP, AoE 3 кл + стяг. к центру)

### C ≥ 7

- [ ] `mass_charm` — Массовое очарование (active, 4AP, враги в 2 кл пропускают ход)

### S ≥ 5 + I ≥ 5

- [ ] `blood_rage` — Кровавая ярость (active, 3AP, −25%HP → ×3 урон)

### A ≥ 5 + I ≥ 5

- [ ] `shadow_assassin` — Теневой убийца (passive, крит из невидимости ×3)

### S ≥ 5 + C ≥ 5

- [ ] `paladin_aura` — Аура паладина (passive, +2 блок +2HP/ход 2 кл)

### A ≥ 5 + C ≥ 5

- [ ] `trickster_gambit` — Гамбит трикстера (active, 2AP, swap 5 кл)

### S ≥ 5 + I ≥ 3 + C ≥ 3

- [ ] `damage_reflect` — Отражение урона (passive, 20% возврат)

### S ≥ 3 + I ≥ 5 + C ≥ 3

- [ ] `regeneration` — Регенерация (passive, +3 HP/ход)

### A ≥ 3 + I ≥ 5 + C ≥ 3

- [ ] `gravity_anchor` — Грав. якорь (passive, −3 урон + иммунитет перемещ.)

### S ≥ 3 + A ≥ 3 + I ≥ 3 + C ≥ 5

- [ ] `battle_commander` — Полководец (active, 5AP, доп. ход всем союзникам)

---

## Тир S — Синергии (12 способностей)

Требуют **активированные** пререквизиты в слотах.

### 🩸 Кровь + Гравитация

- [ ] `blood_gravity_arrow` — Кровавая грав. стрела (active, 3AP, d12+INT + вампиризм 30%) ← `blood_bolt` + `gravity_bolt`
- [ ] `blood_vortex` — Кровавая воронка (active, 4AP, AoE стяг. + хил) ← `blood_leech` + `gravity_well`
- [ ] `gravity_storm` — Грав. буря (active, 5AP, AoE 4 кл, 3 хода) ← `singularity` + `gravity_well`

### ⚔️🔮 Физика + Магия

- [ ] `gravitational_blade` — Грав. клинок (active, 3AP, притяг + ×2.5) ← `gravity_bolt` + `backstab`
- [ ] `warp_strike` — Варп-удар (active, 4AP, ТП + AoE грав.) ← `shadow_step` + `gravity_crush`
- [ ] `immovable_fortress` — Несокрушимая крепость (passive, −5 урон + отраж.) ← `iron_skin` + `gravity_anchor`
- [ ] `blood_frenzy` — Кровавое безумие (active, 4AP, ×4 урон 2 удара) ← `blood_rage` + `berserker_rage`

### 🗡️🔮 Стелс + Магия

- [ ] `phantom_strike` — Фантомный удар (active, 3AP, крит ×3 + оглуш.) ← `invisibility` + `backstab`
- [ ] `shadow_gravity` — Теневой коллапс (active, 4AP, AoE грав. ×2) ← `invisibility` + `gravity_crush`

### 💚🔮 Поддержка + Магия

- [ ] `blood_transfusion` — Переливание крови (active, 2AP, −30%HP → ×2 хил) ← `blood_bolt` + `heal`
- [ ] `blood_pact` — Кровавый договор (active, 4AP, −20%HP → +3AP всем) ← `blood_drain` + `rallying_speech`
- [ ] `war_avatar` — Аватар войны (active, 5AP, ульта поддержки) ← `paladin_aura` + `battle_commander`

---

## Прогресс

| Тир   | Всего  | Готово | Прогресс |
| ----- | ------ | ------ | -------- |
| 1     | 8      | 0      | ░░░░░░░░ |
| 2     | 11     | 0      | ░░░░░░░░ |
| 3     | 12     | 0      | ░░░░░░░░ |
| 4     | 12     | 0      | ░░░░░░░░ |
| S     | 12     | 0      | ░░░░░░░░ |
| **Σ** | **55** | **0**  | **0%**   |
