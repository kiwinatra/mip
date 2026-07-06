#!/usr/bin/env node

/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MIP Debugger - реальный трейсер                                  │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { execSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

// ==========================================
// СОСТОЯНИЕ
// ==========================================

const state = {
  calls: [],
  modules: [],
  timing: {},
  history: [],
  output: '',
  command: ''
};

// ==========================================
// ВЫПОЛНЕНИЕ КОМАНДЫ С ПОЛНЫМ ТРЕЙСОМ
// ==========================================

function runCommand(cmd) {
  state.calls = [];
  state.modules = [];
  state.timing = {};
  state.output = '';
  
  const parts = cmd.split(' ');
  const command = parts[0];
  const args = parts.slice(1);
  
  try {
    // Запускаем с инспекцией
    const result = execSync(
      `node --inspect-brk=0 -e "
        const fs = require('fs');
        const path = require('path');
        const vm = require('vm');
        const Module = require('module');
        const origRequire = Module.prototype.require;
        const calls = [];
        const modules = [];
        let depth = 0;
        
        // Перехват require
        Module.prototype.require = function(id) {
          const frame = { 
            type: 'require', 
            id: id, 
            depth: depth,
            resolved: null,
            time: Date.now()
          };
          depth++;
          try {
            const resolved = Module._resolveFilename(id, this);
            frame.resolved = resolved;
            modules.push(resolved);
            const start = Date.now();
            const result = origRequire.call(this, id);
            frame.duration = Date.now() - start;
            calls.push(frame);
            depth--;
            return result;
          } catch(e) {
            frame.error = e.message;
            calls.push(frame);
            depth--;
            throw e;
          }
        };
        
        // Перехват вызовов функций
        const origApply = Function.prototype.apply;
        const origCall = Function.prototype.call;
        
        Function.prototype.apply = function(thisArg, argsArray) {
          const frame = {
            type: 'call',
            name: this.name || 'anonymous',
            depth: depth,
            args: argsArray ? JSON.stringify(argsArray).slice(0, 100) : '[]',
            time: Date.now()
          };
          depth++;
          try {
            const start = Date.now();
            const result = origApply.call(this, thisArg, argsArray);
            frame.duration = Date.now() - start;
            frame.result = typeof result === 'string' ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100);
            calls.push(frame);
            depth--;
            return result;
          } catch(e) {
            frame.error = e.message;
            calls.push(frame);
            depth--;
            throw e;
          }
        };
        
        Function.prototype.call = function(thisArg, ...args) {
          const frame = {
            type: 'call',
            name: this.name || 'anonymous',
            depth: depth,
            args: JSON.stringify(args).slice(0, 100),
            time: Date.now()
          };
          depth++;
          try {
            const start = Date.now();
            const result = origCall.call(this, thisArg, ...args);
            frame.duration = Date.now() - start;
            frame.result = typeof result === 'string' ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100);
            calls.push(frame);
            depth--;
            return result;
          } catch(e) {
            frame.error = e.message;
            calls.push(frame);
            depth--;
            throw e;
          }
        };
        
        try {
          require('./bin/mip.js');
          console.log('---TRACE_START---');
          console.log(JSON.stringify({ calls, modules }));
          console.log('---TRACE_END---');
        } catch(e) {
          console.log('---TRACE_START---');
          console.log(JSON.stringify({ calls, modules, error: e.message }));
          console.log('---TRACE_END---');
        }
      "`,
      {
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      }
    );
    
    // Парсим трейс
    const startMarker = '---TRACE_START---';
    const endMarker = '---TRACE_END---';
    const startIdx = result.indexOf(startMarker);
    const endIdx = result.indexOf(endMarker);
    
    if (startIdx !== -1 && endIdx !== -1) {
      try {
        const jsonStr = result.substring(startIdx + startMarker.length, endIdx).trim();
        const data = JSON.parse(jsonStr);
        state.calls = data.calls || [];
        state.modules = data.modules || [];
        if (data.error) {
          state.calls.push({ type: 'error', msg: data.error });
        }
      } catch (e) {
        state.calls.push({ type: 'error', msg: `Failed to parse trace: ${e.message}` });
      }
    }
    
    // Вывод без маркеров
    let output = result;
    if (startIdx !== -1) {
      output = result.substring(0, startIdx).trim();
    }
    state.output = output || '✅ Command executed successfully (no output)';
    
    state.history.push({ cmd, timestamp: Date.now() });
    
  } catch (err) {
    state.calls.push({ type: 'error', msg: err.message });
    state.output = err.stdout || err.stderr || err.message;
  }
}

// ==========================================
// ВЫВОД ТРЕЙСА
// ==========================================

function printTrace() {
  console.clear();
  
  // Заголовок
  console.log(chalk.bold.magenta('  ███╗   ███╗██╗██████╗ '));
  console.log(chalk.bold.cyan('  ████╗ ████║██║██╔══██╗'));
  console.log(chalk.bold.green('  ██╔████╔██║██║██████╔╝'));
  console.log(chalk.bold.yellow('  ██║╚██╔╝██║██║██╔═══╝ '));
  console.log(chalk.bold.red('  ██║ ╚═╝ ██║██║██║     '));
  console.log(chalk.bold.gray('  ╚═╝     ╚═╝╚═╝╚═╝     \n'));
  
  console.log(chalk.bold.white(`  🐛 MIP Debugger v${require('./package.json').version}`));
  console.log(chalk.gray(`  ───────────────────────────────────────────────────────────────`));
  console.log('');
  
  // Статистика
  const totalCalls = state.calls.length;
  const requireCalls = state.calls.filter(c => c.type === 'require').length;
  const functionCalls = state.calls.filter(c => c.type === 'call').length;
  const errors = state.calls.filter(c => c.error).length;
  
  console.log(chalk.bold.cyan('📊 STATISTICS'));
  console.log(chalk.gray('─'.repeat(80)));
  console.log(`  ${chalk.white('Total Calls:')}   ${chalk.yellow(totalCalls)}`);
  console.log(`  ${chalk.gray('├─')} ${chalk.green('require')}   ${chalk.white(requireCalls)}`);
  console.log(`  ${chalk.gray('└─')} ${chalk.blue('function')}  ${chalk.white(functionCalls)}`);
  if (errors > 0) console.log(`  ${chalk.red('Errors:')}      ${chalk.white(errors)}`);
  console.log(`  ${chalk.gray('Modules:')}      ${chalk.white(state.modules.length)}`);
  console.log('');
  
  // CALL STACK (последние 30)
  if (state.calls.length > 0) {
    console.log(chalk.bold.cyan('📋 CALL STACK'));
    console.log(chalk.gray('─'.repeat(80)));
    
    const displayCalls = state.calls.slice(-30);
    const maxDepth = Math.max(...displayCalls.map(c => c.depth || 0));
    
    for (const call of displayCalls) {
      const indent = '  '.repeat(call.depth || 0);
      const prefix = call.type === 'require' ? chalk.green('📦') : chalk.blue('🔧');
      const name = call.type === 'require' 
        ? path.basename(call.id || 'unknown') 
        : (call.name || 'anonymous');
      
      let line = `${indent}${prefix} ${chalk.white(name)}`;
      
      if (call.duration) {
        const color = call.duration > 100 ? chalk.red : call.duration > 50 ? chalk.yellow : chalk.gray;
        line += ` ${color(`(${call.duration}ms)`)}`;
      }
      
      if (call.args && call.args !== '[]' && call.args !== '""') {
        line += chalk.gray(` args: ${call.args.slice(0, 50)}`);
      }
      
      if (call.result && call.result !== 'undefined') {
        line += chalk.gray(` → ${call.result.slice(0, 50)}`);
      }
      
      if (call.error) {
        line += chalk.red(` ❌ ${call.error}`);
      }
      
      console.log(`  ${line}`);
    }
    
    console.log('');
    console.log(chalk.gray(`  ... and ${Math.max(0, state.calls.length - 30)} more calls`));
    console.log('');
  }
  
  // МОДУЛИ (топ по использованию)
  if (state.modules.length > 0) {
    console.log(chalk.bold.cyan('📦 MODULES LOADED'));
    console.log(chalk.gray('─'.repeat(80)));
    
    const moduleCount = {};
    for (const m of state.modules) {
      const key = path.basename(m);
      moduleCount[key] = (moduleCount[key] || 0) + 1;
    }
    
    const sorted = Object.entries(moduleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [name, count] of sorted) {
      console.log(`  ${chalk.gray('•')} ${chalk.white(name)} ${chalk.gray(`(${count}x)`)}`);
    }
    console.log('');
  }
  
  // ВЫВОД
  if (state.output) {
    console.log(chalk.bold.cyan('📤 OUTPUT'));
    console.log(chalk.gray('─'.repeat(80)));
    const lines = state.output.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`  ${line}`);
      }
    }
    console.log('');
  }
  
  // ПОДСКАЗКА
  console.log(chalk.gray('═'.repeat(80)));
  console.log(chalk.gray('💡 Type ') + chalk.cyan('"mip <command>"') + chalk.gray(' to trace | ') + chalk.yellow('"exit"') + chalk.gray(' to quit'));
  console.log('');
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ
// ==========================================

