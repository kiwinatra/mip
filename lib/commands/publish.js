const fs = require('fs');
const path = require('path');
const tar = require('tar');
const { execSync } = require('child_process');

const REPO_URL = process.env.MIP_REPO_URL || 'https://mipapi.fwh.is';

async function publish(type, name) {
    console.log('[DEBUG] publish() called with:', { type, name });
    console.log('[DEBUG] REPO_URL:', REPO_URL);
    
    const cwd = process.cwd();
    console.log('[DEBUG] cwd:', cwd);
    
    if (!name) {
        const pkgPath = path.join(cwd, 'mip.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            name = pkg.name;
            console.log('[DEBUG] name from mip.json:', name);
        } else {
            console.log('❌ No name provided and no mip.json found');
            console.log('Usage: mip publish <package|plugin> <name>');
            return;
        }
    }
    
    const pkgPath = path.join(cwd, 'mip.json');
    let version = '1.0.0';
    let description = '';
    
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        version = pkg.version || '1.0.0';
        description = pkg.description || '';
        console.log('[DEBUG] version from mip.json:', version);
    }
    
    console.log(`📦 Publishing ${type}: ${name}@${version}`);
    
    const files = fs.readdirSync(cwd).filter(f => 
        !['node_modules', '.git', '.mip', 'node_modules', 'package-lock.json'].includes(f)
    );
    
    const tarballPath = path.join(cwd, `${name}-${version}.tgz`);
    
    try {
        await tar.create({
            cwd: cwd,
            file: tarballPath,
            gzip: true
        }, files);
        console.log('[DEBUG] tarball created');
    } catch (err) {
        console.log('❌ Failed to create tarball:', err.message);
        return;
    }
    
    const tarball = fs.readFileSync(tarballPath);
    
    const payload = {
        name,
        version,
        type,
        tarball: tarball.toString('base64'),
        description
    };
    
    const jsonPayload = JSON.stringify(payload);
    
    try {
        // Используем curl для обхода антибот-защиты
        const curlCmd = `curl -X POST ${REPO_URL}/publish \
            -H "Content-Type: application/json" \
            -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
            -d '${jsonPayload}' \
            --max-time 30 \
            --silent \
            --show-error`;
        
        console.log('[DEBUG] Executing curl...');
        const result = execSync(curlCmd, { encoding: 'utf8' });
        console.log('[DEBUG] curl result:', result);
        
        let response;
        try {
            response = JSON.parse(result);
        } catch {
            console.log('❌ Server returned non-JSON response:');
            console.log(result.substring(0, 500));
            return;
        }
        
        if (response.success) {
            console.log(`✅ Published ${name}@${version}`);
            console.log(`   URL: ${response.url}`);
        } else {
            console.log(`❌ Failed: ${response.error || 'Unknown error'}`);
        }
    } catch (err) {
        console.log('❌ Failed to publish:', err.message);
    }
    
    try {
        fs.unlinkSync(tarballPath);
    } catch {}
}

module.exports = { publish };   