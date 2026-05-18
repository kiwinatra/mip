const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const templates = {
  'node': {
    files: {
      'index.js': `console.log('Hello from Node.js!');\n\nmodule.exports = { hello: () => 'world' };\n`,
      'package.json': `{
  "name": "{{name}}",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}`,
      'README.md': `# {{name}}\n\nNode.js project created with mip\n`,
      '.gitignore': `node_modules/\n.mip/\n`
    },
    install: ['nodemon']
  },
  
  'react': {
    files: {
      'src/App.js': `function App() { return <h1>React App</h1>; }\nexport default App;\n`,
      'src/index.js': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n`,
      'public/index.html': `<div id="root"></div>\n`,
      'package.json': `{
  "name": "{{name}}",
  "scripts": { "start": "react-scripts start", "build": "react-scripts build" },
  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0", "react-scripts": "^5.0.0" }
}`
    },
    install: ['react', 'react-dom', 'react-scripts']
  },
  
  'cli': {
    files: {
      'bin/cli.js': `#!/usr/bin/env node\nconsole.log('CLI Tool!');\n`,
      'package.json': `{
  "name": "{{name}}",
  "bin": { "{{name}}": "./bin/cli.js" }
}`,
      'README.md': `# {{name}}\n\nCLI tool\n`
    },
    install: []
  },
  
  'express': {
    files: {
      'app.js': `const express = require('express');\nconst app = express();\napp.get('/', (req, res) => res.json({ message: 'Hello' }));\napp.listen(3000);\n`,
      'package.json': `{
  "name": "{{name}}",
  "dependencies": { "express": "^4.18.0" },
  "devDependencies": { "nodemon": "^3.0.0" },
  "scripts": { "start": "node app.js", "dev": "nodemon app.js" }
}`
    },
    install: ['express', 'nodemon']
  }
};

async function create(templateName, projectName) {
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
    return;
  }
  
  const projectPath = path.join(process.cwd(), projectName);
  if (fs.existsSync(projectPath)) {
    console.log(`❌ ${projectName} already exists`);
    return;
  }
  
  console.log(`📦 Creating ${templateName} project: ${projectName}\n`);
  fs.mkdirSync(projectPath, { recursive: true });
  
  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = path.join(projectPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.replace(/{{name}}/g, projectName));
    console.log(`  ✅ ${filePath}`);
  }
  
  if (templateName === 'cli') {
    fs.chmodSync(path.join(projectPath, 'bin', 'cli.js'), '755');
  }
  
  if (template.install.length) {
    console.log(`\n📦 Installing dependencies...`);
    process.chdir(projectPath);
    for (const dep of template.install) {
      execSync(`mip install ${dep}`, { stdio: 'pipe' });
    }
    process.chdir('..');
  }
  
  console.log(`\n✅ Created! cd ${projectName} && mip run start`);
}

module.exports = { create };