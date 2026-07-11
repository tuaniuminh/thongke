// sync.js - Supabase integration for synchronization

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
    // Tránh khởi tạo nhiều instance trùng lặp GoTrueClient nếu URL và Key không đổi
    if (supabase && url === currentUrl && key === currentKey) {
        return supabase;
    }
    try {
        // Import createClient from ESM CDN dynamically or rely on global/module import
        // To be safe and fast, we use the standard createClient from the ESM CDN
        supabase = window.supabase ? window.supabase.createClient(url, key) : null;
        if (supabase) {
            currentUrl = url;
            currentKey = key;
        } else {
            currentUrl = null;
            currentKey = null;
        }
        return supabase;
    } catch (e) {
        console.error("Failed to initialize Supabase:", e);
        supabase = null;
        currentUrl = null;
        currentKey = null;
        return null;
    }
}

// Get initialized Supabase client
export function getSupabase() {
    return supabase;
}

// Check if Supabase client is configured
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
    const { data: { user } } = await supabase.auth.getUser();
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

import { state } from './app.js?v=4.1.15';

// Save encrypted data to gift_sync table (insert or update)
export async function saveSyncData(encryptedData) {
    if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
    const user = await getCurrentUser();
    if (!user) throw new Error("Người dùng chưa đăng nhập");

    // Try to upsert the data
    const { data, error } = await supabase
        .from('gift_sync')
        .upsert({
            user_id: user.id,
            encrypted_data: encryptedData,
            updated_at: new Date().toISOString(),
            user_email: user.email,
            public_key: state.asymmetricPublicKey || null
        });

    if (error) {
        console.error("Error saving sync data:", error);
        throw new Error("Lỗi khi đồng bộ dữ liệu lên máy chủ: " + error.message);
    }
    return data;
}
