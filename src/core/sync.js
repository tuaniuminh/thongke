// sync.js - Supabase integration for synchronization

let supabase = null;
let currentUrl = null;
let currentKey = null;

// Initialize Supabase client
// Dùng window-level singleton để tránh tạo nhiều GoTrueClient instances
// kể cả khi module bị re-execute sau khi Service Worker kích hoạt
export function initSupabase(url, key) {
    if (!url || !key) {
        supabase = null;
        currentUrl = null;
        currentKey = null;
        window.__famiLifeSupabase = null;
        window.__famiLifeSupabaseUrl = null;
        window.__famiLifeSupabaseKey = null;
        return null;
    }

    // Phục hồi từ window singleton nếu module vừa bị reset (sau SW activation)
    if (window.__famiLifeSupabase &&
        window.__famiLifeSupabaseUrl === url &&
        window.__famiLifeSupabaseKey === key) {
        supabase = window.__famiLifeSupabase;
        currentUrl = url;
        currentKey = key;
        return supabase;
    }

    // Kiểm tra module-level cache (fast path cho lần gọi thứ 2 trở đi)
    if (supabase && url === currentUrl && key === currentKey) {
        return supabase;
    }

    try {
        supabase = window.supabase ? window.supabase.createClient(url, key) : null;
        if (supabase) {
            currentUrl = url;
            currentKey = key;
            // Lưu lên window để tồn tại xuyên suốt module re-execution
            window.__famiLifeSupabase = supabase;
            window.__famiLifeSupabaseUrl = url;
            window.__famiLifeSupabaseKey = key;
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


// Fetch sync data row by another user's email (for wife to re-fetch husband's row after sync)
export async function getSyncDataByEmail(email) {
    if (!supabase) throw new Error("Chưa cấu hình kết nối Supabase");
    const { data, error } = await supabase
        .from('gift_sync')
        .select('user_id, encrypted_data, public_key, user_email')
        .eq('user_email', email.toLowerCase().trim())
        .maybeSingle();
    if (error) {
        console.error("Error fetching sync data by email:", error);
        throw new Error("Lỗi khi tải dữ liệu đối tác: " + error.message);
    }
    return data;
}

// Save encrypted data to gift_sync table (insert or update)
// publicKey: optional RSA public key string to publish (prevents circular import of state)
export async function saveSyncData(encryptedData, publicKey = null) {
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
            public_key: publicKey
        });

    if (error) {
        console.error("Error saving sync data:", error);
        throw new Error("Lỗi khi đồng bộ dữ liệu lên máy chủ: " + error.message);
    }
    return data;
}
