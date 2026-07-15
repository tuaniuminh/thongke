import { createClient } from '@supabase/supabase-js';

let supabase = null;
let currentUrl = null;
let currentKey = null;

// Initialize Supabase client
export function initSupabase(url, key) {
  if (!url || !key) {
    supabase = null;
    currentUrl = null;
    currentKey = null;
    return null;
  }

  if (supabase && url === currentUrl && key === currentKey) {
    return supabase;
  }

  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    currentUrl = url;
    currentKey = key;
    return supabase;
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
    supabase = null;
    currentUrl = null;
    currentKey = null;
    return null;
  }
}

export function getSupabase() {
  return supabase;
}

export function isConfigured() {
  return supabase !== null;
}

// Sign up a new user
export async function signUp(email, password) {
  if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign in an existing user
export async function signIn(email, password) {
  if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign out user
export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get currently logged-in user
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

// Fetch encrypted data from gift_sync table
export async function getSyncData() {
  if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
  const user = await getCurrentUser();
  if (!user) throw new Error("Người dùng chưa đăng nhập");

  const { data, error } = await supabase
    .from('gift_sync')
    .select('encrypted_data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching sync data:", error);
    throw new Error("Lỗi khi tải dữ liệu từ máy chủ: " + error.message);
  }
  return data;
}

// Save encrypted data to gift_sync table (insert or update)
export async function saveSyncData(encryptedData, publicKey = null) {
  if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
  const user = await getCurrentUser();
  if (!user) throw new Error("Người dùng chưa đăng nhập");

  const { data, error } = await supabase
    .from('gift_sync')
    .upsert({
      user_id: user.id,
      encrypted_data: encryptedData,
      updated_at: new Date().toISOString(),
      user_email: user.email,
      public_key: publicKey
    });

  if (error) {
    console.error("Error saving sync data:", error);
    throw new Error("Lỗi khi đồng bộ dữ liệu lên máy chủ: " + error.message);
  }
  return data;
}

// Fetch spouse public key on Supabase
export async function getSpousePublicKey(email) {
  if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
  const { data, error } = await supabase
    .from('gift_sync')
    .select('public_key')
    .eq('user_email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error("Error fetching spouse public key:", error);
    return null;
  }
  return data ? data.public_key : null;
}
