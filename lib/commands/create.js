/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const features = require('../utils/features');

const templates = {
  node: {
    files: {
      'index.js':
        "console.log('Hello from Node.js!');\n\nmodule.exports = { hello: () => 'world' };\n",
      'package.json': `{
  "name": "{{name}}",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}`,
      'README.md': '# {{name}}\n\nNode.js project created with mip\n',
      '.gitignore': 'node_modules/\n.mip/\n',
    },
    install: ['nodemon'],
    description: 'Simple Node.js application',
  },

  react: {
    files: {
      'src/App.js': 'function App() { return <h1>React App</h1>; }\nexport default App;\n',
      'src/index.js':
        "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n",
      'public/index.html': '<div id="root"></div>\n',
      'package.json': `{
  "name": "{{name}}",
  "scripts": { "start": "react-scripts start", "build": "react-scripts build" },
  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0", "react-scripts": "^5.0.0" }
}`,
    },
    install: ['react', 'react-dom', 'react-scripts'],
    description: 'React single-page application',
  },

  cli: {
    files: {
      'bin/cli.js': "#!/usr/bin/env node\nconsole.log('CLI Tool!');\n",
      'package.json': `{
  "name": "{{name}}",
  "bin": { "{{name}}": "./bin/cli.js" }
}`,
      'README.md': '# {{name}}\n\nCLI tool\n',
    },
    install: [],
    description: 'Command-line interface tool',
  },

  express: {
    files: {
      'app.js':
        "const express = require('express');\nconst app = express();\napp.get('/', (req, res) => res.json({ message: 'Hello' }));\napp.listen(3000);\n",
      'package.json': `{
  "name": "{{name}}",
  "dependencies": { "express": "^4.18.0" },
  "devDependencies": { "nodemon": "^3.0.0" },
  "scripts": { "start": "node app.js", "dev": "nodemon app.js" }
}`,
    },
    install: ['express', 'nodemon'],
    description: 'Express.js web application',
  },
};

async function create(templateName, projectName) {
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['create.enabled'] === false) {
    console.log('ℹ️ Create command is disabled (create.enabled: false)');
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnCreate'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`📦 Create "${templateName}" project "${projectName}"? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  if (!templateName || !projectName) {
    console.log(`
📦 Templates: node, react, cli, express

Usage: mip create <template> <name>
  mip create node my-app
    `);
    return;
  }

  const template = templates[templateName];
  if (!template) {
    console.log(`❌ Unknown template: ${templateName}`);
    console.log('📦 Available templates:');
    for (const [name, tpl] of Object.entries(templates)) {
      console.log(`  • ${name} — ${tpl.description}`);
    }
    return;
  }

  const projectPath = path.join(process.cwd(), projectName);
  if (fs.existsSync(projectPath)) {
    console.log(`❌ ${projectName} already exists`);
    return;
  }

  console.log(`📦 Creating ${templateName} project: ${projectName}\n`);
  fs.mkdirSync(projectPath, { recursive: true });

  // Используем фичи для дополнительных файлов
  const extraFiles = mipFeatures['create.extraFiles'] || {};
  
  for (const [filePath, content] of Object.entries({ ...template.files, ...extraFiles })) {
    const fullPath = path.join(projectPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.replace(/{{name}}/g, projectName));
    console.log(`  ✅ ${filePath}`);
  }

  if (templateName === 'cli') {
    fs.chmodSync(path.join(projectPath, 'bin', 'cli.js'), '755');
  }

  // Автоматическая установка зависимостей (если включено)
  if (template.install.length && mipFeatures['create.autoInstall'] !== false) {
    console.log('\n📦 Installing dependencies...');
    process.chdir(projectPath);
    for (const dep of template.install) {
      try {
        execSync(`mip install ${dep}`, { stdio: 'pipe' });
        console.log(`  ✅ ${dep} installed`);
      } catch (e) {
        console.log(`  ❌ Failed to install ${dep}`);
      }
    }
    process.chdir('..');
  }

  // Создание .gitignore если включено
  if (mipFeatures['create.gitInit'] !== false) {
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, 'node_modules/\n.mip/\n.env\n.DS_Store\n', 'utf8');
      console.log('  ✅ .gitignore created');
    }
  }

  console.log(`\n✅ Created! cd ${projectName} && mip run start`);
  console.log(`\n📚 Docs: https://mipdocs.fwh.is`);
}

module.exports = { create };