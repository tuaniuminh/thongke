/**
 * FamiLife In-App OTA Updater Service
 * Hỗ trợ kiểm tra, tải ngầm có tiến trình % & tốc độ MB/s, và kích hoạt cài đặt tự động
 * trên đa nền tảng: iOS (.ipa qua Share Sheet / TrollStore), Android (.apk qua Package Installer), Windows (.msi qua Tauri), Web/PWA.
 */

const GITHUB_REPO = 'tuaniuminh/thongke';

/**
 * Nhận diện nền tảng đang chạy ứng dụng
 * @returns {'windows' | 'ios' | 'android' | 'web'}
 */
export function detectPlatform() {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        return 'windows';
    }
    if (typeof window !== 'undefined' && window.Capacitor) {
        const platform = typeof window.Capacitor.getPlatform === 'function' ? window.Capacitor.getPlatform() : '';
        if (platform === 'ios') return 'ios';
        if (platform === 'android') return 'android';
    }
    return 'web';
}

/**
 * So sánh 2 chuỗi phiên bản (SemVer)
 * @param {string} v1 
 * @param {string} v2 
 * @returns {number} 1 nếu v1 > v2, -1 nếu v1 < v2, 0 nếu bằng nhau
 */
export function compareVersions(v1, v2) {
    const clean1 = (v1 || '').replace(/^v/, '').trim().split('.').map(Number);
    const clean2 = (v2 || '').replace(/^v/, '').trim().split('.').map(Number);
    const maxLen = Math.max(clean1.length, clean2.length);
    for (let i = 0; i < maxLen; i++) {
        const num1 = clean1[i] || 0;
        const num2 = clean2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}

/**
 * Lấy asset phù hợp từ danh sách assets của GitHub Release theo nền tảng
 */
export function getAssetForPlatform(assets = [], platform) {
    if (!Array.isArray(assets) || assets.length === 0) return null;
    
    if (platform === 'ios') {
        return assets.find(a => a.name.toLowerCase().endsWith('.ipa'));
    }
    if (platform === 'android') {
        return assets.find(a => a.name.toLowerCase().endsWith('.apk'));
    }
    if (platform === 'windows') {
        // Ưu tiên bản tiếng Việt vi-VN, sau đó đến msi bất kỳ
        return assets.find(a => a.name.toLowerCase().includes('vi-vn') && a.name.toLowerCase().endsWith('.msi'))
            || assets.find(a => a.name.toLowerCase().endsWith('.msi'))
            || assets.find(a => a.name.toLowerCase().endsWith('.exe'));
    }
    return null;
}

/**
 * Kiểm tra bản cập nhật mới từ GitHub Releases API
 * @param {string} currentVersion Phiên bản hiện tại của app
 * @returns {Promise<Object>}
 */
export async function checkForUpdates(currentVersion) {
    try {
        const platform = detectPlatform();
        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest?t=${Date.now()}`;
        
        let releaseData = null;
        try {
            const res = await fetch(url, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (res.ok) {
                releaseData = await res.json();
            }
        } catch (fetchErr) {
            console.warn('[Updater] Standard fetch failed, trying Tauri HTTP client:', fetchErr);
        }

        if (!releaseData && platform === 'windows' && window.__TAURI__ && window.__TAURI__.http) {
            try {
                const { getClient } = window.__TAURI__.http;
                const client = await getClient();
                const res = await client.get(url, {
                    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'FamiLife-App' }
                });
                if (res.status === 200) {
                    releaseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                }
            } catch (tauriHttpErr) {
                console.error('[Updater] Tauri HTTP client failed:', tauriHttpErr);
            }
        }

        if (!releaseData || !releaseData.tag_name) {
            return { hasUpdate: false, error: 'Không tìm thấy dữ liệu bản phát hành' };
        }

        const latestTag = releaseData.tag_name;
        const hasUpdate = compareVersions(latestTag, currentVersion) > 0;
        const matchingAsset = getAssetForPlatform(releaseData.assets || [], platform);

        return {
            hasUpdate,
            currentVersion,
            latestVersion: latestTag.replace(/^v/, ''),
            tagName: latestTag,
            releaseName: releaseData.name || `FamiLife ${latestTag}`,
            body: releaseData.body || 'Bản cập nhật tối ưu hóa hiệu năng và cải tiến trải nghiệm người dùng.',
            publishedAt: releaseData.published_at,
            htmlUrl: releaseData.html_url,
            platform,
            asset: matchingAsset,
            downloadUrl: matchingAsset ? matchingAsset.browser_download_url : releaseData.html_url,
            assetSizeMB: matchingAsset ? (matchingAsset.size / (1024 * 1024)).toFixed(1) : null
        };
    } catch (error) {
        console.error('[Updater] checkForUpdates error:', error);
        return { hasUpdate: false, error: error.message };
    }
}

/**
 * Gọi Capacitor Plugin Method đa cơ chế tương thích 100% môi trường Capacitor 5 & 6
 */
async function callNativeCapacitorPlugin(pluginName, methodName, options = {}, onEventListener = null, eventName = null) {
    console.log(`[BUG DETECTOR] [CapacitorBridge] Invoking ${pluginName}.${methodName}`, options);
    
    if (typeof window === 'undefined' || !window.Capacitor) {
        console.error('[BUG DETECTOR] [CapacitorBridge] window.Capacitor is not available');
        throw new Error('Môi trường Capacitor Native không tồn tại trên thiết bị.');
    }

    const cap = window.Capacitor;
    console.log('[BUG DETECTOR] [CapacitorBridge] Capacitor platform:', typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'unknown');

    let removeListenerFn = null;
    let pluginInstance = null;

    if (typeof cap.registerPlugin === 'function') {
        try {
            pluginInstance = cap.registerPlugin(pluginName);
        } catch (e) {
            console.warn('[BUG DETECTOR] [CapacitorBridge] cap.registerPlugin failed:', e);
        }
    }
    
    if (!pluginInstance && cap.Plugins && cap.Plugins[pluginName]) {
        pluginInstance = cap.Plugins[pluginName];
    }

    if (eventName && onEventListener) {
        const wrapListener = (data) => {
            console.log(`[BUG DETECTOR] [CapacitorBridge] Event received ${eventName}:`, data);
            onEventListener(data);
        };
        
        // 1. Lắng nghe qua DOM CustomEvent (được Native Swift/Java dispatch trực tiếp)
        const domHandler = (e) => {
            const detail = e.detail || e;
            wrapListener(detail);
        };
        window.addEventListener(eventName, domHandler);

        // 2. Lắng nghe qua Plugin Instance nếu có hỗ trợ
        let pluginListenerHandle = null;
        if (pluginInstance && typeof pluginInstance.addListener === 'function') {
            try {
                pluginInstance.addListener(eventName, wrapListener).then(handle => {
                    pluginListenerHandle = handle;
                }).catch(err => {
                    console.warn('[BUG DETECTOR] [CapacitorBridge] pluginInstance.addListener error:', err);
                });
            } catch (e) {
                console.warn('[BUG DETECTOR] [CapacitorBridge] pluginInstance.addListener sync error:', e);
            }
        }

        removeListenerFn = () => {
            window.removeEventListener(eventName, domHandler);
            if (pluginListenerHandle && typeof pluginListenerHandle.remove === 'function') {
                try { pluginListenerHandle.remove(); } catch (ignored) {}
            }
        };
    }

    try {
        if (pluginInstance && typeof pluginInstance[methodName] === 'function') {
            console.log(`[BUG DETECTOR] [CapacitorBridge] Calling via pluginInstance.${methodName}`);
            const result = await pluginInstance[methodName](options);
            console.log(`[BUG DETECTOR] [CapacitorBridge] Result:`, result);
            return result;
        }

        if (typeof cap.nativePromise === 'function') {
            console.log(`[BUG DETECTOR] [CapacitorBridge] Calling via cap.nativePromise`);
            const result = await cap.nativePromise(pluginName, methodName, options);
            console.log(`[BUG DETECTOR] [CapacitorBridge] Result:`, result);
            return result;
        }

        if (typeof cap.toNative === 'function') {
            console.log(`[BUG DETECTOR] [CapacitorBridge] Calling via cap.toNative`);
            return await new Promise((resolve, reject) => {
                cap.toNative(pluginName, methodName, options, {
                    resolve: (res) => resolve(res),
                    reject: (err) => reject(err)
                });
            });
        }

        throw new Error(`Không thể tìm thấy hoặc kết nối tới ${pluginName}.${methodName} trên thiết bị.`);
    } finally {
        if (removeListenerFn) removeListenerFn();
    }
}

/**
 * Tải file cập nhật và kích hoạt cài đặt trên từng nền tảng
 * @param {Object} releaseInfo Thông tin release nhận từ checkForUpdates
 * @param {Function} onProgress Callback cập nhật tiến trình { progress, downloadedMB, totalMB, speed }
 */
export async function downloadAndInstallUpdate(releaseInfo, onProgress) {
    const { platform, downloadUrl, latestVersion, asset } = releaseInfo;

    // 1. NỀN TẢNG iOS (Capacitor Swift Plugin -> Share Sheet / TrollStore)
    if (platform === 'ios') {
        console.log('[BUG DETECTOR] [Updater] Starting iOS in-app update download for:', downloadUrl);
        try {
            const res = await callNativeCapacitorPlugin(
                'LiveActivityPlugin',
                'downloadAndOpenIPA',
                { url: downloadUrl },
                onProgress,
                'ipaDownloadProgress'
            );
            return res;
        } catch (err) {
            console.error('[BUG DETECTOR] [Updater] iOS Native Plugin failed:', err);
            // Fallback mở Safari chỉ khi Native Plugin báo lỗi
            window.open(downloadUrl, '_blank');
            return { success: true, fallback: true, error: err.message };
        }
    }

    // 2. NỀN TẢNG ANDROID (Capacitor Java Plugin -> Package Installer)
    if (platform === 'android') {
        console.log('[BUG DETECTOR] [Updater] Starting Android in-app update download for:', downloadUrl);
        try {
            const res = await callNativeCapacitorPlugin(
                'AppUpdatePlugin',
                'downloadAndInstallAPK',
                { url: downloadUrl },
                onProgress,
                'apkDownloadProgress'
            );
            return res;
        } catch (err) {
            console.error('[BUG DETECTOR] [Updater] Android Native Plugin failed:', err);
            window.open(downloadUrl, '_blank');
            return { success: true, fallback: true, error: err.message };
        }
    }

    // 3. NỀN TẢNG WINDOWS (Tauri MSI Installer)
    if (platform === 'windows') {
        if (!window.__TAURI__ || !window.__TAURI__.fs) {
            window.open(downloadUrl, '_blank');
            return { success: true, fallback: true };
        }

        const tauri = window.__TAURI__;
        const fs = tauri.fs;
        const pathApi = tauri.path || {};
        const shell = tauri.shell || {};

        let tempPath = '';
        try {
            if (typeof pathApi.tempdir === 'function') {
                tempPath = await pathApi.tempdir();
            } else if (typeof pathApi.tempDir === 'function') {
                tempPath = await pathApi.tempDir();
            }
        } catch (e) {
            console.warn('[BUG DETECTOR] [Updater] pathApi tempDir query failed:', e);
        }

        const filename = asset?.name || `FamiLife_${latestVersion}_x64_vi-VN.msi`;
        let savePath = '';
        if (tempPath) {
            const sep = tempPath.endsWith('\\') || tempPath.endsWith('/') ? '' : '\\';
            savePath = `${tempPath}${sep}${filename}`;
        }

        let allChunks = null;
        let receivedBytes = 0;

        // Thử tải qua browser fetch trước (hỗ trợ stream progress), nếu gặp lỗi CORS / Failed to fetch thì chuyển sang Tauri Native HTTP Client
        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
            const reader = response.body.getReader();
            let chunks = [];
            let lastTime = Date.now();
            let lastBytes = 0;
            let speedStr = '0 KB/s';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;

                const now = Date.now();
                if (now - lastTime >= 250) {
                    const diffBytes = receivedBytes - lastBytes;
                    const intervalSec = (now - lastTime) / 1000.0;
                    const bytesPerSec = intervalSec > 0 ? (diffBytes / intervalSec) : 0;
                    if (bytesPerSec >= 1024 * 1024) {
                        speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
                    } else {
                        speedStr = `${Math.round(bytesPerSec / 1024)} KB/s`;
                    }
                    lastTime = now;
                    lastBytes = receivedBytes;

                    if (onProgress) {
                        onProgress({
                            progress: totalBytes > 0 ? (receivedBytes / totalBytes) : 0,
                            downloadedBytes: receivedBytes,
                            totalBytes: totalBytes,
                            downloadedMB: (receivedBytes / (1024 * 1024)).toFixed(1),
                            totalMB: (totalBytes / (1024 * 1024)).toFixed(1),
                            speed: speedStr
                        });
                    }
                }
            }

            allChunks = new Uint8Array(receivedBytes);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }
        } catch (fetchErr) {
            console.warn('[BUG DETECTOR] [Updater] Browser fetch failed with CORS/Origin redirect. Falling back to Tauri Native HTTP Client:', fetchErr);
            
            if (onProgress) {
                onProgress({ progress: 0.2, speed: 'Đang kết nối Native HTTP...' });
            }

            if (tauri.http && typeof tauri.http.fetch === 'function') {
                const res = await tauri.http.fetch(downloadUrl, {
                    method: 'GET',
                    responseType: 3 // ResponseType.Binary
                });
                if (res.status !== 200) throw new Error(`Tauri HTTP error: Status ${res.status}`);
                const data = res.data;
                allChunks = data instanceof Uint8Array ? data : new Uint8Array(data);
                receivedBytes = allChunks.length;
            } else {
                throw fetchErr;
            }
        }

        // Ghi xuống file Temp
        let writeSuccess = false;
        try {
            if (fs.BaseDirectory && fs.BaseDirectory.Temp) {
                await fs.writeBinaryFile(filename, allChunks, { dir: fs.BaseDirectory.Temp });
                writeSuccess = true;
            }
        } catch (writeErr) {
            console.warn('[BUG DETECTOR] [Updater] write with BaseDirectory.Temp failed:', writeErr);
        }

        if (!writeSuccess && savePath) {
            try {
                await fs.writeBinaryFile(savePath, allChunks);
                writeSuccess = true;
            } catch (writeErr2) {
                console.warn('[BUG DETECTOR] [Updater] Direct writeBinaryFile failed:', writeErr2);
            }
        }

        if (!writeSuccess) {
            await fs.writeBinaryFile(filename, allChunks);
        }

        if (onProgress) {
            onProgress({
                progress: 1.0,
                downloadedBytes: receivedBytes,
                totalBytes: receivedBytes,
                downloadedMB: (receivedBytes / (1024 * 1024)).toFixed(1),
                totalMB: (receivedBytes / (1024 * 1024)).toFixed(1),
                speed: 'Hoàn tất'
            });
        }

        // Mở trình cài đặt MSI
        let openSuccess = false;
        if (savePath && shell.open) {
            try {
                await shell.open(savePath);
                openSuccess = true;
            } catch (openErr) {
                console.warn('[BUG DETECTOR] [Updater] shell.open(savePath) failed:', openErr);
            }
        }

        if (!openSuccess && pathApi.resolve && tempPath && shell.open) {
            try {
                const resolved = await pathApi.resolve(tempPath, filename);
                await shell.open(resolved);
                openSuccess = true;
            } catch (rErr) {
                console.warn('[BUG DETECTOR] [Updater] resolve open failed:', rErr);
            }
        }

        if (!openSuccess && shell.open) {
            try {
                await shell.open(filename);
                openSuccess = true;
            } catch (fErr) {
                console.warn('[BUG DETECTOR] [Updater] shell.open(filename) failed:', fErr);
            }
        }

        if (!openSuccess) {
            window.open(downloadUrl, '_blank');
        }

        // Tự động đóng ứng dụng sau 3 giây để cài đè an toàn
        setTimeout(() => {
            if (window.__TAURI__.process && window.__TAURI__.process.exit) {
                window.__TAURI__.process.exit(0);
            }
        }, 3000);

        return { success: true, path: savePath || filename };
    }

    // 4. NỀN TẢNG WEB / PWA
    console.log('[BUG DETECTOR] [Updater] Updating Web/PWA app directly via Cache Busting & Service Worker reset...');
    
    if (onProgress) {
        onProgress({
            progress: 0.3,
            downloadedMB: '0.5',
            totalMB: '1.0',
            speed: 'Đang dọn dẹp bộ nhớ đệm PWA...'
        });
    }

    // Xóa cache và unregister Service Worker song song
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
                await caches.delete(key);
            }
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const r of registrations) {
                await r.unregister();
            }
        }
    } catch (err) {
        console.error('[Updater] Cache clear failed:', err);
    }

    if (onProgress) {
        onProgress({
            progress: 1.0,
            downloadedMB: '1.0',
            totalMB: '1.0',
            speed: 'Đang tải lại phiên bản mới...'
        });
    }

    await new Promise(resolve => setTimeout(resolve, 600));

    // Cập nhật tham số query param phiên bản và reload
    const url = new URL(window.location.href);
    url.searchParams.set('v', latestVersion || Date.now());
    window.location.href = url.toString();
    
    setTimeout(() => {
        window.location.reload();
    }, 200);

    return { success: true, web: true };
}

/**
 * Hiển thị Modal Cập Nhật Trực Quan Hiện Đại (Tương thích 100% Light Mode & Dark Mode)
 * @param {Object} releaseInfo 
 * @param {Function} showToast 
 */
export function showUpdateModal(releaseInfo, showToast) {
    const existingModal = document.getElementById('inAppUpdateModal');
    if (existingModal) existingModal.remove();

    const { currentVersion, latestVersion, releaseName, body, assetSizeMB, platform } = releaseInfo;

    const platformBadge = platform === 'ios' ? '🍏 iOS (IPA)' :
                          platform === 'android' ? '🤖 Android (APK)' :
                          platform === 'windows' ? '🪟 Windows (MSI)' : '🌐 Web';

    const modal = document.createElement('div');
    modal.id = 'inAppUpdateModal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.25s ease-out;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--bg-secondary, #ffffff);
            color: var(--text-primary, #111827);
            border: 1px solid var(--border-color, rgba(0,0,0,0.1));
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            box-shadow: var(--glass-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        ">
            <!-- Header -->
            <div style="
                background: var(--bg-tertiary, #f8fafc);
                padding: 20px 20px 16px;
                border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
                position: relative;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="
                        width: 44px;
                        height: 44px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #0284c7, #2563eb);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.3);
                        flex-shrink: 0;
                    ">
                        <i data-lucide="sparkles" style="color: #fff; width: 22px; height: 22px;"></i>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary, #111827);">Bản Cập Nhật Mới!</h3>
                            <span style="font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: rgba(2, 132, 199, 0.12); color: var(--primary-color, #0284c7);">${platformBadge}</span>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-secondary, #6b7280); margin-top: 2px;">
                            v${currentVersion} &rarr; <strong style="color: var(--primary-color, #0284c7);">v${latestVersion}</strong>
                            ${assetSizeMB ? ` &bull; ~${assetSizeMB} MB` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Body: Changelog -->
            <div style="padding: 16px 20px; max-height: 220px; overflow-y: auto; font-size: 0.88rem; line-height: 1.5; color: var(--text-secondary, #4b5563);">
                <div style="font-weight: 700; color: var(--text-primary, #111827); margin-bottom: 8px; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px;">
                    📝 Có gì mới trong bản này:
                </div>
                <div style="white-space: pre-line; background: var(--bg-tertiary, #f3f4f6); color: var(--text-secondary, #4b5563); padding: 12px 14px; border-radius: 12px; font-size: 0.84rem; border: 1px solid var(--border-color, rgba(0,0,0,0.06));">
                    ${escapeHtml(body)}
                </div>
            </div>

            <!-- Progress Section (Ẩn ban đầu, hiện khi bắt đầu tải) -->
            <div id="updateProgressContainer" style="display: none; padding: 0 20px 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px; color: var(--text-secondary, #4b5563);">
                    <span id="updateProgressMB" style="font-weight: 500;">Đang kết nối tải file...</span>
                    <span id="updateProgressSpeed" style="color: var(--primary-color, #0284c7); font-weight: 700;">0 KB/s</span>
                </div>
                <div style="height: 8px; width: 100%; background: var(--border-color, rgba(0,0,0,0.1)); border-radius: 99px; overflow: hidden; position: relative;">
                    <div id="updateProgressBar" style="
                        height: 100%;
                        width: 0%;
                        background: linear-gradient(90deg, #0284c7, #3b82f6, #10b981);
                        border-radius: 99px;
                        transition: width 0.2s ease-out;
                    "></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted, #9ca3af); margin-top: 4px;" id="updateProgressPercent">0%</div>
            </div>

            <!-- Actions Footer -->
            <div style="
                padding: 14px 20px;
                background: var(--bg-tertiary, #f8fafc);
                border-top: 1px solid var(--border-color, rgba(0,0,0,0.08));
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            ">
                <button id="btnDismissUpdate" style="
                    padding: 9px 16px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color, rgba(0,0,0,0.15));
                    background: transparent;
                    color: var(--text-secondary, #4b5563);
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                ">Để sau</button>

                <button id="btnStartDownloadUpdate" style="
                    padding: 9px 20px;
                    border-radius: 10px;
                    border: none;
                    background: var(--primary-gradient, linear-gradient(135deg, #0284c7, #1d4ed8));
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
                    transition: transform 0.1s, opacity 0.2s;
                ">
                    <i data-lucide="download-cloud" style="width: 16px; height: 16px;"></i>
                    <span>Cập nhật ngay</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    // Event listeners
    const btnDismiss = document.getElementById('btnDismissUpdate');
    const btnStart = document.getElementById('btnStartDownloadUpdate');
    const progressContainer = document.getElementById('updateProgressContainer');
    const progressBar = document.getElementById('updateProgressBar');
    const progressMB = document.getElementById('updateProgressMB');
    const progressSpeed = document.getElementById('updateProgressSpeed');
    const progressPercent = document.getElementById('updateProgressPercent');

    btnDismiss.onclick = () => modal.remove();

    btnStart.onclick = async () => {
        btnStart.disabled = true;
        btnStart.style.opacity = '0.6';
        btnStart.innerHTML = `<i data-lucide="loader-2" class="spin-anim" style="width: 16px; height: 16px;"></i> <span>Đang xử lý...</span>`;
        if (window.lucide) window.lucide.createIcons();

        progressContainer.style.display = 'block';

        try {
            await downloadAndInstallUpdate(releaseInfo, (data) => {
                console.log('[BUG DETECTOR] [UI] Progress update:', data);
                const percent = Math.min(Math.max(Math.round((data.progress || 0) * 100), 0), 100);
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressPercent) progressPercent.textContent = `${percent}%`;
                
                if (progressMB) {
                    if (data.downloadedMB && data.totalMB && parseFloat(data.totalMB) > 0) {
                        progressMB.textContent = `Đã tải: ${data.downloadedMB} / ${data.totalMB} MB`;
                    } else if (data.downloadedMB) {
                        progressMB.textContent = `Đã tải: ${data.downloadedMB} MB`;
                    }
                }

                if (progressSpeed && data.speed) {
                    progressSpeed.textContent = data.speed;
                }
            });

            if (showToast) showToast('Đã tải hoàn tất! Đang khởi chạy bảng cài đặt...', 'success');
            setTimeout(() => {
                modal.remove();
            }, 1200);

        } catch (err) {
            const errDetail = (err && err.message) ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
            console.error('[BUG DETECTOR] [Updater] Download error:', err, 'Detail:', errDetail);
            if (showToast) showToast(`Lỗi cập nhật: ${errDetail}`, 'error');
            btnStart.disabled = false;
            btnStart.style.opacity = '1';
            btnStart.innerHTML = `<i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i> <span>Thử lại</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    };
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
