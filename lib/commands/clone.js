/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');
const features = require('../utils/features');
const loader = require('../loader');
const store = require('../utils/store');

// ==========================================
// ВСТРОЕННЫЕ ПЕРЕВОДЫ ДЛЯ mip clone
// ==========================================

const LOCALES = {
  en: {
    unknown_subcommand: 'Unknown clone subcommand: {subcommand}',
    creating: 'Creating MIP clone snapshot...',
    saved: 'Snapshot saved to {path}',
    size: 'Size: {size} KB',
    write_failed: 'Failed to write snapshot: {message}',
    no_snapshot: 'No snapshot found. Run "mip clone create" first.',
    view_title: 'MIP Clone Snapshot',
    view_file: 'File: {path}',
    view_created: 'Created: {timestamp}',
    view_mip: 'MIP Version: {version}',
    view_project: 'Project',
    view_name: 'Name',
    view_version: 'Version',
    view_deps: 'Dependencies',
    view_scripts: 'Scripts',
    view_workspaces: 'Workspaces',
    view_features: 'Features',
    view_registries: 'Registries',
    view_aliases: 'Aliases',
    view_lock: 'Lockfile',
    view_lock_version: 'Lock version',
    view_hint: 'Use "mip clone apply <name>" to create a project from this snapshot',
    view_failed: 'Failed to read snapshot: {message}',
    apply_usage: 'Usage: mip clone apply <project-name>',
    apply_example: 'Example: mip clone apply my-project',
    apply_exists: 'Project directory already exists: {path}',
    apply_overwrite: 'Overwrite? (y/N)',
    apply_cancelled: 'Cancelled',
    apply_creating: 'Creating project: {name}',
    apply_created: '✅ Project created at {path}',
    apply_next: 'Next steps:',
    apply_cd: '  cd {path}',
    apply_install: '  mip install',
    apply_done: '🎉 Project cloned successfully!',
    apply_failed: 'Failed to create project: {message}',
    help_title: 'Clone MIP project configuration',
    help_usage: 'USAGE',
    help_subcommands: 'SUBCOMMANDS',
    help_create: 'Create a clone snapshot (dist/mipclone.yml)',
    help_view: 'View snapshot contents',
    help_apply: 'Create a new project from snapshot',
    help_examples: 'EXAMPLES',
    help_example_create: 'mip clone create           # Create snapshot',
    help_example_view: 'mip clone view             # View snapshot',
    help_example_apply: 'mip clone apply my-project  # Create project from snapshot',
    help_output: 'OUTPUT',
    help_output_path: 'dist/mipclone.yml'
  },
  ru: {
    unknown_subcommand: 'Неизвестная подкоманда clone: {subcommand}',
    creating: 'Создание снапшота MIP...',
    saved: 'Снапшот сохранён в {path}',
    size: 'Размер: {size} КБ',
    write_failed: 'Ошибка записи снапшота: {message}',
    no_snapshot: 'Снапшот не найден. Сначала выполните "mip clone create".',
    view_title: 'Снапшот MIP Clone',
    view_file: 'Файл: {path}',
    view_created: 'Создан: {timestamp}',
    view_mip: 'Версия MIP: {version}',
    view_project: 'Проект',
    view_name: 'Имя',
    view_version: 'Версия',
    view_deps: 'Зависимости',
    view_scripts: 'Скрипты',
    view_workspaces: 'Workspace\'ы',
    view_features: 'Фичи',
    view_registries: 'Реестры',
    view_aliases: 'Алиасы',
    view_lock: 'Lockfile',
    view_lock_version: 'Версия lock',
    view_hint: 'Используйте "mip clone apply <имя>" чтобы создать проект из этого снапшота',
    view_failed: 'Ошибка чтения снапшота: {message}',
    apply_usage: 'Использование: mip clone apply <имя-проекта>',
    apply_example: 'Пример: mip clone apply my-project',
    apply_exists: 'Папка проекта уже существует: {path}',
    apply_overwrite: 'Перезаписать? (y/N)',
    apply_cancelled: 'Отменено',
    apply_creating: 'Создание проекта: {name}',
    apply_created: '✅ Проект создан в {path}',
    apply_next: 'Следующие шаги:',
    apply_cd: '  cd {path}',
    apply_install: '  mip install',
    apply_done: '🎉 Проект успешно склонирован!',
    apply_failed: 'Ошибка создания проекта: {message}',
    help_title: 'Клонирование конфигурации MIP',
    help_usage: 'ИСПОЛЬЗОВАНИЕ',
    help_subcommands: 'ПОДКОМАНДЫ',
    help_create: 'Создать снапшот (dist/mipclone.yml)',
    help_view: 'Показать содержимое снапшота',
    help_apply: 'Создать новый проект из снапшота',
    help_examples: 'ПРИМЕРЫ',
    help_example_create: 'mip clone create           # Создать снапшот',
    help_example_view: 'mip clone view             # Показать снапшот',
    help_example_apply: 'mip clone apply my-project  # Создать проект из снапшота',
    help_output: 'ВЫВОД',
    help_output_path: 'dist/mipclone.yml'
  },
  es: {
    unknown_subcommand: 'Subcomando clone desconocido: {subcommand}',
    creating: 'Creando snapshot de MIP...',
    saved: 'Snapshot guardado en {path}',
    size: 'Tamaño: {size} KB',
    write_failed: 'Error al guardar snapshot: {message}',
    no_snapshot: 'No se encontró snapshot. Ejecuta "mip clone create" primero.',
    view_title: 'Snapshot de MIP Clone',
    view_file: 'Archivo: {path}',
    view_created: 'Creado: {timestamp}',
    view_mip: 'Versión MIP: {version}',
    view_project: 'Proyecto',
    view_name: 'Nombre',
    view_version: 'Versión',
    view_deps: 'Dependencias',
    view_scripts: 'Scripts',
    view_workspaces: 'Workspaces',
    view_features: 'Funcionalidades',
    view_registries: 'Registros',
    view_aliases: 'Alias',
    view_lock: 'Lockfile',
    view_lock_version: 'Versión del lock',
    view_hint: 'Usa "mip clone apply <nombre>" para crear un proyecto desde este snapshot',
    view_failed: 'Error al leer el snapshot: {message}',
    apply_usage: 'Uso: mip clone apply <nombre-del-proyecto>',
    apply_example: 'Ejemplo: mip clone apply mi-proyecto',
    apply_exists: 'El directorio del proyecto ya existe: {path}',
    apply_overwrite: '¿Sobrescribir? (y/N)',
    apply_cancelled: 'Cancelado',
    apply_creating: 'Creando proyecto: {name}',
    apply_created: '✅ Proyecto creado en {path}',
    apply_next: 'Próximos pasos:',
    apply_cd: '  cd {path}',
    apply_install: '  mip install',
    apply_done: '🎉 Proyecto clonado exitosamente!',
    apply_failed: 'Error al crear proyecto: {message}',
    help_title: 'Clonar configuración de proyecto MIP',
    help_usage: 'USO',
    help_subcommands: 'SUBCOMANDOS',
    help_create: 'Crear un snapshot (dist/mipclone.yml)',
    help_view: 'Ver contenido del snapshot',
    help_apply: 'Crear un nuevo proyecto desde el snapshot',
    help_examples: 'EJEMPLOS',
    help_example_create: 'mip clone create           # Crear snapshot',
    help_example_view: 'mip clone view             # Ver snapshot',
    help_example_apply: 'mip clone apply mi-proyecto  # Crear proyecto desde snapshot',
    help_output: 'SALIDA',
    help_output_path: 'dist/mipclone.yml'
  },
  de: {
    unknown_subcommand: 'Unbekannter clone-Befehl: {subcommand}',
    creating: 'Erstelle MIP-Snapshot...',
    saved: 'Snapshot gespeichert unter {path}',
    size: 'Größe: {size} KB',
    write_failed: 'Fehler beim Speichern des Snapshots: {message}',
    no_snapshot: 'Kein Snapshot gefunden. Führe zuerst "mip clone create" aus.',
    view_title: 'MIP Clone Snapshot',
    view_file: 'Datei: {path}',
    view_created: 'Erstellt: {timestamp}',
    view_mip: 'MIP-Version: {version}',
    view_project: 'Projekt',
    view_name: 'Name',
    view_version: 'Version',
    view_deps: 'Abhängigkeiten',
    view_scripts: 'Skripte',
    view_workspaces: 'Workspaces',
    view_features: 'Features',
    view_registries: 'Registries',
    view_aliases: 'Aliase',
    view_lock: 'Lockfile',
    view_lock_version: 'Lock-Version',
    view_hint: 'Verwende "mip clone apply <name>" um ein Projekt aus diesem Snapshot zu erstellen',
    view_failed: 'Fehler beim Lesen des Snapshots: {message}',
    apply_usage: 'Verwendung: mip clone apply <projekt-name>',
    apply_example: 'Beispiel: mip clone apply mein-projekt',
    apply_exists: 'Projektverzeichnis existiert bereits: {path}',
    apply_overwrite: 'Überschreiben? (y/N)',
    apply_cancelled: 'Abgebrochen',
    apply_creating: 'Erstelle Projekt: {name}',
    apply_created: '✅ Projekt erstellt unter {path}',
    apply_next: 'Nächste Schritte:',
    apply_cd: '  cd {path}',
    apply_install: '  mip install',
    apply_done: '🎉 Projekt erfolgreich geklont!',
    apply_failed: 'Fehler beim Erstellen des Projekts: {message}',
    help_title: 'MIP-Projektkonfiguration klonen',
    help_usage: 'VERWENDUNG',
    help_subcommands: 'UNTERBEFEHLE',
    help_create: 'Snapshot erstellen (dist/mipclone.yml)',
    help_view: 'Snapshot-Inhalt anzeigen',
    help_apply: 'Neues Projekt aus Snapshot erstellen',
    help_examples: 'BEISPIELE',
    help_example_create: 'mip clone create           # Snapshot erstellen',
    help_example_view: 'mip clone view             # Snapshot anzeigen',
    help_example_apply: 'mip clone apply mein-projekt  # Projekt aus Snapshot erstellen',
    help_output: 'AUSGABE',
    help_output_path: 'dist/mipclone.yml'
  },
  fr: {
    unknown_subcommand: 'Sous-commande clone inconnue : {subcommand}',
    creating: 'Création d\'un snapshot MIP...',
    saved: 'Snapshot sauvegardé dans {path}',
    size: 'Taille : {size} Ko',
    write_failed: 'Échec de l\'écriture du snapshot : {message}',
    no_snapshot: 'Aucun snapshot trouvé. Exécutez d\'abord "mip clone create".',
    view_title: 'Snapshot MIP Clone',
    view_file: 'Fichier : {path}',
    view_created: 'Créé le : {timestamp}',
    view_mip: 'Version MIP : {version}',
    view_project: 'Projet',
    view_name: 'Nom',
    view_version: 'Version',
    view_deps: 'Dépendances',
    view_scripts: 'Scripts',
    view_workspaces: 'Workspaces',
    view_features: 'Fonctionnalités',
    view_registries: 'Registres',
    view_aliases: 'Alias',
    view_lock: 'Lockfile',
    view_lock_version: 'Version du lock',
    view_hint: 'Utilisez "mip clone apply <nom>" pour créer un projet à partir de ce snapshot',
    view_failed: 'Échec de la lecture du snapshot : {message}',
    apply_usage: 'Utilisation : mip clone apply <nom-du-projet>',
    apply_example: 'Exemple : mip clone apply mon-projet',
    apply_exists: 'Le dossier du projet existe déjà : {path}',
    apply_overwrite: 'Écraser ? (y/N)',
    apply_cancelled: 'Annulé',
    apply_creating: 'Création du projet : {name}',
    apply_created: '✅ Projet créé dans {path}',
    apply_next: 'Prochaines étapes :',
    apply_cd: '  cd {path}',
    apply_install: '  mip install',
    apply_done: '🎉 Projet cloné avec succès !',
    apply_failed: 'Échec de la création du projet : {message}',
    help_title: 'Cloner la configuration d\'un projet MIP',
    help_usage: 'UTILISATION',
    help_subcommands: 'SOUS-COMMANDES',
    help_create: 'Créer un snapshot (dist/mipclone.yml)',
    help_view: 'Voir le contenu du snapshot',
    help_apply: 'Créer un nouveau projet à partir du snapshot',
    help_examples: 'EXEMPLES',
    help_example_create: 'mip clone create           # Créer un snapshot',
    help_example_view: 'mip clone view             # Voir le snapshot',
    help_example_apply: 'mip clone apply mon-projet  # Créer un projet à partir du snapshot',
    help_output: 'SORTIE',
    help_output_path: 'dist/mipclone.yml'
  }
};

