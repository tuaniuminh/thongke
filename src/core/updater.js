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
        const platform = window.Capacitor.getPlatform();
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
        if (platform === 'windows' && window.__TAURI__ && window.__TAURI__.http) {
            const { getClient } = window.__TAURI__.http;
            const client = await getClient();
            const res = await client.get(url, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'FamiLife-App' }
            });
            if (res.status === 200) {
                releaseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            }
        } else {
            const res = await fetch(url, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (res.ok) {
                releaseData = await res.json();
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
 * Tải file cập nhật và kích hoạt cài đặt trên từng nền tảng
 * @param {Object} releaseInfo Thông tin release nhận từ checkForUpdates
 * @param {Function} onProgress Callback cập nhật tiến trình { progress, downloadedMB, totalMB, speed }
 */
export async function downloadAndInstallUpdate(releaseInfo, onProgress) {
    const { platform, downloadUrl, latestVersion, asset } = releaseInfo;

    // 1. NỀN TẢNG iOS (Capacitor Swift Plugin -> Share Sheet / TrollStore)
    if (platform === 'ios') {
        const LiveActivityPlugin = window.Capacitor?.Plugins?.LiveActivityPlugin;
        if (LiveActivityPlugin && typeof LiveActivityPlugin.downloadAndOpenIPA === 'function') {
            let listener = null;
            if (onProgress && typeof LiveActivityPlugin.addListener === 'function') {
                listener = await LiveActivityPlugin.addListener('ipaDownloadProgress', (data) => {
                    onProgress(data);
                });
            }
            try {
                const res = await LiveActivityPlugin.downloadAndOpenIPA({ url: downloadUrl });
                return res;
            } finally {
                if (listener && typeof listener.remove === 'function') {
                    listener.remove();
                }
            }
        } else {
            // Fallback mở Safari tải trực tiếp
            window.open(downloadUrl, '_blank');
            return { success: true, fallback: true };
        }
    }

    // 2. NỀN TẢNG ANDROID (Capacitor Java Plugin -> Package Installer)
    if (platform === 'android') {
        const AppUpdatePlugin = window.Capacitor?.Plugins?.AppUpdatePlugin;
        if (AppUpdatePlugin && typeof AppUpdatePlugin.downloadAndInstallAPK === 'function') {
            let listener = null;
            if (onProgress && typeof AppUpdatePlugin.addListener === 'function') {
                listener = await AppUpdatePlugin.addListener('apkDownloadProgress', (data) => {
                    onProgress(data);
                });
            }
            try {
                const res = await AppUpdatePlugin.downloadAndInstallAPK({ url: downloadUrl });
                return res;
            } finally {
                if (listener && typeof listener.remove === 'function') {
                    listener.remove();
                }
            }
        } else {
            // Fallback tải qua trình duyệt di động
            window.open(downloadUrl, '_blank');
            return { success: true, fallback: true };
        }
    }

    // 3. NỀN TẢNG WINDOWS (Tauri MSI Installer)
    if (platform === 'windows') {
        if (!window.__TAURI__ || !window.__TAURI__.fs) {
            window.open(downloadUrl, '_blank');
            return { success: true, fallback: true };
        }

        const { writeBinaryFile } = window.__TAURI__.fs;
        const { tempDir } = window.__TAURI__.path;
        const { open } = window.__TAURI__.shell;

        const tempPath = await tempDir();
        const filename = asset?.name || `FamiLife_${latestVersion}_x64_vi-VN.msi`;
        const savePath = `${tempPath}${filename}`;

        // Tải file nhị phân kèm tính toán tiến trình và tốc độ tải
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Không thể tải tệp cập nhật: HTTP ${response.status}`);

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = response.body.getReader();
        let receivedBytes = 0;
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
            if (now - lastTime >= 300) {
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

        // Gom các chunk thành Uint8Array
        const allChunks = new Uint8Array(receivedBytes);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }

        // Ghi xuống file Temp
        await writeBinaryFile(savePath, allChunks);

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
        await open(savePath);

        // Tự động đóng ứng dụng sau 3 giây để cài đè an toàn
        setTimeout(() => {
            if (window.__TAURI__.process && window.__TAURI__.process.exit) {
                window.__TAURI__.process.exit(0);
            }
        }, 3000);

        return { success: true, path: savePath };
    }

    // 4. NỀN TẢNG WEB / PWA
    window.open(downloadUrl || releaseInfo.htmlUrl, '_blank');
    return { success: true, web: true };
}

/**
 * Hiển thị Modal Cập Nhật Trực Quan Hiện Đại
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
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.25s ease-out;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--bg-card, #1e293b);
            color: var(--text-primary, #f8fafc);
            border: 1px solid var(--border-color, rgba(255,255,255,0.1));
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
                padding: 20px 20px 16px;
                border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
                position: relative;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="
                        width: 44px;
                        height: 44px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
                        flex-shrink: 0;
                    ">
                        <i data-lucide="sparkles" style="color: #fff; width: 22px; height: 22px;"></i>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Bản Cập Nhật Mới!</h3>
                            <span style="font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: rgba(59, 130, 246, 0.2); color: #60a5fa;">${platformBadge}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary, #94a3b8); margin-top: 2px;">
                            v${currentVersion} &rarr; <strong style="color: #38bdf8;">v${latestVersion}</strong>
                            ${assetSizeMB ? ` &bull; Dung lượng: ~${assetSizeMB} MB` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Body: Changelog -->
            <div style="padding: 16px 20px; max-height: 220px; overflow-y: auto; font-size: 0.88rem; line-height: 1.5; color: var(--text-secondary, #cbd5e1);">
                <div style="font-weight: 600; color: var(--text-primary, #f8fafc); margin-bottom: 6px; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">
                    📝 Có gì mới trong bản này:
                </div>
                <div style="white-space: pre-line; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; font-size: 0.82rem; border: 1px solid rgba(255,255,255,0.05);">
                    ${escapeHtml(body)}
                </div>
            </div>

            <!-- Progress Section (Ẩn ban đầu, hiện khi bắt đầu tải) -->
            <div id="updateProgressContainer" style="display: none; padding: 0 20px 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 6px; color: var(--text-secondary, #94a3b8);">
                    <span id="updateProgressMB">Đang kết nối tải file...</span>
                    <span id="updateProgressSpeed" style="color: #38bdf8; font-weight: 600;">0 KB/s</span>
                </div>
                <div style="height: 8px; width: 100%; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden; position: relative;">
                    <div id="updateProgressBar" style="
                        height: 100%;
                        width: 0%;
                        background: linear-gradient(90deg, #3b82f6, #06b6d4, #10b981);
                        border-radius: 99px;
                        transition: width 0.2s ease-out;
                    "></div>
                </div>
                <div style="text-align: right; font-size: 0.72rem; color: var(--text-secondary, #94a3b8); margin-top: 4px;" id="updateProgressPercent">0%</div>
            </div>

            <!-- Actions Footer -->
            <div style="
                padding: 14px 20px;
                background: rgba(0,0,0,0.15);
                border-top: 1px solid var(--border-color, rgba(255,255,255,0.08));
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            ">
                <button id="btnDismissUpdate" style="
                    padding: 9px 16px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.15));
                    background: transparent;
                    color: var(--text-secondary, #cbd5e1);
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                ">Để sau</button>

                <button id="btnStartDownloadUpdate" style="
                    padding: 9px 20px;
                    border-radius: 10px;
                    border: none;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
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
                const percent = Math.round((data.progress || 0) * 100);
                progressBar.style.width = `${Math.min(percent, 100)}%`;
                progressPercent.textContent = `${percent}%`;
                
                if (data.downloadedMB && data.totalMB) {
                    progressMB.textContent = `Đã tải: ${data.downloadedMB} / ${data.totalMB} MB`;
                } else if (data.downloadedMB) {
                    progressMB.textContent = `Đã tải: ${data.downloadedMB} MB`;
                }

                if (data.speed) {
                    progressSpeed.textContent = data.speed;
                }
            });

            if (showToast) showToast('Đã tải hoàn tất! Đang khởi chạy bảng cài đặt...', 'success');
            setTimeout(() => {
                modal.remove();
            }, 1200);

        } catch (err) {
            console.error('[Updater] Download error:', err);
            if (showToast) showToast(`Lỗi cập nhật: ${err.message || err}`, 'error');
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