function startDebugger() {
  console.clear();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('🐛> ')
  });
  
  console.log(chalk.bold.magenta('  ███╗   ███╗██╗██████╗ '));
  console.log(chalk.bold.cyan('  ████╗ ████║██║██╔══██╗'));
  console.log(chalk.bold.green('  ██╔████╔██║██║██████╔╝'));
  console.log(chalk.bold.yellow('  ██║╚██╔╝██║██║██╔═══╝ '));
  console.log(chalk.bold.red('  ██║ ╚═╝ ██║██║██║     '));
  console.log(chalk.bold.gray('  ╚═╝     ╚═╝╚═╝╚═╝     \n'));
  
  console.log(chalk.bold.white(`  🐛 MIP Debugger v${require('./package.json').version}`));
  console.log(chalk.gray(`  ───────────────────────────────────────────────────────────────`));
  console.log(chalk.gray(`  💡 Type `) + chalk.cyan('"mip <command>"') + chalk.gray(' to trace | ') + chalk.yellow('"exit"') + chalk.gray(' to quit'));
  console.log(chalk.gray(`  ───────────────────────────────────────────────────────────────\n`));
  
  rl.prompt();
  
  rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'exit' || input === 'q') {
      rl.close();
      console.log(chalk.gray('\n  👋 Bye!\n'));
      process.exit(0);
    }
    
    if (input === 'clear' || input === 'cls') {
      console.clear();
      rl.prompt();
      return;
    }
    
    if (input.startsWith('mip ')) {
      runCommand(input);
      printTrace();
      rl.prompt();
      return;
    }
    
    console.log(chalk.yellow(`\n  ❓ Unknown: ${input}`));
    console.log(chalk.gray('  Type "mip <command>" to trace\n'));
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log(chalk.gray('\n  👋 Bye!\n'));
    process.exit(0);
  });
}

startDebugger();