import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encrypt, decrypt, generateAsymmetricKeypair, encryptWithPublicKey, decryptWithPrivateKey } from './crypto';
import * as sync from './sync';

const AppContext = createContext();

const INITIAL_STATE = {
  masterPassword: '',
  asymmetricPublicKey: '',
  asymmetricPrivateKeyEncrypted: '',
  fundSymmetricKey: '',
  receivedGifts: [],
  sentGifts: [],
  medicalRecords: [],
  medicalRecordsUpdated: '',
  geminiApiKey: '',
  geminiApiKeyUpdated: '',
  lastAiAnalysis: '',
  lastAiAnalysisDate: '',
  lastAiAnalysisUpdated: '',
  lastBpAnalysis: '',
  lastBpAnalysisDate: '',
  lastBpAnalysisUpdated: '',
  currentAiAnalysisType: 'full',
  selectedSpeechVoiceName: '',
  selectedSpeechRate: 1.0,
  familyProfiles: [],
  familyProfilesUpdated: '',
  selectedHealthProfileId: 'p-self',
  familyProfilesEditMode: false,
  lastResetTime: '',
  showImportNotesOption: false,
  showImportNotesOptionUpdated: '',
  showFamilyFundCard: false,
  showFamilyFundCardUpdated: '',
  customEventTypes: [],
  customEventTypesUpdated: '',
  familyFunds: [],
  familyFundsUpdated: '',
  spouseEmail: '',
  ownerEmail: '',
  googleSheetsWebhook: '',
  activeChartFundIds: ['fund-main'],
  viewingSharedFund: false,
  sharedFundOwnerEmail: '',
  spouseFundInvitePending: false,
  spouseFundInviteOwnerEmail: '',
  sharedFundSourceRow: null,
  fundTransactions: [],
  fundTransactionsUpdated: '',
  activeTab: 'dashboard',
  tabHistory: [],
  theme: 'light',
  familyFundInviteStatus: '',
  familyFundInviteStatusUpdated: '',
  spouseRole: 'wife',
  ownerNickname: '',
  spouseStatus: '',
  user: null,

  // Supabase Connection Settings
  supabaseUrl: '',
  supabaseKey: '',

  // Pagination & Search state
  receivedSearch: '',
  receivedFilterRelation: '',
  receivedFilterStatus: '',
  receivedFilterEvent: '',

  sentSearch: '',
  sentFilterType: '',
  sentFilterRelation: '',
  lastFullBackupDate: '',

  // Blood Pressure tracking
  bloodPressureRecords: [],
  bloodPressureRecordsUpdated: '',

  // Body Composition tracking
  bodyCompositionRecords: [],
  bodyCompositionRecordsUpdated: ''
};

const STORAGE_KEY = 'FAMILIFE_STATE';

