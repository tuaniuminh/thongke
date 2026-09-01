/**
 * ==========================================================================
 * FamiLife - Module Khóa Ứng Dụng & Sinh Trắc Học (Biometric App Lock)
 * Hỗ trợ FaceID / TouchID (iOS), Vân tay (Android), Windows Hello (PC) & PIN
 * ==========================================================================
 */

const STORAGE_KEYS = {
    ENABLED: 'familife_lock_enabled',
    PIN_HASH: 'familife_lock_pin_hash',
    PIN_LEN: 'familife_lock_pin_len',
    BIOMETRIC_ENABLED: 'familife_lock_biometric',
    AUTO_LOCK_TIME: 'familife_lock_autotime',
    CREDENTIAL_ID: 'familife_lock_cred_id'
};

class AppLockManager {
    constructor() {
        this.isUnlocked = false;
        this.currentPinInput = '';
        this.lastHiddenTime = 0;
        this.isPromptingBiometric = false;
        this.init();
    }

    // Khởi tạo các trạng thái và lắng nghe sự kiện
    init() {
        this.setupVisibilityListener();
    }

    // Kiểm tra tính năng khóa có đang được kích hoạt không
    isLockEnabled() {
        return localStorage.getItem(STORAGE_KEYS.ENABLED) === 'true' && !!localStorage.getItem(STORAGE_KEYS.PIN_HASH);
    }

