import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          // Merge with initial state to ensure newly added keys are present
          setState(prev => ({ ...prev, ...parsed }));
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
      // Save in background
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
    } catch (err) {
      console.error('Failed to reset state:', err);
    }
  };

  return (
    <AppContext.Provider value={{ state, updateState, resetState, isLoading }}>
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
