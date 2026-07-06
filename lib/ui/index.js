// Цвета
const { ANSI, supportsColor, maybeColor, color } = require('./colors');
const colorsFn = require('./colors-fn');

// Вспомогательные
const helpers = require('./helpers');

// Прогресс
const progress = require('./progress');

// Форматирование
const format = require('./format');

// Объединяем всё
module.exports = {
  // ANSI
  ANSI,
  supportsColor,
  maybeColor,
  color,

  // Цветные функции
  ...colorsFn,

  // Вспомогательные
  ...helpers,

  // Прогресс
  ...progress,

  // Форматирование
  ...format,
};