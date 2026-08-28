// src/features/ket-noi-gia-dinh/ket-noi.js - Family Connection Module
import { 
    state, saveLocalState, showToast, performSync,
    escapeHTML, decryptWithPrivateKey
} from '../../core/app.js?v=4.3.222';
import { encrypt, decrypt } from '../../core/crypto.js?v=4.3.222';
import * as sync from '../../core/sync.js?v=4.3.222';

let _pairingInterval = null;
let _pairingRealtimeChannel = null;
let _isCheckingSharedFund = false;
let _lastCheckSharedFundTime = 0;

// --- CORE LOGIC: CHECK FOR SHARED FAMILY FUND (CASE A, B, C, D, E) ---
export async function checkForSharedFamilyFund(force = false) {
    const now = Date.now();
    if (_isCheckingSharedFund || (!force && now - _lastCheckSharedFundTime < 3000)) {
        return;
    }

    const supabaseClient = sync.getSupabase();
    if (!state.user || !supabaseClient) {
        return;
    }

    // [BUG DETECTOR FIX] Nếu đang trong quá trình hủy liên kết, bỏ qua hoàn toàn
    // để tránh interval này ghi đè lại spouseStatus = 'accepted' song song
    if (window._isUnlinking || localStorage.getItem('fami_is_unlinking') === 'true') {
        console.log('[BUG DETECTOR] checkForSharedFamilyFund: Skipping due to active unlink process.');
        return;
    }

    _isCheckingSharedFund = true;
    _lastCheckSharedFundTime = now;

    try {
        console.log("[E2EE Debug] Starting checkForSharedFamilyFund for user:", state.user.email);
        const { data, error } = await supabaseClient
            .from('gift_sync')
            .select('user_id, encrypted_data, updated_at, user_email');

        if (error) {
            console.error("[E2EE Debug] Supabase error fetching gift_sync:", error);
            return;
        }
        if (!data) {
            console.warn("[E2EE Debug] No data returned from gift_sync select");
            return;
        }

        console.log("[E2EE Debug] Fetched rows count:", data.length);
        const myEmail = state.user.email.toLowerCase().trim();
        let husbandRowFound = false;

        for (const row of data) {
            if (row.user_id === state.user.id) {
                console.log("[E2EE Debug] Skipping own row:", row.user_email || row.user_id);
                continue; // Skip own data
            }

            let rowProcessed = false;

            const rowEmail = (row.user_email || '').toLowerCase().trim();

            // SỰ KIỆN HỦY LIÊN KẾT: Nếu đối phương đã chọn hủy liên kết hoặc không còn kết nối với mình
            if (state.spouseEmail && rowEmail === state.spouseEmail.toLowerCase().trim()) {
                husbandRowFound = true;
                try {
                    const parsed = JSON.parse(row.encrypted_data);
                    if (parsed) {
                        const remoteSpouseStatus = parsed.spouse_status || '';
                        const remoteSpouseEmail = (parsed.spouse_email || '').toLowerCase().trim();
                        // Phát hiện hủy kết nối nếu:
                        // 1. remoteSpouseStatus === 'left' (đối phương chủ động bấm hủy)
                        // 2. remoteSpouseEmail trỏ tới email khác mình (đối phương đã ghép đôi với người khác)
                        if (remoteSpouseStatus === 'left' || 
                            (remoteSpouseEmail && remoteSpouseEmail !== myEmail)) {
                            console.log("[E2EE Debug] Spouse has left or cleared connection. Performing auto-unlink locally and updating cloud.");
                            
                            const hadSpouse = !!state.spouseEmail;
                            
                            state.spouseEmail = '';
                            state.spouseStatus = '';
                            state.spouseRole = 'wife';
                            state.pairingCode = '';
                            state.pairingCodeExpired = '';
                            state.pairingFundKeyEncrypted = '';
                            state.pairingCodeAccepted = '';
                            state.familyFundInviteStatus = '';
                            state.viewingSharedFund = false;
                            state.sharedFundOwnerEmail = '';
                            state.sharedFundSourceRow = null;
                            
                            await saveLocalState();
                            
                            if (hadSpouse) {
                                showToast("Đối tác đã hủy kết nối gia đình.", "warning");
                            }
                            
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                            if (typeof window.renderWeLoveDashboard === 'function') {
                                window.renderWeLoveDashboard();
                            }
                            if (typeof window.renderFamilyPairingSettings === 'function') {
                                window.renderFamilyPairingSettings();
                            }
                            
                            if (typeof performSync === 'function') {
                                await performSync(true);
                            }
                            
                            continue;
                        }
                    }
                } catch (e) {
                    console.error("[E2EE Debug] Error in auto-unlink detection:", e);
                }
            }

            // CASE C: Kiểm tra xem đây có phải là dòng của spouse (người được mình mời kết nối) để tự động chia sẻ khóa đối xứng
            if (!state.viewingSharedFund && state.spouseEmail && rowEmail === state.spouseEmail.toLowerCase().trim()) {
                try {
                    const parsed = JSON.parse(row.encrypted_data);
                    if (parsed) {
                        let spousePubKey = parsed.asymmetricPublicKey || '';
                        
                        // Nếu vợ đã cập nhật trạng thái chấp nhận kết nối
                        const remoteSpouseStatus = parsed.spouse_status || '';
                        if (remoteSpouseStatus === 'accepted' && state.spouseStatus !== 'accepted') {
                            state.spouseStatus = 'accepted';
                            state.spouseStatusUpdated = new Date().toISOString();
                            await saveLocalState();
                            console.log("[E2EE Debug] Spouse accepted invitation. Updating spouseStatus to accepted.");
                        }
                        
                        // Kiểm tra xem ta đã mã hóa fundSymmetricKey cho vợ chưa
                        const myHybridRow = data.find(r => r.user_id === state.user.id);
                        let needsSyncForSpouse = false;
                        if (myHybridRow) {
                            try {
                                const myParsed = JSON.parse(myHybridRow.encrypted_data);
                                const spouseEmailKey = state.spouseEmail.toLowerCase().trim();
                                if (myParsed && myParsed.fund_shared_keys) {
                                    const hasKeyForSpouse = !!myParsed.fund_shared_keys[spouseEmailKey];
                                    const spousePubKeyChanged = spousePubKey && spousePubKey !== state.spousePublicKey;
                                    if ((!hasKeyForSpouse || spousePubKeyChanged) && spousePubKey) {
                                        needsSyncForSpouse = true;
                                        state.spousePublicKey = spousePubKey;
                                        await saveLocalState();
                                        console.log("[E2EE Debug] Spouse public key changed or key missing. Triggering performSync.");
                                    }
                                }
                            } catch (e) {}
                        }
                        
                        // Giải mã Quỹ chung từ dòng của Spouse và gộp LWW vào cục bộ
                        if (state.fundSymmetricKey && parsed.encrypted_fund) {
                            try {
                                const decryptedFund = await decrypt(parsed.encrypted_fund, state.fundSymmetricKey);
                                const fundData = JSON.parse(decryptedFund);
                                
                                // Gộp familyFunds
                                const localFundTime = state.familyFundsUpdated ? new Date(state.familyFundsUpdated).getTime() : 0;
                                const remoteFundTime = fundData.familyFundsUpdated ? new Date(fundData.familyFundsUpdated).getTime() : 0;
                                if (remoteFundTime > localFundTime) {
                                    state.familyFunds = fundData.familyFunds || [];
                                    state.familyFundsUpdated = fundData.familyFundsUpdated || '';
                                }

                                // Union Merge fundTransactions (chống mất dữ liệu của cả 2 phía & hỗ trợ soft-delete)
                                const remoteTxs = fundData.fundTransactions || [];
                                const localTxs = state.fundTransactions || [];
                                const txMap = new Map();
                                localTxs.forEach(t => txMap.set(t.id, t));
                                remoteTxs.forEach(t => {
                                    const existing = txMap.get(t.id);
                                    if (!existing) {
                                        txMap.set(t.id, t);
                                    } else {
                                        const localDelTime = existing.deleted_at ? new Date(existing.deleted_at).getTime() : 0;
                                        const remoteDelTime = t.deleted_at ? new Date(t.deleted_at).getTime() : 0;
                                        if (localDelTime > 0 || remoteDelTime > 0) {
                                            if (remoteDelTime >= localDelTime) txMap.set(t.id, t);
                                        } else {
                                            const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
                                            const remoteTime = t.updated_at ? new Date(t.updated_at).getTime() : 0;
                                            if (remoteTime >= localTime) txMap.set(t.id, t);
                                        }
                                    }
                                });
                                const mergedTxs = Array.from(txMap.values());
                                state.fundTransactions = mergedTxs;
                                const newTxTimestamp = remoteTxs.length > 0 ? (fundData.fundTransactionsUpdated || new Date().toISOString()) : (state.fundTransactionsUpdated || '');
                                if (!state.fundTransactionsUpdated || new Date(newTxTimestamp).getTime() > new Date(state.fundTransactionsUpdated).getTime()) {
                                    state.fundTransactionsUpdated = newTxTimestamp;
                                }

                                // Gộp WeLove Start Date
                                const localStartDateTime = state.weLoveStartDateUpdated ? new Date(state.weLoveStartDateUpdated).getTime() : 0;
                                const remoteStartDateTime = fundData.weLoveStartDateUpdated ? new Date(fundData.weLoveStartDateUpdated).getTime() : 0;
                                if (remoteStartDateTime > localStartDateTime) {
                                    state.weLoveStartDate = fundData.weLoveStartDate || '';
                                    state.weLoveStartDateUpdated = fundData.weLoveStartDateUpdated || '';
                                }

                                // Gộp WeLove Name1
                                const localName1Time = state.weLoveName1Updated ? new Date(state.weLoveName1Updated).getTime() : 0;
                                const remoteName1Time = fundData.weLoveName1Updated ? new Date(fundData.weLoveName1Updated).getTime() : 0;
                                if (remoteName1Time > localName1Time) {
                                    state.weLoveName1 = fundData.weLoveName1 || '';
                                    state.weLoveName1Updated = fundData.weLoveName1Updated || '';
                                }

                                // Gộp WeLove Name2
                                const localName2Time = state.weLoveName2Updated ? new Date(state.weLoveName2Updated).getTime() : 0;
                                const remoteName2Time = fundData.weLoveName2Updated ? new Date(fundData.weLoveName2Updated).getTime() : 0;
                                if (remoteName2Time > localName2Time) {
                                    state.weLoveName2 = fundData.weLoveName2 || '';
                                    state.weLoveName2Updated = fundData.weLoveName2Updated || '';
                                }

                                // Gộp WeLove Show Sickness
                                const localShowSick = state.weLoveShowSicknessUpdated ? new Date(state.weLoveShowSicknessUpdated).getTime() : 0;
                                const remoteShowSick = fundData.weLoveShowSicknessUpdated ? new Date(fundData.weLoveShowSicknessUpdated).getTime() : 0;
                                if (remoteShowSick > localShowSick) {
                                    state.weLoveShowSickness = fundData.weLoveShowSickness !== false;
                                    state.weLoveShowSicknessUpdated = fundData.weLoveShowSicknessUpdated || '';
                                }

                                // Gộp WeLove Sickness Logs
                                const localSickLogs = state.weLoveSicknessLogsUpdated ? new Date(state.weLoveSicknessLogsUpdated).getTime() : 0;
                                const remoteSickLogs = fundData.weLoveSicknessLogsUpdated ? new Date(fundData.weLoveSicknessLogsUpdated).getTime() : 0;
                                if (remoteSickLogs > localSickLogs) {
                                    state.weLoveSicknessLogs = fundData.weLoveSicknessLogs || [];
                                    state.weLoveSicknessLogsUpdated = fundData.weLoveSicknessLogsUpdated || '';
                                }

                                // Gộp WeLove Reminders
                                const localRem = state.weLoveRemindersUpdated ? new Date(state.weLoveRemindersUpdated).getTime() : 0;
                                const remoteRem = fundData.weLoveRemindersUpdated ? new Date(fundData.weLoveRemindersUpdated).getTime() : 0;
                                if (remoteRem > localRem) {
                                    state.weLoveReminders = fundData.weLoveReminders || [];
                                    state.weLoveRemindersUpdated = fundData.weLoveRemindersUpdated || '';
                                }

                                // Gộp WeLove Autoplay
                                const localAuto = state.weLoveAutoplayUpdated ? new Date(state.weLoveAutoplayUpdated).getTime() : 0;
                                const remoteAuto = fundData.weLoveAutoplayUpdated ? new Date(fundData.weLoveAutoplayUpdated).getTime() : 0;
                                if (remoteAuto > localAuto) {
                                    state.weLoveAutoplay = fundData.weLoveAutoplay === true;
                                    state.weLoveAutoplayUpdated = fundData.weLoveAutoplayUpdated || '';
                                }

                                // Gộp WeLove Visit Logs
                                const localVisits = state.weLoveVisitLogsUpdated ? new Date(state.weLoveVisitLogsUpdated).getTime() : 0;
                                const remoteVisits = fundData.weLoveVisitLogsUpdated ? new Date(fundData.weLoveVisitLogsUpdated).getTime() : 0;
                                if (remoteVisits > localVisits) {
                                    state.weLoveVisitLogs = fundData.weLoveVisitLogs || [];
                                    state.weLoveVisitLogsUpdated = fundData.weLoveVisitLogsUpdated || '';
                                }

                                // Gộp WeLove Photo Album
                                const localPhotoAlbum = state.weLovePhotoAlbumUpdated ? new Date(state.weLovePhotoAlbumUpdated).getTime() : 0;
                                const remotePhotoAlbum = fundData.weLovePhotoAlbumUpdated ? new Date(fundData.weLovePhotoAlbumUpdated).getTime() : 0;
                                if (remotePhotoAlbum > localPhotoAlbum) {
                                    state.weLovePhotoAlbum = fundData.weLovePhotoAlbum || [];
                                    state.weLovePhotoAlbumUpdated = fundData.weLovePhotoAlbumUpdated || '';
                                }

                                await saveLocalState();
                            } catch (decFundErr) {
                                console.error("[E2EE Debug] Admin failed to decrypt Spouse's fund:", decFundErr);
                            }
                        }

                        if (needsSyncForSpouse) {
                            setTimeout(() => {
                                if (typeof performSync === 'function') {
                                    performSync(true);
                                }
                            }, 500);
                        }
                        rowProcessed = true;
                    }
                } catch (e) {
                    console.error("[E2EE Debug] Error checking spouse row:", e);
                }
            }

            // CASE D: Đối với người tạo mã ghép đôi (Admin), tự động nhận diện khi đối tác đã nhập mã và chấp nhận kết nối
            const isPairingActive = state.pairingCode && state.pairingCodeExpired && (new Date(state.pairingCodeExpired).getTime() > Date.now());
            if (!state.spouseEmail && !rowProcessed && isPairingActive) {
                try {
                    const parsed = JSON.parse(row.encrypted_data);
                    if (parsed && parsed.is_hybrid && parsed.spouse_email) {
                        const remoteSpouseEmail = parsed.spouse_email.toLowerCase().trim();
                        const remoteSpouseStatus = parsed.spouse_status || '';
                        
                        if (remoteSpouseEmail === myEmail && remoteSpouseStatus === 'accepted') {
                            // Kiểm tra mã ghép đôi đối tác đã nhập để tránh nhận nhầm các kết nối cũ (như của vợ cũ)
                            const partnerCodeAccepted = (parsed.pairing_code_accepted || '').trim().toUpperCase();
                            const myActiveCode = (state.pairingCode || '').trim().toUpperCase();
                            
                            let isMatch = false;
                            if (partnerCodeAccepted && myActiveCode) {
                                isMatch = (partnerCodeAccepted === myActiveCode);
                            } else {
                                // Fallback: Nếu đối phương dùng app phiên bản cũ chưa gửi kèm mã, dùng mốc thời gian để lọc
                                const pairingCodeGeneratedAt = new Date(state.pairingCodeExpired).getTime() - 10 * 60 * 1000;
                                const rowUpdatedAt = new Date(row.updated_at).getTime();
                                isMatch = (rowUpdatedAt >= pairingCodeGeneratedAt);
                            }
                            
                            if (isMatch) {
                                const spouseEmailVal = (row.user_email || '').toLowerCase().trim();
                                console.log("[E2EE Debug] Detected partner accepted pairing. Connecting to:", spouseEmailVal);
                                
                                state.spouseEmail = spouseEmailVal;
                                state.spouseStatus = 'accepted';
                                state.spouseRole = 'husband'; // Current user is Husband (Admin)
                                state.familyFundInviteStatus = 'accepted';
                                state.spouseStatusUpdated = new Date().toISOString();
                                husbandRowFound = true;
                                
                                // [BẢO MẬT v4.3.117] Ngay khi ghép đôi thành công, dọn sạch mã ghép đôi 6 số
                                // để triệt tiêu thời gian tồn tại của mã trên đám mây Supabase (chống brute-force)
                                state.pairingCode = '';
                                state.pairingCodeExpired = '';
                                state.pairingFundKeyEncrypted = '';
                                
                                await saveLocalState();
                                
                                // Thực hiện đồng bộ ngầm để chia sẻ khóa đối xứng và dữ liệu WeLove chung
                                setTimeout(() => {
                                    if (typeof performSync === 'function') {
                                        performSync(true);
                                    }
                                }, 500);
                                
                                if (typeof window.updateHomeLayoutUI === 'function') {
                                    window.updateHomeLayoutUI();
                                }
                                if (typeof window.renderWeLoveDashboard === 'function') {
                                    window.renderWeLoveDashboard();
                                }
                                rowProcessed = true;
                            } else {
                                console.log("[E2EE Debug] Skipping old/unmatched pairing row for:", row.user_email);
                            }
                        }
                    }
                } catch (e) {
                    if (!(e instanceof SyntaxError)) {
                        console.error("[E2EE Debug] Error in CASE D pairing detection:", e);
                    }
                }
            }

            if (rowProcessed) {
                continue;
            }

            try {
                const parsed = JSON.parse(row.encrypted_data);
                
                if (parsed && parsed.is_hybrid) {
                    const isSharedOwner = state.sharedFundSourceRow && row.user_id === state.sharedFundSourceRow.user_id;
                    const isSpouseEmailMatched = parsed.spouse_email && parsed.spouse_email.toLowerCase().trim() === myEmail;
                    const isCurrentSpouse = state.spouseEmail && rowEmail === state.spouseEmail.toLowerCase().trim();
                    
                    console.log("[E2EE Debug] Case E Check - rowEmail =", rowEmail, "spouseEmail =", state.spouseEmail, "viewingSharedFund =", state.viewingSharedFund, "isCurrentSpouse =", isCurrentSpouse, "isSpouseEmailMatched =", isSpouseEmailMatched, "isSharedOwner =", isSharedOwner);
                    if (state.viewingSharedFund && isCurrentSpouse && (isSpouseEmailMatched || isSharedOwner)) {
                        const inviteTime = state.familyFundInviteStatusUpdated ? new Date(state.familyFundInviteStatusUpdated).getTime() : 0;
                        const rowTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
                        
                        if (state.familyFundInviteStatus === 'declined') {
                            if (rowTime > inviteTime) {
                                console.log("[E2EE Debug] Found new legacy invitation updated after decline/leave. Resetting status.");
                                state.familyFundInviteStatus = '';
                                state.familyFundInviteStatusUpdated = new Date().toISOString();
                                await saveLocalState();
                            } else {
                                console.log("[E2EE Debug] Spouse has declined/left legacy shared fund. Skipping.");
                                continue;
                            }
                        }
                        console.log("[E2EE Debug] Match found for spouse_email!");
                        husbandRowFound = true;
                        state.spouseRole = 'wife'; // Guest's role is always 'wife' (Partner is Husband/Admin)
                        state.ownerNickname = parsed.owner_nickname || '';
                        let fundKey = '';
                        if (state.asymmetricPrivateKeyEncrypted) {
                            let decryptedPrivKey = await decrypt(state.asymmetricPrivateKeyEncrypted, state.masterPassword);
                            const myEncryptedFundKey = parsed.fund_shared_keys ? parsed.fund_shared_keys[myEmail] : null;
                            console.log("[E2EE Debug] myEncryptedFundKey exists:", !!myEncryptedFundKey);
                            if (myEncryptedFundKey) {
                                try {
                                    fundKey = await decryptWithPrivateKey(decryptedPrivKey, myEncryptedFundKey);
                                    console.log("[E2EE Debug] Decrypted fundKey successfully!");
                                } catch (decKeyErr) {
                                    console.error("[E2EE Debug] Spouse failed to decrypt Fund Key:", decKeyErr);
                                }
                            }
                            decryptedPrivKey = null; // CVE-6: xóa khỏi memory ngay sau dùng
                        }
                        
                        if (!fundKey && state.fundSymmetricKey) {
                            fundKey = state.fundSymmetricKey;
                            console.log("[E2EE Debug] Fallback: Using local fundSymmetricKey to decrypt spouse's fund.");
                        }
                        
                        if (fundKey && parsed.encrypted_fund) {
                            state.spouseFundInvitePending = false;
                            if (state.familyFundInviteStatus === 'accepted') {
                                const decryptedFund = await decrypt(parsed.encrypted_fund, fundKey);
                                const fundData = JSON.parse(decryptedFund);
                                state.familyFunds = fundData.familyFunds || [];
                                // Union Merge fundTransactions cho CASE A (Spouse, hỗ trợ soft-delete)
                                const remoteTxsA = fundData.fundTransactions || [];
                                const localTxsA = state.fundTransactions || [];
                                const txMapA = new Map();
                                localTxsA.forEach(t => txMapA.set(t.id, t));
                                remoteTxsA.forEach(t => {
                                    const existing = txMapA.get(t.id);
                                    if (!existing) {
                                        txMapA.set(t.id, t);
                                    } else {
                                        const localDelTime = existing.deleted_at ? new Date(existing.deleted_at).getTime() : 0;
                                        const remoteDelTime = t.deleted_at ? new Date(t.deleted_at).getTime() : 0;
                                        if (localDelTime > 0 || remoteDelTime > 0) {
                                            if (remoteDelTime >= localDelTime) txMapA.set(t.id, t);
                                        } else {
                                            const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
                                            const remoteTime = t.updated_at ? new Date(t.updated_at).getTime() : 0;
                                            if (remoteTime >= localTime) txMapA.set(t.id, t);
                                        }
                                    }
                                });
                                state.fundTransactions = Array.from(txMapA.values());
                                if (fundData.fundTransactionsUpdated) {
                                    const remoteT = new Date(fundData.fundTransactionsUpdated).getTime();
                                    const localT = state.fundTransactionsUpdated ? new Date(state.fundTransactionsUpdated).getTime() : 0;
                                    if (remoteT > localT) state.fundTransactionsUpdated = fundData.fundTransactionsUpdated;
                                }

                                // Gộp dữ liệu Góc tình yêu (WeLove) từ Quỹ chung bằng Last Write Wins (LWW)
                                if (fundData.weLoveStartDateUpdated) {
                                    const localTime = state.weLoveStartDateUpdated ? new Date(state.weLoveStartDateUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveStartDateUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveStartDate = fundData.weLoveStartDate || '';
                                        state.weLoveStartDateUpdated = fundData.weLoveStartDateUpdated;
                                    }
                                }
                                if (fundData.weLoveName1Updated) {
                                    const localTime = state.weLoveName1Updated ? new Date(state.weLoveName1Updated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveName1Updated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveName1 = fundData.weLoveName1 || '';
                                        state.weLoveName1Updated = fundData.weLoveName1Updated;
                                    }
                                }
                                if (fundData.weLoveName2Updated) {
                                    const localTime = state.weLoveName2Updated ? new Date(state.weLoveName2Updated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveName2Updated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveName2 = fundData.weLoveName2 || '';
                                        state.weLoveName2Updated = fundData.weLoveName2Updated;
                                    }
                                }
                                if (fundData.weLoveShowSicknessUpdated) {
                                    const localTime = state.weLoveShowSicknessUpdated ? new Date(state.weLoveShowSicknessUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveShowSicknessUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveShowSickness = fundData.weLoveShowSickness !== false;
                                        state.weLoveShowSicknessUpdated = fundData.weLoveShowSicknessUpdated;
                                    }
                                }
                                if (fundData.weLoveSicknessLogsUpdated) {
                                    const localTime = state.weLoveSicknessLogsUpdated ? new Date(state.weLoveSicknessLogsUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveSicknessLogsUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveSicknessLogs = fundData.weLoveSicknessLogs || [];
                                        state.weLoveSicknessLogsUpdated = fundData.weLoveSicknessLogsUpdated;
                                    }
                                }
                                if (fundData.weLoveRemindersUpdated) {
                                    const localTime = state.weLoveRemindersUpdated ? new Date(state.weLoveRemindersUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveRemindersUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveReminders = fundData.weLoveReminders || [];
                                        state.weLoveRemindersUpdated = fundData.weLoveRemindersUpdated;
                                    }
                                }
                                if (fundData.weLoveAutoplayUpdated) {
                                    const localTime = state.weLoveAutoplayUpdated ? new Date(state.weLoveAutoplayUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveAutoplayUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveAutoplay = fundData.weLoveAutoplay === true;
                                        state.weLoveAutoplayUpdated = fundData.weLoveAutoplayUpdated;
                                    }
                                }
                                 if (fundData.weLoveVisitLogsUpdated) {
                                     const localTime = state.weLoveVisitLogsUpdated ? new Date(state.weLoveVisitLogsUpdated).getTime() : 0;
                                     const remoteTime = new Date(fundData.weLoveVisitLogsUpdated).getTime();
                                     if (remoteTime > localTime) {
                                         state.weLoveVisitLogs = fundData.weLoveVisitLogs || [];
                                         state.weLoveVisitLogsUpdated = fundData.weLoveVisitLogsUpdated;
                                     }
                                 }
                                 if (fundData.weLovePhotoAlbumUpdated) {
                                     const localTime = state.weLovePhotoAlbumUpdated ? new Date(state.weLovePhotoAlbumUpdated).getTime() : 0;
                                     const remoteTime = new Date(fundData.weLovePhotoAlbumUpdated).getTime();
                                     if (remoteTime > localTime) {
                                         state.weLovePhotoAlbum = fundData.weLovePhotoAlbum || [];
                                         state.weLovePhotoAlbumUpdated = fundData.weLovePhotoAlbumUpdated;
                                     }
                                 }
                                if (fundData.ownerEmailUpdated) {
                                    const localTime = state.ownerEmailUpdated ? new Date(state.ownerEmailUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.ownerEmailUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.ownerEmail = fundData.ownerEmail || '';
                                        state.ownerEmailUpdated = fundData.ownerEmailUpdated;
                                    }
                                }
                                state.viewingSharedFund = true;
                                state.sharedFundOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                                state.fundSymmetricKey = fundKey;
                                state.sharedFundSourceRow = {
                                    user_id: row.user_id,
                                    encrypted_data: row.encrypted_data,
                                    encrypted_personal: parsed.encrypted_personal,
                                    fund_shared_keys: parsed.fund_shared_keys,
                                    owner_email: parsed.owner_email,
                                    spouse_email: parsed.spouse_email,
                                    google_sheets_webhook: parsed.google_sheets_webhook
                                };
                                if (typeof window.updateHomeLoveWidget === 'function') {
                                    window.updateHomeLoveWidget();
                                }
                                if (typeof window.renderWeLoveDashboard === 'function') {
                                    window.renderWeLoveDashboard();
                                }
                                if (typeof window.updateHomeLayoutUI === 'function') {
                                    window.updateHomeLayoutUI();
                                }
                                return;
                            } else {
                                state.viewingSharedFund = false;
                                state.sharedFundOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                                state.fundSymmetricKey = fundKey;
                                state.sharedFundSourceRow = {
                                    user_id: row.user_id,
                                    encrypted_data: row.encrypted_data,
                                    encrypted_personal: parsed.encrypted_personal,
                                    fund_shared_keys: parsed.fund_shared_keys,
                                    owner_email: parsed.owner_email,
                                    spouse_email: parsed.spouse_email,
                                    google_sheets_webhook: parsed.google_sheets_webhook
                                };
                                if (typeof window.updateHomeLoveWidget === 'function') {
                                    window.updateHomeLoveWidget();
                                }
                                if (typeof window.renderWeLoveDashboard === 'function') {
                                    window.renderWeLoveDashboard();
                                }
                                if (typeof window.updateHomeLayoutUI === 'function') {
                                    window.updateHomeLayoutUI();
                                }
                                return;
                            }
                        } else {
                            // Case B: Husband has shared with us, but hasn't encrypted the key using our new public key yet
                            console.log("[E2EE Debug] Case B: spouse_email matched but no valid fundKey decrypted yet.");
                            state.spouseFundInvitePending = true;
                            state.spouseFundInviteOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                            state.sharedFundSourceRow = {
                                user_id: row.user_id,
                                encrypted_data: row.encrypted_data,
                                encrypted_personal: parsed.encrypted_personal,
                                fund_shared_keys: parsed.fund_shared_keys,
                                owner_email: parsed.owner_email,
                                spouse_email: parsed.spouse_email,
                                google_sheets_webhook: parsed.google_sheets_webhook
                            };
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                        }
                    }
                } else {
                    // Fallback to legacy E2EE format
                    const decrypted = await decrypt(row.encrypted_data, state.masterPassword);
                    const legacyParsed = JSON.parse(decrypted);

                    if (legacyParsed.spouseEmail && legacyParsed.spouseEmail.toLowerCase().trim() === myEmail) {
                        const inviteTime = state.familyFundInviteStatusUpdated ? new Date(state.familyFundInviteStatusUpdated).getTime() : 0;
                        const rowTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
                        
                        if (state.familyFundInviteStatus === 'declined') {
                            if (rowTime > inviteTime) {
                                console.log("[E2EE Debug] Found new legacy invitation updated after decline/leave. Resetting status.");
                                state.familyFundInviteStatus = '';
                                state.familyFundInviteStatusUpdated = new Date().toISOString();
                                await saveLocalState();
                            } else {
                                console.log("[E2EE Debug] Spouse has declined/left legacy shared fund. Skipping.");
                                continue;
                            }
                        }
                        if (state.familyFundInviteStatus === 'accepted') {
                            state.familyFunds = legacyParsed.familyFunds || [];
                            state.fundTransactions = legacyParsed.fundTransactions || [];
                            state.viewingSharedFund = true;
                            state.sharedFundOwnerEmail = legacyParsed.ownerEmail || 'Chồng/Vợ';
                            if (typeof window.updateHomeLoveWidget === 'function') {
                                window.updateHomeLoveWidget();
                            }
                            if (typeof window.renderWeLoveDashboard === 'function') {
                                window.renderWeLoveDashboard();
                            }
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                            return;
                        } else {
                            state.viewingSharedFund = false;
                            state.sharedFundOwnerEmail = legacyParsed.ownerEmail || 'Chồng/Vợ';
                            if (typeof window.updateHomeLoveWidget === 'function') {
                                window.updateHomeLoveWidget();
                            }
                            if (typeof window.renderWeLoveDashboard === 'function') {
                                window.renderWeLoveDashboard();
                            }
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                            return;
                        }
                    }
                }
            } catch (decErr) {
                // Ignore decryption/parsing failures for other users' rows
            }
        }
        
        // Nếu local state đang ở trạng thái đã kết nối, nhưng quét toàn bộ cơ sở dữ liệu không còn thấy dòng của spouse trên Supabase (đối phương đã hủy/xóa dòng)
        if (state.spouseEmail && state.spouseStatus === 'accepted' && !husbandRowFound && !state.pairingCode) {
            console.log("[E2EE Debug] Spouse row not found on Supabase. Performing auto-unlink locally and updating cloud.");
            const hadSpouse = !!state.spouseEmail;
            
            state.spouseEmail = '';
            state.spouseStatus = '';
            state.spouseRole = 'wife';
            state.pairingCode = '';
            state.pairingCodeExpired = '';
            state.pairingFundKeyEncrypted = '';
            state.pairingCodeAccepted = '';
            state.familyFundInviteStatus = '';
            state.viewingSharedFund = false;
            state.sharedFundOwnerEmail = '';
            state.sharedFundSourceRow = null;
            
            await saveLocalState();
            
            if (hadSpouse) {
                showToast("Đối tác đã hủy kết nối gia đình.", "warning");
            }
            
            if (typeof window.updateHomeLayoutUI === 'function') window.updateHomeLayoutUI();
            if (typeof window.renderWeLoveDashboard === 'function') window.renderWeLoveDashboard();
            if (typeof window.renderFamilyPairingSettings === 'function') window.renderFamilyPairingSettings();
            
            if (typeof performSync === 'function') {
                await performSync(true);
            }
        }
        
    } catch (e) {
        console.error("Error checking shared family fund:", e);
    } finally {
        _isCheckingSharedFund = false;
    }
}

