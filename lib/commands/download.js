const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const tar = require('tar');

const REPO_URL = process.env.MIP_REPO_URL || 'https://mipapi.fwh.is';

async function download(type, name, version = 'latest') {
    console.log('[DEBUG] download() called with:', { type, name, version });
    console.log('[DEBUG] REPO_URL:', REPO_URL);
    
    if (!type || !name) {
        console.log('❌ Usage: mip download <package|plugin> <name> [version]');
        return;
    }
    
    console.log(`📥 Downloading ${type}: ${name}@${version}`);
    
    try {
        // Получаем информацию о пакете/плагине
        const infoUrl = `${REPO_URL}/${type}s/${name}`;
        console.log('[DEBUG] infoUrl:', infoUrl);
        
        const infoRes = await axios.get(infoUrl);
        console.log('[DEBUG] infoRes.status:', infoRes.status);
        const info = infoRes.data;
        console.log('[DEBUG] info keys:', Object.keys(info));
        
        // Определяем версию
        let targetVersion = version;
        if (version === 'latest') {
            const versions = Object.keys(info.versions || {}).sort();
            console.log('[DEBUG] available versions:', versions);
            if (versions.length === 0) {
                console.log(`❌ No versions found for ${name}`);
                return;
            }
            targetVersion = versions[versions.length - 1];
            console.log('[DEBUG] latest version:', targetVersion);
        }
        
        if (!info.versions || !info.versions[targetVersion]) {
            console.log(`❌ Version ${targetVersion} not found for ${name}`);
            console.log('[DEBUG] available versions:', Object.keys(info.versions || {}));
            return;
        }
        
        const pkgInfo = info.versions[targetVersion];
        const tarballUrl = pkgInfo.dist?.tarball;
        console.log('[DEBUG] tarballUrl:', tarballUrl);
        
        if (!tarballUrl) {
            console.log('❌ No tarball URL found');
            return;
        }
        
        console.log(`⬇️ Downloading ${name}@${targetVersion}...`);
        
        // Скачиваем tarball
        const response = await axios.get(tarballUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000
        });
        console.log('[DEBUG] download response size:', response.data.length);
        
        // Определяем куда распаковать
        let targetDir;
        if (type === 'plugin') {
            targetDir = path.join(os.homedir(), '.mip', 'plugins', name);
        } else {
            targetDir = path.join(os.homedir(), '.mip', 'store', name, targetVersion);
        }
        console.log('[DEBUG] targetDir:', targetDir);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('[DEBUG] created targetDir');
        }
        
        // Сохраняем и распаковываем
        const tempTar = path.join(os.tmpdir(), `${name}-${targetVersion}.tgz`);
        fs.writeFileSync(tempTar, response.data);
        console.log('[DEBUG] tempTar written:', tempTar);
        
        await tar.extract({
            file: tempTar,
            cwd: targetDir,
            strip: 1
        });
        console.log('[DEBUG] extraction complete');
        
        fs.unlinkSync(tempTar);
        console.log('[DEBUG] tempTar cleaned up');
        
        console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} ${name}@${targetVersion} installed to ${targetDir}`);
        
    } catch (err) {
        console.log('[DEBUG] error:', err.message);
        if (err.response) {
            console.log('[DEBUG] response status:', err.response.status);
            console.log('[DEBUG] response data:', err.response.data);
        }
        console.log(`❌ Failed to download: ${err.message}`);
    }
}

module.exports = { download };