// Helper to merge lists using Last Write Wins
function mergeListLWW(localList, remoteList) {
  const mergedMap = new Map();
  (localList || []).forEach(item => {
    if (item && item.id) mergedMap.set(item.id, item);
  });
  (remoteList || []).forEach(remoteItem => {
    if (remoteItem && remoteItem.id) {
      const localItem = mergedMap.get(remoteItem.id);
      if (!localItem) {
        mergedMap.set(remoteItem.id, remoteItem);
      } else {
        const localTime = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
        const remoteTime = remoteItem.updated_at ? new Date(remoteItem.updated_at).getTime() : 0;
        if (remoteTime > localTime) {
          mergedMap.set(remoteItem.id, remoteItem);
        }
      }
    }
  });
  return Array.from(mergedMap.values());
}

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from local storage on startup
  useEffect(() => {
    async function loadStoredState() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const mergedState = { ...INITIAL_STATE, ...parsed };
          setState(mergedState);

          // Initialize Supabase if credentials exist
          if (mergedState.supabaseUrl && mergedState.supabaseKey) {
            sync.initSupabase(mergedState.supabaseUrl, mergedState.supabaseKey);
            // Attempt auto-check user
            sync.getCurrentUser().then(user => {
              if (user) {
                setState(prev => ({ ...prev, user }));
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to load state from AsyncStorage:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredState();
  }, []);

  // Update specific keys in state and save to AsyncStorage
  const updateState = async (updates) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState)).catch(err => {
        console.error('Failed to save state to AsyncStorage:', err);
      });
      return newState;
    });
  };

  // Reset state to initial (e.g. on logout/reset data)
  const resetState = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setState(INITIAL_STATE);
      await sync.signOut();
    } catch (err) {
      console.error('Failed to reset state:', err);
    }
  };

  // Setup Supabase Connection Settings
  const setupSupabaseConnection = async (url, key) => {
    try {
      sync.initSupabase(url, key);
      await updateState({ supabaseUrl: url, supabaseKey: key });
      return true;
    } catch (e) {
      console.error("Failed to setup Supabase connection:", e);
      return false;
    }
  };

  // Synchronize local data and cloud data (Pull and Push)
  const performSync = async () => {
    if (!sync.isConfigured()) return false;
    if (!state.masterPassword) return false;

    try {
      const user = await sync.getCurrentUser();
      if (!user) return false;

      // 1. Fetch remote data
      const remoteRecord = await sync.getSyncData();
      
      let mergedReceived = [...state.receivedGifts];
      let mergedSent = [...state.sentGifts];
      let mergedMedical = [...(state.medicalRecords || [])];
      let mergedBP = [...(state.bloodPressureRecords || [])];
      let mergedBodyComp = [...(state.bodyCompositionRecords || [])];
      let mergedFamilyFunds = [...(state.familyFunds || [])];
      let mergedFundTransactions = [...(state.fundTransactions || [])];
      let localReset = state.lastResetTime || '';

      let remoteData = null;
      let isHybrid = false;

      if (remoteRecord && remoteRecord.encrypted_data) {
        try {
          const parsedObj = JSON.parse(remoteRecord.encrypted_data);
          if (parsedObj && parsedObj.is_hybrid) {
            isHybrid = true;
            
            // Decrypt personal data
            const decryptedPersonal = await decrypt(parsedObj.encrypted_personal, state.masterPassword);
            remoteData = JSON.parse(decryptedPersonal);

            // Handle spouse linking states
            if (parsedObj.spouse_status === 'left') {
              parsedObj.spouse_email = '';
              parsedObj.spouse_role = 'wife';
              parsedObj.owner_nickname = '';
              if (remoteData) {
                remoteData.spouseEmail = '';
                remoteData.spouseRole = 'wife';
                remoteData.ownerNickname = '';
              }
              await updateState({
                spouseEmail: '',
                spouseRole: 'wife',
                ownerNickname: '',
                spouseStatus: '',
                familyFundsUpdated: new Date().toISOString()
              });
            } else if (parsedObj.spouse_status && remoteData && parsedObj.spouse_status !== remoteData.spouseStatus) {
              remoteData.spouseStatus = parsedObj.spouse_status;
              await updateState({ spouseStatus: parsedObj.spouse_status });
              
              if (parsedObj.spouse_status === 'accepted' && !state.showFamilyFundCard) {
                await updateState({
                  showFamilyFundCard: true,
                  showFamilyFundCardUpdated: new Date().toISOString()
                });
                remoteData.showFamilyFundCard = true;
                remoteData.showFamilyFundCardUpdated = state.showFamilyFundCardUpdated;
              }
            }

            // Get Fund Key and Decrypt family fund data
            let fundKey = remoteData.fundSymmetricKey || state.fundSymmetricKey;
            if (!fundKey && state.asymmetricPrivateKeyEncrypted) {
              const decryptedPrivKey = await decrypt(state.asymmetricPrivateKeyEncrypted, state.masterPassword);
              const myEmail = user.email.toLowerCase().trim();
              const myEncryptedFundKey = parsedObj.fund_shared_keys ? parsedObj.fund_shared_keys[myEmail] : null;
              if (myEncryptedFundKey) {
                try {
                  fundKey = await decryptWithPrivateKey(decryptedPrivKey, myEncryptedFundKey);
                } catch (decKeyErr) {
                  console.error("Failed to decrypt Fund Key using Private Key:", decKeyErr);
                }
              }
            }

            if (fundKey && parsedObj.encrypted_fund) {
              try {
                const decryptedFund = await decrypt(parsedObj.encrypted_fund, fundKey);
                const fundData = JSON.parse(decryptedFund);
                remoteData.familyFunds = fundData.familyFunds || [];
                remoteData.familyFundsUpdated = fundData.familyFundsUpdated || '';
                remoteData.fundTransactions = fundData.fundTransactions || [];
                remoteData.fundTransactionsUpdated = fundData.fundTransactionsUpdated || '';
                remoteData.activeChartFundIds = fundData.activeChartFundIds || ['fund-main'];
              } catch (decFundErr) {
                console.error("Failed to decrypt Fund Data using Fund Key:", decFundErr);
              }
            }
          }
        } catch (jsonErr) {
          // Fallback below
        }

        if (!isHybrid) {
          const remoteDecrypted = await decrypt(remoteRecord.encrypted_data, state.masterPassword);
          remoteData = JSON.parse(remoteDecrypted);
        }

        const remoteReset = remoteData.lastResetTime || '';
        const localResetTime = localReset ? new Date(localReset).getTime() : 0;
        const remoteResetTime = remoteReset ? new Date(remoteReset).getTime() : 0;

        if (remoteResetTime > localResetTime) {
          // Server overwrite
          await updateState({
            receivedGifts: remoteData.receivedGifts || [],
            sentGifts: remoteData.sentGifts || [],
            medicalRecords: remoteData.medicalRecords || [],
            bloodPressureRecords: remoteData.bloodPressureRecords || [],
            bodyCompositionRecords: remoteData.bodyCompositionRecords || [],
            familyFunds: remoteData.familyFunds || [],
            fundTransactions: remoteData.fundTransactions || [],
            lastResetTime: remoteReset,
            showImportNotesOption: !!remoteData.showImportNotesOption,
            showImportNotesOptionUpdated: remoteData.showImportNotesOptionUpdated || '',
            showFamilyFundCard: !!remoteData.showFamilyFundCard,
            showFamilyFundCardUpdated: remoteData.showFamilyFundCardUpdated || '',
            fundSymmetricKey: remoteData.fundSymmetricKey || '',
            asymmetricPublicKey: remoteData.asymmetricPublicKey || '',
            asymmetricPrivateKeyEncrypted: remoteData.asymmetricPrivateKeyEncrypted || '',
            customEventTypes: remoteData.customEventTypes || [],
            customEventTypesUpdated: remoteData.customEventTypesUpdated || '',
            medicalRecordsUpdated: remoteData.medicalRecordsUpdated || '',
            geminiApiKey: remoteData.geminiApiKey || '',
            geminiApiKeyUpdated: remoteData.geminiApiKeyUpdated || '',
            lastAiAnalysis: remoteData.lastAiAnalysis || '',
            lastAiAnalysisDate: remoteData.lastAiAnalysisDate || '',
            lastAiAnalysisUpdated: remoteData.lastAiAnalysisUpdated || '',
            familyProfiles: remoteData.familyProfiles || [],
            familyProfilesUpdated: remoteData.familyProfilesUpdated || '',
            spouseEmail: remoteData.spouseEmail || '',
            googleSheetsWebhook: remoteData.googleSheetsWebhook || '',
            spouseRole: remoteData.spouseRole || 'wife',
            ownerNickname: remoteData.ownerNickname || '',
            spouseStatus: remoteData.spouseStatus || ''
          });
          return true;
        } else {
          // LWW merge
          mergedReceived = mergeListLWW(state.receivedGifts, remoteData.receivedGifts);
          mergedSent = mergeListLWW(state.sentGifts, remoteData.sentGifts);
          mergedMedical = mergeListLWW(state.medicalRecords, remoteData.medicalRecords);
          mergedBP = mergeListLWW(state.bloodPressureRecords, remoteData.bloodPressureRecords);
          mergedBodyComp = mergeListLWW(state.bodyCompositionRecords, remoteData.bodyCompositionRecords);
          mergedFamilyFunds = mergeListLWW(state.familyFunds, remoteData.familyFunds);
          mergedFundTransactions = mergeListLWW(state.fundTransactions, remoteData.fundTransactions);
        }
      }

      // Generate Key Pair if not exists
      let curPublicKey = state.asymmetricPublicKey;
      let curPrivateKeyEnc = state.asymmetricPrivateKeyEncrypted;
      if (state.masterPassword && !curPublicKey) {
        try {
          const keys = await generateAsymmetricKeypair();
          curPublicKey = keys.publicKey;
          curPrivateKeyEnc = await encrypt(keys.privateKey, state.masterPassword);
          await updateState({
            asymmetricPublicKey: curPublicKey,
            asymmetricPrivateKeyEncrypted: curPrivateKeyEnc
          });
        } catch (keysErr) {
          console.error("Failed to generate keys:", keysErr);
        }
      }

      // Encrypt and save personal payload
      const personalPayload = JSON.stringify({
        receivedGifts: mergedReceived,
        sentGifts: mergedSent,
        medicalRecords: mergedMedical,
        medicalRecordsUpdated: state.medicalRecordsUpdated,
        geminiApiKey: state.geminiApiKey,
        geminiApiKeyUpdated: state.geminiApiKeyUpdated,
        lastAiAnalysis: state.lastAiAnalysis,
        lastAiAnalysisDate: state.lastAiAnalysisDate,
        lastAiAnalysisUpdated: state.lastAiAnalysisUpdated,
        lastResetTime: state.lastResetTime,
        showImportNotesOption: state.showImportNotesOption,
        showImportNotesOptionUpdated: state.showImportNotesOptionUpdated,
        showFamilyFundCard: state.showFamilyFundCard,
        showFamilyFundCardUpdated: state.showFamilyFundCardUpdated,
        customEventTypes: state.customEventTypes,
        customEventTypesUpdated: state.customEventTypesUpdated,
        familyProfiles: state.familyProfiles,
        familyProfilesUpdated: state.familyProfilesUpdated,
        bloodPressureRecords: mergedBP,
        bloodPressureRecordsUpdated: state.bloodPressureRecordsUpdated,
        bodyCompositionRecords: mergedBodyComp,
        bodyCompositionRecordsUpdated: state.bodyCompositionRecordsUpdated,
        asymmetricPublicKey: curPublicKey,
        asymmetricPrivateKeyEncrypted: curPrivateKeyEnc,
        fundSymmetricKey: state.fundSymmetricKey,
        spouseEmail: state.spouseEmail,
        googleSheetsWebhook: state.googleSheetsWebhook,
        spouseRole: state.spouseRole,
        ownerNickname: state.ownerNickname,
        spouseStatus: state.spouseStatus
      });

      const encryptedPersonal = await encrypt(personalPayload, state.masterPassword);

      // Encrypt family fund payload
      let encryptedFund = '';
      const fundSharedKeys = {};

      if (state.fundSymmetricKey) {
        const fundPayload = JSON.stringify({
          familyFunds: mergedFamilyFunds,
          familyFundsUpdated: state.familyFundsUpdated,
          fundTransactions: mergedFundTransactions,
          fundTransactionsUpdated: state.fundTransactionsUpdated,
          activeChartFundIds: state.activeChartFundIds
        });
        encryptedFund = await encrypt(fundPayload, state.fundSymmetricKey);

        // Encrypt fund key for self
        if (curPublicKey) {
          const encryptedSelfKey = await encryptWithPublicKey(curPublicKey, state.fundSymmetricKey);
          fundSharedKeys[user.email.toLowerCase().trim()] = encryptedSelfKey;
        }

        // Encrypt fund key for spouse if linked
        if (state.spouseEmail && state.spouseStatus === 'accepted') {
          const spousePubKey = await sync.getSpousePublicKey(state.spouseEmail);
          if (spousePubKey) {
            const encryptedSpouseKey = await encryptWithPublicKey(spousePubKey, state.fundSymmetricKey);
            fundSharedKeys[state.spouseEmail.toLowerCase().trim()] = encryptedSpouseKey;
          }
        }
      }

      const hybridPayload = JSON.stringify({
        is_hybrid: true,
        encrypted_personal: encryptedPersonal,
        encrypted_fund: encryptedFund,
        fund_shared_keys: fundSharedKeys,
        spouse_email: state.spouseEmail,
        spouse_role: state.spouseRole,
        owner_nickname: state.ownerNickname,
        spouse_status: state.spouseStatus,
        google_sheets_webhook: state.googleSheetsWebhook,
        public_key: curPublicKey
      });

      // Save hybrid payload to Cloud
      await sync.saveSyncData(hybridPayload, curPublicKey);

      // Update local state finally
      await updateState({
        receivedGifts: mergedReceived,
        sentGifts: mergedSent,
        medicalRecords: mergedMedical,
        bloodPressureRecords: mergedBP,
        bodyCompositionRecords: mergedBodyComp,
        familyFunds: mergedFamilyFunds,
        fundTransactions: mergedFundTransactions
      });

      return true;
    } catch (e) {
      console.error("Sync failed:", e);
      return false;
    }
  };

  // Sign In Supabase and sync
  const login = async (email, password) => {
    if (!sync.isConfigured()) throw new Error("Chưa cấu hình Supabase connection");
    try {
      const data = await sync.signIn(email, password);
      if (data && data.user) {
        await updateState({ user: data.user });
        // Attempt sync
        await performSync();
      }
      return data;
    } catch (err) {
      console.error("SignIn failed:", err);
      throw err;
    }
  };

  // Sign Up Supabase
  const register = async (email, password) => {
    if (!sync.isConfigured()) throw new Error("Chưa cấu hình Supabase connection");
    try {
      const data = await sync.signUp(email, password);
      return data;
    } catch (err) {
      console.error("SignUp failed:", err);
      throw err;
    }
  };

  // Sign Out Supabase
  const logout = async () => {
    try {
      await sync.signOut();
      await updateState({ user: null });
    } catch (err) {
      console.error("SignOut failed:", err);
    }
  };

  // Send Spouse Invitation
  const sendSpouseInvitation = async (spouseEmail, role) => {
    if (!sync.isConfigured()) return false;
    try {
      const spousePubKey = await sync.getSpousePublicKey(spouseEmail);
      if (!spousePubKey) {
        throw new Error("Không tìm thấy thông tin tài khoản vợ/chồng trên máy chủ");
      }

      // Generate a new Fund Key if not exists
      let fundKey = state.fundSymmetricKey;
      if (!fundKey) {
        // Generate random 32 bytes hex key
        const rawBytes = forge.random.getBytesSync(32);
        fundKey = forge.util.bytesToHex(rawBytes);
        await updateState({ fundSymmetricKey: fundKey });
      }

      await updateState({
        spouseEmail: spouseEmail.toLowerCase().trim(),
        spouseRole: role,
        spouseStatus: 'pending_accept'
      });

      await performSync();
      return true;
    } catch (e) {
      console.error("Spouse invitation failed:", e);
      throw e;
    }
  };

  // Decline Spouse Invitation
  const declineSpouseInvitation = async () => {
    await updateState({
      spouseEmail: '',
      spouseRole: 'wife',
      spouseStatus: ''
    });
    await performSync();
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      updateState, 
      resetState, 
      isLoading,
      setupSupabaseConnection,
      performSync,
      login,
      register,
      logout,
      sendSpouseInvitation,
      declineSpouseInvitation
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