// --- UI LOGIC: RENDER FAMILY PAIRING SETTINGS ---
export function renderFamilyPairingSettings() {
    const container = document.getElementById('familyPairingConfigView');
    if (!container) return;

    if (state.spouseEmail) {
        // ---- ĐÃ KẾT NỐI ----
        const roleLabel = state.viewingSharedFund ? '💕 Vợ (Spouse)' : '👑 Chồng (Admin)';
        const statusLabel = state.spouseStatus === 'accepted' ? '✅ Đã liên kết' : '⏳ Đang chờ đối phương';
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 14px; border: 1px solid var(--border-color);">
                    <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: var(--text-secondary);">Đang kết nối với:</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: var(--accent-rose); word-break: break-all;">${escapeHTML(state.spouseEmail)}</p>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">Vai trò của bạn: <strong>${roleLabel}</strong> &nbsp;|&nbsp; ${statusLabel}</p>
                </div>
                <button class="btn btn-outline w-full" id="btnFamilyPairingUnlink" style="border-color: #ef4444; color: #ef4444; font-weight: 700; padding: 10px; border-radius: 10px;">
                    🔗 Hủy kết nối
                </button>
            </div>`;

        document.getElementById('btnFamilyPairingUnlink')?.addEventListener('click', async () => {
            const confirmed = await window.showConfirm("Bạn có chắc chắn muốn hủy liên kết với bạn tình hiện tại không? 🥺");
            if (!confirmed) return;

            const confirmPassword = await window.showPrompt("Để hủy kết nối vợ chồng, vui lòng xác nhận mật khẩu Master (hoặc mã PIN):");
            if (confirmPassword === null) return;
            
            if (confirmPassword !== state.masterPassword) {
                showToast("Mật khẩu Master không chính xác. Hủy bỏ hủy kết nối!", "error");
                return;
            }

            // [BUG DETECTOR] Bật cờ hủy liên kết (cả RAM và localStorage để chống sập trình duyệt)
            window._isUnlinking = true;
            localStorage.setItem('fami_is_unlinking', 'true');
            console.log(`[BUG DETECTOR] Starting unlink action. Set window._isUnlinking = true and saved fami_is_unlinking in localStorage.`);

            // Hiện màn hình chờ tải
            showLoadingOverlay("Đang xử lý hủy kết nối gia đình...");

            try {
                // Bước 1: Báo hiệu đối phương bằng cách phát Realtime WebSocket Broadcast & đẩy trạng thái 'left' lên Supabase
                const oldSpouse = state.spouseEmail;
                console.log(`[BUG DETECTOR] Unlink Step 1: Setting spouseStatus = 'left' and broadcasting PAIR_UNLINKED.`);
                state.spouseStatus = 'left';
                await saveLocalState();
                
                if (oldSpouse) {
                    broadcastPairUnlinked(state.user?.email || '', oldSpouse);
                }

                if (sync.isConfigured() && state.user) {
                    try { 
                        await performSync(true); 
                        console.log(`[BUG DETECTOR] Unlink Step 1 Sync complete. Current state.spouseStatus = ${state.spouseStatus}`);
                    } catch (e) { 
                        console.error("[Unlink notify remote failed]", e); 
                    }
                }

                // Bước 2: Dọn sạch local
                console.log(`[BUG DETECTOR] Unlink Step 2: Clearing all local spouse state variables.`);
                state.spouseEmail = '';
                state.spouseStatus = '';
                state.spouseRole = 'wife';
                state.pairingCode = '';
                state.pairingCodeExpired = '';
                state.pairingFundKeyEncrypted = '';
                state.pairingCodeAccepted = '';
                state.familyFundInviteStatus = '';
                state.viewingSharedFund = false;
                state.sharedFundOwnerEmail = '';
                state.sharedFundSourceRow = null;
                await saveLocalState();
                if (sync.isConfigured() && state.user) {
                    try { 
                        await performSync(true); 
                        console.log(`[BUG DETECTOR] Unlink Step 2 Sync complete. Current state.spouseEmail = ${state.spouseEmail}`);
                    } catch (e) { 
                        console.error("[Unlink clear remote failed]", e); 
                    }
                }

                showToast("Đã hủy kết nối gia đình.");
            } catch (err) {
                console.error("[BUG DETECTOR] Unlink failed error details:", err);
                showToast("Không thể hủy kết nối: " + err.message, "error");
            } finally {
                // [BUG DETECTOR] Tắt cờ hủy liên kết
                window._isUnlinking = false;
                localStorage.removeItem('fami_is_unlinking');
                console.log(`[BUG DETECTOR] Unlink action completed. Cleared fami_is_unlinking flag.`);
                hideLoadingOverlay();
            }

            renderFamilyPairingSettings();
            if (typeof window.renderWeLoveDashboard === 'function') window.renderWeLoveDashboard();
        });

    } else {
        // ---- CHƯA KẾT NỐI ----
        const isPairingActive = state.pairingCode && state.pairingCodeExpired && (new Date(state.pairingCodeExpired).getTime() > Date.now());
        const codeDisplay = isPairingActive ? `
            <div id="fpPairingCodeDisplayContainer" class="pairing-code-row" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                <span id="fpPairingCodeVal" style="font-size: 1.15rem; font-weight: 800; letter-spacing: 1.5px; color: var(--accent-rose); background: var(--bg-secondary); padding: 5px 14px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">${escapeHTML(state.pairingCode.replace('LOVE-', ''))}</span>
                <button class="btn" id="btnFPCopyCode" style="font-size: 0.75rem; padding: 8px 14px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px;" title="Sao chép mã">📋 Copy</button>
            </div>
            <div id="fpPairingCodeTimer" style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 5px; text-align: right;"></div>
        ` : '';

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">

                <!-- KHỐI 1: TẠO MÃ (Chồng) -->
                <div style="background: rgba(225, 29, 72, 0.04); padding: 14px; border-radius: 12px; border: 1px dashed var(--accent-rose);">
                    <p style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">1. Tạo mã ghép đôi (Dành cho Chồng):</p>
                    <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0 0 10px 0;">Sinh mã 6 số ngẫu nhiên, có hiệu lực 10 phút. Gửi mã này cho vợ để hoàn tất kết nối.</p>
                    <button class="btn btn-primary" id="btnFPGenerateCode" style="font-size: 0.82rem; padding: 9px 18px; background: linear-gradient(135deg, #e11d48, #be123c); border: none; border-radius: 10px; font-weight: 700; color: white;">
                        ${isPairingActive ? '🔄 Tạo mã mới' : '💞 Tạo mã ghép đôi'}
                    </button>
                    ${codeDisplay}
                </div>

                <!-- KHỐI 2: NHẬP MÃ (Vợ) -->
                <div style="background: var(--bg-secondary); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <p style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">2. Nhập mã ghép đôi (Dành cho Vợ):</p>
                    <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0 0 10px 0;">Nhập mã chồng đã gửi để hoàn thành kết nối 2 chiều và mở khóa Quỹ chung & Góc tình yêu.</p>
                    <div class="pairing-input-row" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <input type="text" id="fpPairingCodeInput" placeholder="Nhập 6 chữ số (Ví dụ: 123456)" style="flex-grow: 1; min-width: 0; padding: 8px 12px; font-size: 0.88rem; text-transform: uppercase; font-weight: 700; text-align: center; letter-spacing: 1px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);">
                        <button class="btn btn-primary" id="btnFPSubmitCode" style="font-size: 0.82rem; padding: 10px 16px; background: #059669; border: none; border-radius: 10px; font-weight: 700; color: white; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center;">
                            Kết nối
                        </button>
                    </div>
                </div>

            </div>`;

        // Bắt đầu đồng hồ đếm ngược nếu mã đang hoạt động
        if (isPairingActive) _startFPTimer();

        // Handler: Tạo mã
        document.getElementById('btnFPGenerateCode')?.addEventListener('click', async () => {
            const _sb = window._getSupabaseClient?.();
            if (!_sb) {
                showToast("Bạn cần cấu hình và kết nối Supabase trước!", "warning");
                return;
            }
            const codeNum = Math.floor(100000 + Math.random() * 900000);
            const pairingCode = `LOVE-${codeNum}`;
            try {
                if (!state.fundSymmetricKey) {
                    const raw = window.crypto.getRandomValues(new Uint8Array(32));
                    state.fundSymmetricKey = Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
                    await saveLocalState();
                }
                const encryptedKey = await encrypt(state.fundSymmetricKey, pairingCode);
                state.pairingCode = pairingCode;
                state.pairingCodeExpired = new Date(Date.now() + 10 * 60 * 1000).toISOString();
                state.pairingFundKeyEncrypted = encryptedKey;
                await saveLocalState();
                console.log("[Generate Debug] Before sync: pairingCode =", state.pairingCode);
                showToast("Đang tải mã lên máy chủ...", "info");
                await performSync(true);
                console.log("[Generate Debug] After sync: pairingCode =", state.pairingCode);
                showToast("Đã tạo mã ghép đôi! Gửi cho vợ nhé. ❤️");
                renderFamilyPairingSettings();
            } catch (err) {
                console.error("Failed to generate pairing code:", err.message, err.stack);
                showToast("Không thể tạo mã: " + err.message, "error");
            }
        });

        // Handler: Copy mã
        document.getElementById('btnFPCopyCode')?.addEventListener('click', () => {
            if (!state.pairingCode) return;
            const rawCode = state.pairingCode.replace('LOVE-', '');
            navigator.clipboard.writeText(rawCode)
                .then(() => showToast("Đã sao chép mã!"))
                .catch(() => showToast("Không thể sao chép, copy thủ công nhé."));
        });

        // Handler: Nhập mã và kết nối
        const btnSubmit = document.getElementById('btnFPSubmitCode');
        const inputCode = document.getElementById('fpPairingCodeInput');
        btnSubmit?.addEventListener('click', async () => {
            const _sbClient = window._getSupabaseClient?.();
            if (!_sbClient) {
                showToast("Bạn cần cấu hình và kết nối Supabase trước!", "warning");
                return;
            }
            let code = (inputCode?.value || '').trim().toUpperCase();
            if (/^\d{6}$/.test(code)) {
                code = `LOVE-${code}`;
            }
            if (!code.startsWith('LOVE-') || code.length < 10) {
                showToast("Mã không đúng định dạng! (Ví dụ: 123456 hoặc LOVE-123456)", "warning");
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerText = "Đang kết nối...";
            try {
                const { data: allRows, error } = await _sbClient
                    .from('gift_sync')
                    .select('user_id, encrypted_data, user_email, public_key');

                if (error) throw new Error("Lỗi kết nối máy chủ: " + error.message);
                
                let matchingRow = null;
                let parsed = null;
                
                if (allRows) {
                    console.log(`[Pairing Debug] Scanned ${allRows.length} rows to find code: ${code}`);
                    for (const row of allRows) {
                        try {
                            let p = null;
                            if (typeof row.encrypted_data === 'object' && row.encrypted_data !== null) {
                                p = row.encrypted_data;
                            } else {
                                p = JSON.parse(row.encrypted_data);
                            }
                            
                            const rowCode = (p?.pairing_code || '').trim().toUpperCase();
                            if (p && rowCode === code) {
                                matchingRow = row;
                                parsed = p;
                                break;
                            }
                        } catch (e) {
                            console.warn(`[Pairing Debug] -> Failed to parse row data:`, e.message);
                        }
                    }
                }

                if (!matchingRow || !parsed) {
                    throw new Error("Không tìm thấy mã! Hãy kiểm tra lại mã hoặc nhờ chồng tạo mã mới (mã chỉ có hiệu lực trong 10 phút).");
                }

                const data = matchingRow;
                const husbandEmail = (data.user_email || '').toLowerCase().trim();
                const myEmail = (state.user?.email || state.userEmail || '').toLowerCase().trim();
                if (myEmail && husbandEmail === myEmail) throw new Error("Bạn không thể tự ghép đôi với chính mình!");

                if (!parsed?.pairing_code_expired || !parsed?.pairing_fund_key_encrypted) throw new Error("Mã ghép đôi không hợp lệ!");
                if (new Date(parsed.pairing_code_expired).getTime() < Date.now()) throw new Error("Mã đã hết hạn! Nhờ chồng tạo mã mới nhé.");

                showToast("Đang giải mã E2EE...", "info");
                let decryptedFundKey = '';
                try {
                    decryptedFundKey = await decrypt(parsed.pairing_fund_key_encrypted, code);
                } catch (e) {
                    throw new Error("Giải mã thất bại! Kiểm tra lại mã số.");
                }
                if (!decryptedFundKey) throw new Error("Mã không đúng hoặc khóa rỗng!");

                // Cập nhật state: Vợ (wife) - chỉ xem WeLove, có quyền ghi Quỹ chung
                state.fundSymmetricKey = decryptedFundKey;
                state.spouseEmail = husbandEmail;
                state.spouseStatus = 'accepted';
                state.spouseRole = 'wife';
                state.familyFundInviteStatus = 'accepted';
                state.viewingSharedFund = true;
                state.sharedFundOwnerEmail = husbandEmail;
                state.pairingCodeAccepted = code;
                state.sharedFundSourceRow = {
                    user_id: data.user_id,
                    encrypted_data: data.encrypted_data,
                    encrypted_personal: parsed.encrypted_personal || '',
                    fund_shared_keys: parsed.fund_shared_keys || {},
                    owner_email: parsed.owner_email || husbandEmail,
                    spouse_email: parsed.spouse_email || '',
                    google_sheets_webhook: parsed.google_sheets_webhook || ''
                };
                await saveLocalState();
                showToast("Kết nối gia đình thành công! ❤️");
                await performSync(true);
                broadcastPairAccepted(husbandEmail, state.user.email, code);
                renderFamilyPairingSettings();
                if (typeof window.renderWeLoveDashboard === 'function') window.renderWeLoveDashboard();
                if (typeof window.updateHomeLayoutUI === 'function') window.updateHomeLayoutUI();
            } catch (err) {
                showToast(err.message || "Kết nối thất bại!", "error");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Kết nối";
            }
        });
    }
}

function _startFPTimer() {
    if (_pairingInterval) clearInterval(_pairingInterval);
    const timerEl = document.getElementById('fpPairingCodeTimer');
    const valEl = document.getElementById('fpPairingCodeVal');
    if (!timerEl || !state.pairingCode || !state.pairingCodeExpired) return;
    const update = () => {
        const diff = new Date(state.pairingCodeExpired).getTime() - Date.now();
        if (diff <= 0) {
            clearInterval(_pairingInterval);
            state.pairingCode = '';
            state.pairingCodeExpired = '';
            state.pairingFundKeyEncrypted = '';
            saveLocalState();
            renderFamilyPairingSettings();
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (timerEl) timerEl.innerText = `Mã hết hạn sau: ${m}:${s.toString().padStart(2, '0')}`;
        if (valEl) valEl.innerText = state.pairingCode.replace('LOVE-', '');
    };
    update();
    _pairingInterval = setInterval(update, 1000);
}

// Realtime WebSockets Broadcast Channels
export function initRealtimePairingChannel() {
    const supabaseClient = sync.getSupabase();
    if (!supabaseClient) return;

    if (_pairingRealtimeChannel) {
        try { supabaseClient.removeChannel(_pairingRealtimeChannel); } catch (e) {}
    }

    _pairingRealtimeChannel = supabaseClient.channel('familife_pairing_room')
        .on('broadcast', { event: 'PAIR_ACCEPTED' }, async (payload) => {
            console.log("[Realtime] Received PAIR_ACCEPTED broadcast:", payload);
            const dataPayload = payload.payload || {};
            const myEmail = (state.user?.email || '').toLowerCase().trim();
            const targetHusband = (dataPayload.husbandEmail || '').toLowerCase().trim();

            if (myEmail && targetHusband && myEmail === targetHusband) {
                console.log("[Realtime] I am husband! Instant pairing triggered by wife:", dataPayload.wifeEmail);
                if (typeof window.checkForSharedFamilyFund === 'function') {
                    await window.checkForSharedFamilyFund();
                }
            }
        })
        .on('broadcast', { event: 'PAIR_UNLINKED' }, async (payload) => {
            console.log("[Realtime] Received PAIR_UNLINKED broadcast:", payload);
            const dataPayload = payload.payload || {};
            const myEmail = (state.user?.email || '').toLowerCase().trim();
            const targetSpouse = (dataPayload.targetSpouse || '').toLowerCase().trim();

            if (myEmail && targetSpouse && myEmail === targetSpouse) {
                console.log("[Realtime] Spouse unlinked me via Realtime WebSocket! Unlinking locally now...");
                const hadSpouse = !!state.spouseEmail;
                state.spouseEmail = '';
                state.spouseStatus = '';
                state.spouseRole = 'wife';
                state.pairingCode = '';
                state.pairingCodeExpired = '';
                state.pairingFundKeyEncrypted = '';
                state.pairingCodeAccepted = '';
                state.familyFundInviteStatus = '';
                state.viewingSharedFund = false;
                state.sharedFundOwnerEmail = '';
                state.sharedFundSourceRow = null;

                await saveLocalState();

                if (hadSpouse) {
                    showToast("Đối tác đã hủy kết nối gia đình.", "warning");
                }

                if (typeof window.updateHomeLayoutUI === 'function') window.updateHomeLayoutUI();
                if (typeof window.renderWeLoveDashboard === 'function') window.renderWeLoveDashboard();
                if (typeof window.renderFamilyPairingSettings === 'function') window.renderFamilyPairingSettings();

                if (typeof performSync === 'function') {
                    await performSync(true);
                }
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("[Realtime] Successfully connected to FamiLife Realtime WebSocket Channel!");
            }
        });
}

export function broadcastPairAccepted(husbandEmail, wifeEmail, pairingCode) {
    if (_pairingRealtimeChannel) {
        _pairingRealtimeChannel.send({
            type: 'broadcast',
            event: 'PAIR_ACCEPTED',
            payload: { husbandEmail, wifeEmail, pairingCode }
        }).catch(err => console.error("[Realtime] Broadcast PAIR_ACCEPTED error:", err));
    }
}

export function broadcastPairUnlinked(unlinkedBy, targetSpouse) {
    if (_pairingRealtimeChannel) {
        _pairingRealtimeChannel.send({
            type: 'broadcast',
            event: 'PAIR_UNLINKED',
            payload: { unlinkedBy, targetSpouse }
        }).catch(err => console.error("[Realtime] Broadcast PAIR_UNLINKED error:", err));
    }
}

// Expose globally for app.js and other files to call
window.checkForSharedFamilyFund = checkForSharedFamilyFund;
window.renderFamilyPairingSettings = renderFamilyPairingSettings;
window.initRealtimePairingChannel = initRealtimePairingChannel;

// Tự động chạy kiểm tra liên kết & kết nối Realtime WebSocket khi module nạp xong
setTimeout(() => {
    if (state.user) {
        checkForSharedFamilyFund();
        initRealtimePairingChannel();
    }
}, 500);

// --- HELPERS: LOADING OVERLAY ---
function showLoadingOverlay(message = "Đang xử lý...") {
    let overlay = document.getElementById('familyConnectionLoadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'familyConnectionLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(9, 13, 22, 0.85);
            backdrop-filter: blur(8px);
            z-index: 11000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: inherit;
            transition: opacity 0.3s ease;
            opacity: 0;
        `;
        
        // Spinner
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 48px;
            height: 48px;
            border: 4px solid rgba(225, 29, 72, 0.15);
            border-top: 4px solid #e11d48;
            border-radius: 50%;
            animation: family-spin 1s linear infinite;
            margin-bottom: 20px;
        `;
        
        // Add animation keyframes to head if not present
        if (!document.getElementById('family-spin-keyframes')) {
            const style = document.createElement('style');
            style.id = 'family-spin-keyframes';
            style.innerHTML = `
                @keyframes family-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        const text = document.createElement('p');
        text.id = 'familyConnectionLoadingText';
        text.style.cssText = `
            font-size: 1.05rem;
            font-weight: 600;
            margin: 0;
            letter-spacing: 0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);
    }
    
    const textEl = document.getElementById('familyConnectionLoadingText');
    if (textEl) textEl.innerText = message;
    overlay.style.display = 'flex';
    // Trigger reflow
    overlay.offsetHeight;
    overlay.style.opacity = '1';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('familyConnectionLoadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}
