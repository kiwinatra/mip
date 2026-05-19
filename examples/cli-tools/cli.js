#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');

program.name('mycli').version('1.0.0');

program
  .command('hello')
  .action(() => {
    console.log(chalk.green('Hello from mip CLI!'));
  });

program.parse();