// ==========================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПЕРЕВОДОВ
// ==========================================

function t(key, vars, lang) {
  const locale = LOCALES[lang] || LOCALES.en;
  let text = locale[key];
  if (!text) return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

// ==========================================
// ОСНОВНАЯ КОМАНДА
// ==========================================

async function clone(argv) {
  const lang = loadLangForCwd(process.cwd());
  const subcommand = argv[0] || 'help';
  const args = argv.slice(1);

  switch (subcommand) {
    case 'create':
      return cloneCreate(args, lang);
    case 'view':
      return cloneView(args, lang);
    case 'apply':
      return cloneApply(args, lang);
    case 'help':
    case '--help':
    case '-h':
      return showHelp(lang);
    default:
      console.error(chalk.red(`❌ ${t('unknown_subcommand', { subcommand }, lang)}`));
      showHelp(lang);
      process.exit(1);
  }
}

// ==========================================
// CREATE — создаёт mipclone.yml
// ==========================================

async function cloneCreate(argv, lang) {
  console.log(chalk.blue(`📦 ${t('creating', {}, lang)}`));

  const cwd = process.cwd();
  const distDir = path.join(cwd, 'dist');
  const outputPath = path.join(distDir, 'mipclone.yml');

  const snapshot = {
    version: '1.0',
    mipVersion: require('../../package.json').version,
    timestamp: new Date().toISOString(),
    project: getProjectInfo(),
    dependencies: getDependencies(),
    devDependencies: getDevDependencies(),
    scripts: getScripts(),
    workspaces: getWorkspaces(),
    features: getFeatures(),
    registries: getRegistries(),
    aliases: getAliases(),
    lock: getLockfile()
  };

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  try {
    const yamlContent = yaml.dump(snapshot, { indent: 2 });
    fs.writeFileSync(outputPath, yamlContent, 'utf8');
    const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(2);
    console.log(chalk.green(`✅ ${t('saved', { path: outputPath }, lang)}`));
    console.log(chalk.gray(`   ${t('size', { size: sizeKB }, lang)}`));
  } catch (err) {
    console.error(chalk.red(`❌ ${t('write_failed', { message: err.message }, lang)}`));
    process.exit(1);
  }
}

// ==========================================
// VIEW — показывает содержимое снапшота
// ==========================================

async function cloneView(argv, lang) {
  const cwd = process.cwd();
  const snapshotPath = path.join(cwd, 'dist', 'mipclone.yml');

  if (!fs.existsSync(snapshotPath)) {
    console.error(chalk.red(`❌ ${t('no_snapshot', {}, lang)}`));
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(snapshotPath, 'utf8');
    const data = yaml.load(content);

    console.log(chalk.blue(`📋 ${t('view_title', {}, lang)}\n`));
    console.log(chalk.gray(`   ${t('view_file', { path: snapshotPath }, lang)}`));
    console.log(chalk.gray(`   ${t('view_created', { timestamp: data.timestamp }, lang)}`));
    console.log(chalk.gray(`   ${t('view_mip', { version: data.mipVersion }, lang)}`));
    console.log('');

    if (data.project) {
      console.log(chalk.cyan(`   ${t('view_project', {}, lang)}:`));
      console.log(`     ${t('view_name', {}, lang)}: ${data.project.name || '—'}`);
      console.log(`     ${t('view_version', {}, lang)}: ${data.project.version || '—'}`);
      console.log('');
    }

    if (data.dependencies) {
      const deps = data.dependencies;
      const total = Object.keys(deps).length;
      console.log(chalk.cyan(`   ${t('view_deps', {}, lang)} (${total}):`));
      for (const [name, version] of Object.entries(deps).slice(0, 10)) {
        console.log(`     ${name}@${version}`);
      }
      if (total > 10) console.log(`     ... и ещё ${total - 10}`);
      console.log('');
    }

    if (data.scripts) {
      const scripts = data.scripts;
      const total = Object.keys(scripts).length;
      console.log(chalk.cyan(`   ${t('view_scripts', {}, lang)} (${total}):`));
      for (const [name, cmd] of Object.entries(scripts).slice(0, 5)) {
        console.log(`     ${name}: ${cmd}`);
      }
      if (total > 5) console.log(`     ... и ещё ${total - 5}`);
      console.log('');
    }

    if (data.workspaces && data.workspaces.length > 0) {
      console.log(chalk.cyan(`   ${t('view_workspaces', {}, lang)} (${data.workspaces.length}):`));
      for (const ws of data.workspaces) {
        console.log(`     ${ws}`);
      }
      console.log('');
    }

    if (data.features) {
      const featCount = Object.keys(data.features).length;
      console.log(chalk.cyan(`   ${t('view_features', {}, lang)} (${featCount}):`));
      for (const [key, value] of Object.entries(data.features).slice(0, 5)) {
        console.log(`     ${key}: ${value}`);
      }
      if (featCount > 5) console.log(`     ... и ещё ${featCount - 5}`);
      console.log('');
    }

    if (data.registries) {
      const regCount = Object.keys(data.registries).length;
      console.log(chalk.cyan(`   ${t('view_registries', {}, lang)} (${regCount}):`));
      for (const [name, reg] of Object.entries(data.registries)) {
        console.log(`     ${name}: ${reg.url}`);
      }
      console.log('');
    }

    if (data.aliases && Object.keys(data.aliases).length > 0) {
      console.log(chalk.cyan(`   ${t('view_aliases', {}, lang)}:`));
      for (const [name, cmd] of Object.entries(data.aliases)) {
        console.log(`     ${name} → ${cmd}`);
      }
      console.log('');
    }

    if (data.lock) {
      const lockCount = Object.keys(data.lock.packages || {}).length;
      console.log(chalk.cyan(`   ${t('view_lock', {}, lang)} (${lockCount}):`));
      console.log(`     ${t('view_lock_version', {}, lang)}: ${data.lock.version || '—'}`);
      console.log('');
    }

    console.log(chalk.gray(`💡 ${t('view_hint', {}, lang)}`));
  } catch (err) {
    console.error(chalk.red(`❌ ${t('view_failed', { message: err.message }, lang)}`));
    process.exit(1);
  }
}

// ==========================================
// APPLY — создаёт проект из снапшота
// ==========================================

async function cloneApply(argv, lang) {
  const projectName = argv[0];
  if (!projectName) {
    console.error(chalk.red(`❌ ${t('apply_usage', {}, lang)}`));
    console.log(`   ${t('apply_example', {}, lang)}`);
    process.exit(1);
  }

  const cwd = process.cwd();
  const snapshotPath = path.join(cwd, 'dist', 'mipclone.yml');

  if (!fs.existsSync(snapshotPath)) {
    console.error(chalk.red(`❌ ${t('no_snapshot', {}, lang)}`));
    process.exit(1);
  }

  const projectDir = path.join(cwd, projectName);
  if (fs.existsSync(projectDir)) {
    console.warn(chalk.yellow(`⚠️ ${t('apply_exists', { path: projectDir }, lang)}`));
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const answer = await new Promise(resolve => {
      rl.question(`   ${t('apply_overwrite', {}, lang)} `, resolve);
    });
    rl.close();
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log(chalk.gray(`   ${t('apply_cancelled', {}, lang)}`));
      process.exit(0);
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  console.log(chalk.blue(`📦 ${t('apply_creating', { name: projectName }, lang)}`));
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    const content = fs.readFileSync(snapshotPath, 'utf8');
    const data = yaml.load(content);

    // Создаём mip.yml
    const mipYml = {
      name: projectName,
      version: data.project?.version || '1.0.0',
      dependencies: data.dependencies || {},
      devDependencies: data.devDependencies || {},
      scripts: data.scripts || {},
      workspaces: data.workspaces || [],
      registries: data.registries || {},
      defaultRegistry: data.project?.defaultRegistry || 'npm'
    };
    fs.writeFileSync(
      path.join(projectDir, 'mip.yml'),
      yaml.dump(mipYml, { indent: 2 }),
      'utf8'
    );

    // Фичи
    if (data.features && Object.keys(data.features).length > 0) {
      const featuresYml = {
        features: data.features
      };
      fs.writeFileSync(
        path.join(projectDir, 'mip.config.yml'),
        yaml.dump(featuresYml, { indent: 2 }),
        'utf8'
      );
    }

    // Алиасы
    if (data.aliases && Object.keys(data.aliases).length > 0) {
      const aliasesDir = path.join(projectDir, '.mip');
      if (!fs.existsSync(aliasesDir)) fs.mkdirSync(aliasesDir, { recursive: true });
      fs.writeFileSync(
        path.join(aliasesDir, 'aliases.yml'),
        yaml.dump(data.aliases, { indent: 2 }),
        'utf8'
      );
    }

    // README
    const readme = `# ${projectName}\n\nCloned from MIP snapshot on ${new Date().toISOString()}\n\n## Install dependencies\n\n\`\`\`bash\nmip install\n\`\`\`\n\n## Scripts\n\n${Object.entries(data.scripts || {}).map(([name, cmd]) => `- \`${name}\`: ${cmd}`).join('\n')}\n`;
    fs.writeFileSync(path.join(projectDir, 'README.md'), readme, 'utf8');

    console.log(chalk.green(`✅ ${t('apply_created', { path: projectDir }, lang)}`));
    console.log(chalk.gray(`   ${t('apply_next', {}, lang)}`));
    console.log(chalk.gray(`   ${t('apply_cd', { path: projectName }, lang)}`));
    console.log(chalk.gray(`   ${t('apply_install', {}, lang)}`));
    console.log('');
    console.log(chalk.green(`🎉 ${t('apply_done', {}, lang)}`));

  } catch (err) {
    console.error(chalk.red(`❌ ${t('apply_failed', { message: err.message }, lang)}`));
    process.exit(1);
  }
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function getProjectInfo() {
  const conf = config.readConfig(process.cwd()) || {};
  return {
    name: conf.name || null,
    version: conf.version || null,
    description: conf.description || null,
    defaultRegistry: conf.defaultRegistry || null,
  };
}

function getDependencies() {
  const conf = config.readConfig(process.cwd()) || {};
  return conf.dependencies || {};
}

function getDevDependencies() {
  const conf = config.readConfig(process.cwd()) || {};
  return conf.devDependencies || {};
}

function getScripts() {
  const conf = config.readConfig(process.cwd()) || {};
  return conf.scripts || {};
}

function getWorkspaces() {
  const conf = config.readConfig(process.cwd()) || {};
  return conf.workspaces || [];
}

function getFeatures() {
  const feat = features.loadFeatures(process.cwd());
  return Object.keys(feat).length > 0 ? feat : null;
}

function getRegistries() {
  const conf = config.readConfig(process.cwd()) || {};
  return conf.registries || null;
}

function getAliases() {
  try {
    const aliasesPath = path.join(require('os').homedir(), '.mip', 'aliases.yml');
    if (fs.existsSync(aliasesPath)) {
      return yaml.load(fs.readFileSync(aliasesPath, 'utf8')) || null;
    }
  } catch (e) {}
  return null;
}

function getLockfile() {
  const lockPath = path.join(process.cwd(), 'mip-lock.yml');
  if (fs.existsSync(lockPath)) {
    try {
      return yaml.load(fs.readFileSync(lockPath, 'utf8'));
    } catch (e) {}
  }
  const lockJson = path.join(process.cwd(), 'mip-lock.json');
  if (fs.existsSync(lockJson)) {
    try {
      return JSON.parse(fs.readFileSync(lockJson, 'utf8'));
    } catch (e) {}
  }
  return null;
}

// ==========================================
// СПРАВКА
// ==========================================

function showHelp(lang) {
  console.log(`
${chalk.blue('📦 mip clone')} - ${t('help_title', {}, lang)}

${chalk.bold(t('help_usage', {}, lang))}
  mip clone <subcommand> [options]

${chalk.bold(t('help_subcommands', {}, lang))}
  create                 ${t('help_create', {}, lang)}
  view                   ${t('help_view', {}, lang)}
  apply <project-name>   ${t('help_apply', {}, lang)}

${chalk.bold(t('help_examples', {}, lang))}
  ${chalk.gray(t('help_example_create', {}, lang))}
  ${chalk.gray(t('help_example_view', {}, lang))}
  ${chalk.gray(t('help_example_apply', {}, lang))}

${chalk.bold(t('help_output', {}, lang))}
  ${t('help_output_path', {}, lang)}
`);
}

module.exports = { clone };