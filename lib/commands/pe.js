/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { getPluginManager } = require('../api/plugin-manager');

async function pe(pluginName, commandName, args = []) {
  if (!pluginName || !commandName) {
    console.log(`
Usage: mip pe <plugin> <command> [args...]

Examples:
  mip pe hello hello
  mip pe hello hello world
  mip pe hello help
`);
    return;
  }

  if (process.env.DEBUG) {
    console.log(`[PE] Executing ${pluginName} ${commandName} with args:`, args);
  }

  try {
    const pm = getPluginManager();
    
    const plugin = pm.getPlugin(pluginName);
    if (!plugin) {
      console.log(`❌ Plugin "${pluginName}" not found or not activated`);
      console.log(`💡 Run "mip plugin list" to see available plugins`);
      return;
    }

    if (!plugin.commands || !plugin.commands[commandName]) {
      console.log(`❌ Command "${commandName}" not found in plugin "${pluginName}"`);
      console.log(`💡 Available commands:`);
      if (plugin.commands) {
        for (const cmd of Object.keys(plugin.commands)) {
          console.log(`  - ${cmd}`);
        }
      } else {
        console.log(`  (no commands registered)`);
      }
      return;
    }

    await plugin.commands[commandName](args);
  } catch (err) {
    console.log(`❌ ${err.message}`);
  }
}

module.exports = { pe };