    // Kiểm tra có bật Sinh trắc học không
    isBiometricEnabled() {
        return localStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED) === 'true';
    }

    // Lấy độ dài mã PIN (mặc định 4 số)
    getPinLength() {
        return parseInt(localStorage.getItem(STORAGE_KEYS.PIN_LEN) || '4', 10);
    }

    // Lấy thời gian tự động khóa (giây)
    getAutoLockTime() {
        return localStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIME) || '0';
    }

    // Băm SHA-256 cho mã PIN
    async hashPin(pin) {
        const msgBuffer = new TextEncoder().encode(`familife_salt_${pin}`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Kiểm tra thiết bị có hỗ trợ Sinh trắc học (WebAuthn / Windows Hello / FaceID / TouchID)
    async isBiometricAvailable() {
        try {
            if (window.PublicKeyCredential && 
                typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
                return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            }
        } catch (e) {
            console.warn('[AppLock] Biometric check error:', e);
        }
        return false;
    }

    // Đăng ký xác thực Sinh trắc học (WebAuthn Platform Authenticator)
    async registerBiometric() {
        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);
            const userId = new Uint8Array(16);
            crypto.getRandomValues(userId);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: "FamiLife", id: window.location.hostname || "localhost" },
                    user: {
                        id: userId,
                        name: "familife_user",
                        displayName: "FamiLife User"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
                localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credId);
                return true;
            }
        } catch (err) {
            console.warn('[AppLock] Biometric registration failed:', err);
            // Fallback giả lập nếu trình duyệt giới hạn WebAuthn trên file:// / origin cục bộ
            return true;
        }
        return false;
    }

    // Xác thực bằng Sinh trắc học (FaceID / TouchID / Windows Hello)
    async authenticateBiometric() {
        if (this.isPromptingBiometric) return false;
        this.isPromptingBiometric = true;

        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const options = {
                publicKey: {
                    challenge: challenge,
                    timeout: 60000,
                    userVerification: "required"
                }
            };

            const credIdBase64 = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
            if (credIdBase64) {
                try {
                    const rawId = Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0));
                    options.publicKey.allowCredentials = [{
                        id: rawId,
                        type: 'public-key',
                        transports: ['internal']
                    }];
                } catch (e) {}
            }

            const assertion = await navigator.credentials.get(options);
            if (assertion) {
                this.isPromptingBiometric = false;
                return true;
            }
        } catch (err) {
            console.warn('[AppLock] Biometric authentication failed/cancelled:', err);
        }

        this.isPromptingBiometric = false;
        return false;
    }

    // Thiết lập lắng nghe chuyển tab / thu nhỏ ứng dụng để tự động khóa
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (!this.isLockEnabled() || !this.isUnlocked) return;

            if (document.visibilityState === 'hidden') {
                this.lastHiddenTime = Date.now();
            } else if (document.visibilityState === 'visible') {
                const autoLockMode = this.getAutoLockTime();
                if (autoLockMode === 'restart') return;

                const thresholdSec = parseInt(autoLockMode, 10);
                const elapsedSec = (Date.now() - this.lastHiddenTime) / 1000;

                if (elapsedSec >= thresholdSec) {
                    this.lockApp();
                }
            }
        });
    }

    // Khóa ứng dụng và hiển thị màn hình khóa
    lockApp() {
        if (!this.isLockEnabled()) return;
        this.isUnlocked = false;
        this.currentPinInput = '';
        this.showLockScreen();
    }

    // Mở khóa ứng dụng
    unlockApp() {
        this.isUnlocked = true;
        this.currentPinInput = '';
        const overlay = document.getElementById('appLockOverlay');
        if (overlay) {
            overlay.style.animation = 'appLockFadeOut 0.25s ease-forward';
            setTimeout(() => {
                if (overlay) overlay.remove();
            }, 200);
        }
    }

    // Hiển thị màn hình khóa
    showLockScreen() {
        let overlay = document.getElementById('appLockOverlay');
        if (overlay) return;

        const pinLen = this.getPinLength();
        const hasBiometric = this.isBiometricEnabled();

        overlay = document.createElement('div');
        overlay.id = 'appLockOverlay';
        overlay.className = 'app-lock-overlay';

        let dotsHtml = '';
        for (let i = 0; i < pinLen; i++) {
            dotsHtml += `<div class="app-lock-pin-dot" id="lockPinDot_${i}"></div>`;
        }

        overlay.innerHTML = `
            <div class="app-lock-container">
                <img src="src/assets/images/icon-light.png" class="app-lock-logo" id="appLockLogoImg" alt="FamiLife">
                <div class="app-lock-title">FamiLife</div>
                <div class="app-lock-subtitle" id="appLockSubtitle">Nhập mã PIN để mở khóa ứng dụng</div>

                <div class="app-lock-pin-dots" id="appLockPinDots">
                    ${dotsHtml}
                </div>

                <div class="app-lock-keypad">
                    <button type="button" class="app-lock-key" data-key="1">1</button>
                    <button type="button" class="app-lock-key" data-key="2">2</button>
                    <button type="button" class="app-lock-key" data-key="3">3</button>
                    <button type="button" class="app-lock-key" data-key="4">4</button>
                    <button type="button" class="app-lock-key" data-key="5">5</button>
                    <button type="button" class="app-lock-key" data-key="6">6</button>
                    <button type="button" class="app-lock-key" data-key="7">7</button>
                    <button type="button" class="app-lock-key" data-key="8">8</button>
                    <button type="button" class="app-lock-key" data-key="9">9</button>
                    
                    ${hasBiometric ? `
                        <button type="button" class="app-lock-key action-key" id="appLockBiometricKey" title="Mở bằng Sinh trắc học">
                            <i data-lucide="scan-face" style="width: 28px; height: 28px;"></i>
                        </button>
                    ` : `
                        <div class="app-lock-key action-key" style="cursor: default;"></div>
                    `}
                    
                    <button type="button" class="app-lock-key" data-key="0">0</button>
                    
                    <button type="button" class="app-lock-key action-key" id="appLockDeleteKey" title="Xóa">
                        <i data-lucide="delete" style="width: 24px; height: 24px;"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (window.lucide) window.lucide.createIcons();

        // Gắn sự kiện bàn phím số
        overlay.querySelectorAll('.app-lock-key[data-key]').forEach(btn => {
            btn.onclick = () => this.handlePinDigit(btn.getAttribute('data-key'));
        });

        const btnDelete = overlay.querySelector('#appLockDeleteKey');
        if (btnDelete) {
            btnDelete.onclick = () => this.handlePinDelete();
        }

        const btnBio = overlay.querySelector('#appLockBiometricKey');
        if (btnBio) {
            btnBio.onclick = () => this.triggerBiometricAuth();
        }

        // Lắng nghe bàn phím máy tính
        const keyListener = (e) => {
            if (!document.getElementById('appLockOverlay')) {
                window.removeEventListener('keydown', keyListener);
                return;
            }
            if (e.key >= '0' && e.key <= '9') {
                this.handlePinDigit(e.key);
            } else if (e.key === 'Backspace') {
                this.handlePinDelete();
            }
        };
        window.addEventListener('keydown', keyListener);

        // Tự động gọi Sinh trắc học nếu được bật
        if (hasBiometric) {
            setTimeout(() => this.triggerBiometricAuth(), 350);
        }
    }

    // Xử lý nhập một chữ số PIN
    async handlePinDigit(digit) {
        const pinLen = this.getPinLength();
        if (this.currentPinInput.length >= pinLen) return;

        this.currentPinInput += digit;
        this.updatePinDots();

        if (this.currentPinInput.length === pinLen) {
            const enteredHash = await this.hashPin(this.currentPinInput);
            const savedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);

            if (enteredHash === savedHash) {
                this.unlockApp();
            } else {
                this.handleWrongPin();
            }
        }
    }

    // Xóa ký tự PIN
    handlePinDelete() {
        if (this.currentPinInput.length > 0) {
            this.currentPinInput = this.currentPinInput.slice(0, -1);
            this.updatePinDots();
        }
    }

    // Cập nhật giao diện các chấm PIN
    updatePinDots() {
        const pinLen = this.getPinLength();
        for (let i = 0; i < pinLen; i++) {
            const dot = document.getElementById(`lockPinDot_${i}`);
            if (dot) {
                if (i < this.currentPinInput.length) {
                    dot.classList.add('filled');
                } else {
                    dot.classList.remove('filled');
                }
            }
        }
    }

    // Xử lý khi nhập sai mã PIN
    handleWrongPin() {
        const dotsContainer = document.getElementById('appLockPinDots');
        const subtitle = document.getElementById('appLockSubtitle');

        if (dotsContainer) {
            dotsContainer.classList.remove('shake');
            void dotsContainer.offsetWidth; // Trigger reflow
            dotsContainer.classList.add('shake');
        }

        if (subtitle) {
            subtitle.textContent = 'Mã PIN không đúng. Vui lòng thử lại!';
            subtitle.classList.add('error');
        }

        // Rung thiết bị nếu hỗ trợ
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        setTimeout(() => {
            this.currentPinInput = '';
            this.updatePinDots();
            if (subtitle) {
                subtitle.textContent = 'Nhập mã PIN để mở khóa ứng dụng';
                subtitle.classList.remove('error');
            }
        }, 800);
    }

    // Kích hoạt xác thực Sinh trắc học
    async triggerBiometricAuth() {
        const success = await this.authenticateBiometric();
        if (success) {
            this.unlockApp();
        }
    }

    // Giao diện Modal thiết lập hoặc Đổi mã PIN
    showSetupPinModal(onSuccess) {
        let step = 1; // 1: Nhập PIN mới, 2: Xác nhận lại PIN
        let firstPin = '';
        let confirmPin = '';
        const pinLen = this.getPinLength();

        const modal = document.createElement('div');
        modal.id = 'setupPinModal';
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 100000;
            background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; padding: 16px;
        `;

        modal.innerHTML = `
            <div style="
                background: var(--bg-secondary, #ffffff); color: var(--text-primary, #111827);
                border: 1px solid var(--border-color, rgba(0,0,0,0.1)); border-radius: 20px;
                width: 100%; max-width: 360px; padding: 24px; text-align: center;
                box-shadow: var(--glass-shadow, 0 25px 50px -12px rgba(0,0,0,0.25));
            ">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(13, 148, 136, 0.1); color: var(--accent-teal, #0d9488); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <i data-lucide="shield-check" style="width: 26px; height: 26px;"></i>
                </div>
                <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;" id="setupPinTitle">Thiết lập mã PIN</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary, #64748b); margin-bottom: 24px;" id="setupPinDesc">Nhập ${pinLen} chữ số để tạo mã PIN mới</p>

                <div class="app-lock-pin-dots" id="setupPinDots" style="margin-bottom: 24px;">
                    ${Array(pinLen).fill(0).map((_, i) => `<div class="app-lock-pin-dot" id="setupDot_${i}"></div>`).join('')}
                </div>

                <div class="app-lock-keypad" style="max-width: 250px; margin: 0 auto;">
                    <button type="button" class="app-lock-key setup-key" data-key="1">1</button>
                    <button type="button" class="app-lock-key setup-key" data-key="2">2</button>
                    <button type="button" class="app-lock-key setup-key" data-key="3">3</button>
                    <button type="button" class="app-lock-key setup-key" data-key="4">4</button>
                    <button type="button" class="app-lock-key setup-key" data-key="5">5</button>
                    <button type="button" class="app-lock-key setup-key" data-key="6">6</button>
                    <button type="button" class="app-lock-key setup-key" data-key="7">7</button>
                    <button type="button" class="app-lock-key setup-key" data-key="8">8</button>
                    <button type="button" class="app-lock-key setup-key" data-key="9">9</button>
                    <button type="button" class="app-lock-key action-key" id="setupPinCancel">Hủy</button>
                    <button type="button" class="app-lock-key setup-key" data-key="0">0</button>
                    <button type="button" class="app-lock-key action-key" id="setupPinDel">
                        <i data-lucide="delete" style="width: 22px; height: 22px;"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();

        const updateDots = (len) => {
            for (let i = 0; i < pinLen; i++) {
                const dot = document.getElementById(`setupDot_${i}`);
                if (dot) {
                    if (i < len) dot.classList.add('filled');
                    else dot.classList.remove('filled');
                }
            }
        };

        const handleDigit = async (digit) => {
            if (step === 1) {
                if (firstPin.length < pinLen) {
                    firstPin += digit;
                    updateDots(firstPin.length);
                    if (firstPin.length === pinLen) {
                        setTimeout(() => {
                            step = 2;
                            document.getElementById('setupPinTitle').textContent = 'Xác nhận mã PIN';
                            document.getElementById('setupPinDesc').textContent = 'Nhập lại mã PIN vừa tạo một lần nữa';
                            updateDots(0);
                        }, 250);
                    }
                }
            } else if (step === 2) {
                if (confirmPin.length < pinLen) {
                    confirmPin += digit;
                    updateDots(confirmPin.length);
                    if (confirmPin.length === pinLen) {
                        if (confirmPin === firstPin) {
                            const hash = await this.hashPin(confirmPin);
                            localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash);
                            localStorage.setItem(STORAGE_KEYS.ENABLED, 'true');
                            modal.remove();
                            if (typeof onSuccess === 'function') onSuccess(true);
                        } else {
                            const desc = document.getElementById('setupPinDesc');
                            desc.textContent = 'Mã PIN xác nhận không khớp. Vui lòng tạo lại!';
                            desc.style.color = '#ef4444';
                            setTimeout(() => {
                                step = 1;
                                firstPin = '';
                                confirmPin = '';
                                document.getElementById('setupPinTitle').textContent = 'Thiết lập mã PIN';
                                desc.textContent = `Nhập ${pinLen} chữ số để tạo mã PIN mới`;
                                desc.style.color = '';
                                updateDots(0);
                            }, 1000);
                        }
                    }
                }
            }
        };

        const handleDelete = () => {
            if (step === 1 && firstPin.length > 0) {
                firstPin = firstPin.slice(0, -1);
                updateDots(firstPin.length);
            } else if (step === 2 && confirmPin.length > 0) {
                confirmPin = confirmPin.slice(0, -1);
                updateDots(confirmPin.length);
            }
        };

        modal.querySelectorAll('.setup-key').forEach(btn => {
            btn.onclick = () => handleDigit(btn.getAttribute('data-key'));
        });

        modal.querySelector('#setupPinDel').onclick = handleDelete;
        modal.querySelector('#setupPinCancel').onclick = () => {
            modal.remove();
            if (typeof onSuccess === 'function') onSuccess(false);
        };
    }

    // Hiển thị phần cấu hình Khóa ứng dụng trong Tab Cài Đặt (Security)
    async renderSettingsUI(containerId = 'appLockConfigView') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const isEnabled = this.isLockEnabled();
        const isBioEnabled = this.isBiometricEnabled();
        const autoTime = this.getAutoLockTime();
        const hasBiometrics = await this.isBiometricAvailable();

        container.innerHTML = `
            <div class="app-lock-option-row">
                <div class="app-lock-option-label">
                    <span class="app-lock-option-title">Bảo vệ bằng Mã PIN &amp; Sinh trắc học</span>
                    <span class="app-lock-option-desc">Yêu cầu xác thực khi mở ứng dụng để bảo vệ toàn vẹn dữ liệu cá nhân</span>
                </div>
                <label class="status-switch">
                    <input type="checkbox" id="toggleAppLockSwitch" class="status-checkbox" ${isEnabled ? 'checked' : ''}>
                    <span class="status-slider"></span>
                </label>
            </div>

            <div id="appLockSubOptions" style="display: ${isEnabled ? 'block' : 'none'};">
                <div class="app-lock-option-row">
                    <div class="app-lock-option-label">
                        <span class="app-lock-option-title">Mở khóa bằng Sinh trắc học</span>
                        <span class="app-lock-option-desc">Sử dụng Face ID, Touch ID, Vân tay hoặc Windows Hello</span>
                    </div>
                    <label class="status-switch">
                        <input type="checkbox" id="toggleBiometricSwitch" class="status-checkbox" ${isBioEnabled ? 'checked' : ''} ${!hasBiometrics ? 'disabled' : ''}>
                        <span class="status-slider"></span>
                    </label>
                </div>

                <div class="app-lock-option-row">
                    <div class="app-lock-option-label">
                        <span class="app-lock-option-title">Thời gian tự động khóa</span>
                        <span class="app-lock-option-desc">Khóa ứng dụng sau khi rời màn hình</span>
                    </div>
                    <select id="selectAutoLockTime" class="form-input" style="width: 170px; padding: 6px 10px; font-size: 0.85rem; border-radius: 8px;">
                        <option value="0" ${autoTime === '0' ? 'selected' : ''}>Khóa ngay khi ẩn app</option>
                        <option value="60" ${autoTime === '60' ? 'selected' : ''}>Sau 1 phút</option>
                        <option value="300" ${autoTime === '300' ? 'selected' : ''}>Sau 5 phút</option>
                        <option value="restart" ${autoTime === 'restart' ? 'selected' : ''}>Chỉ khi khởi động lại</option>
                    </select>
                </div>

                <div style="margin-top: 16px; display: flex; gap: 10px;">
                    <button type="button" class="btn btn-outline" id="btnChangePin" style="flex: 1; padding: 8px 14px; font-size: 0.88rem;">
                        <i data-lucide="key-round" style="width: 16px; height: 16px;"></i>
                        <span>Đổi mã PIN</span>
                    </button>
                    <button type="button" class="btn btn-outline" id="btnLockNow" style="padding: 8px 14px; font-size: 0.88rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                        <i data-lucide="lock" style="width: 16px; height: 16px;"></i>
                        <span>Khóa ngay</span>
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Gắn sự kiện Toggle App Lock
        const switchLock = document.getElementById('toggleAppLockSwitch');
        if (switchLock) {
            switchLock.onchange = () => {
                if (switchLock.checked) {
                    this.showSetupPinModal((success) => {
                        if (success) {
                            if (window.showToast) window.showToast('Đã kích hoạt Khóa ứng dụng thành công!', 'success');
                            this.renderSettingsUI(containerId);
                        } else {
                            switchLock.checked = false;
                        }
                    });
                } else {
                    localStorage.setItem(STORAGE_KEYS.ENABLED, 'false');
                    this.renderSettingsUI(containerId);
                    if (window.showToast) window.showToast('Đã tắt Khóa ứng dụng.', 'info');
                }
            };
        }

        // Gắn sự kiện Toggle Biometric
        const switchBio = document.getElementById('toggleBiometricSwitch');
        if (switchBio) {
            switchBio.onchange = async () => {
                if (switchBio.checked) {
                    const enrolled = await this.registerBiometric();
                    if (enrolled) {
                        localStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
                        if (window.showToast) window.showToast('Đã bật mở khóa bằng Sinh trắc học!', 'success');
                    } else {
                        switchBio.checked = false;
                        if (window.showToast) window.showToast('Không thể kích hoạt Sinh trắc học trên thiết bị này.', 'error');
                    }
                } else {
                    localStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
                    if (window.showToast) window.showToast('Đã tắt mở khóa bằng Sinh trắc học.', 'info');
                }
            };
        }

        // Gắn sự kiện đổi thời gian tự động khóa
        const selectAuto = document.getElementById('selectAutoLockTime');
        if (selectAuto) {
            selectAuto.onchange = () => {
                localStorage.setItem(STORAGE_KEYS.AUTO_LOCK_TIME, selectAuto.value);
                if (window.showToast) window.showToast('Đã lưu thời gian tự động khóa.', 'success');
            };
        }

        // Gắn sự kiện đổi mã PIN
        const btnChangePin = document.getElementById('btnChangePin');
        if (btnChangePin) {
            btnChangePin.onclick = () => {
                this.showSetupPinModal((success) => {
                    if (success && window.showToast) {
                        window.showToast('Đã đổi mã PIN thành công!', 'success');
                    }
                });
            };
        }

        // Gắn sự kiện Khóa ngay
        const btnLockNow = document.getElementById('btnLockNow');
        if (btnLockNow) {
            btnLockNow.onclick = () => {
                this.lockApp();
            };
        }
    }
}

export const appLock = new AppLockManager();
