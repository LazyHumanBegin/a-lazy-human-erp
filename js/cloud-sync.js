// ============================================
// A LAZY HUMAN ERP - CLOUD SYNC MODULE
// Syncs localStorage data to Supabase cloud
// ============================================

const CloudSync = {
    syncInProgress: false,
    lastSyncTime: null,
    syncInterval: null,
    realtimeChannels: [],

    // Data keys to sync to cloud (tenant-specific data)
    syncableKeys: [
        'customers',
        'invoices', 
        'bills',
        'transactions',
        'products',
        'suppliers',
        'quotations',
        'orders',
        'projects',
        'journal_entries',
        'chart_of_accounts',
        'tax_settings',
        'company_settings',
        'employees',
        'payroll',
        'stockMovements'
    ],

    // Global keys (shared across all devices, not tenant-specific)
    globalSyncKeys: [
        'ezcubic_users',      // User accounts - CRITICAL for multi-device login
        'ezcubic_tenants'     // Tenant registry
    ],

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        console.log('☁️ Initializing Cloud Sync...');
        
        // Wait for Supabase to be ready (silent retry)
        if (!window.SupabaseConfig) {
            setTimeout(() => this.init(), 1000);
            return;
        }

        // Initialize Supabase
        window.SupabaseConfig.init();

        // Check if user is logged into cloud
        const session = await window.SupabaseConfig.getSession();
        if (session) {
            console.log('☁️ Cloud session found, enabling sync');
            this.startAutoSync();
            this.setupRealtimeSync();
        }

        // Listen for auth changes
        window.SupabaseConfig.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.startAutoSync();
                this.setupRealtimeSync();
            } else if (event === 'SIGNED_OUT') {
                this.stopAutoSync();
                this.cleanupRealtimeSync();
            }
        });

        console.log('☁️ Cloud Sync initialized');
    },

    // ============================================
    // GLOBAL DATA SYNC (Users, Tenants - shared across devices)
    // ============================================

    // Upload global data (users, tenants) to cloud - CRITICAL for multi-device
    // Also uploads deletion tracking to ensure deleted data stays deleted across devices
    async uploadGlobalData() {
        console.log('☁️ Uploading global data (users, tenants)...');
        const results = [];

        try {
            // Upload main global data (users, tenants)
            for (const key of this.globalSyncKeys) {
                const localData = localStorage.getItem(key);
                if (localData) {
                    const { data, error } = await window.SupabaseConfig.getClient()
                        .from('tenant_data')
                        .upsert({
                            tenant_id: 'global',  // Use 'global' for shared data
                            data_key: key,
                            data: {
                                key: key,
                                value: JSON.parse(localData),
                                synced_at: new Date().toISOString()
                            },
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'tenant_id,data_key'
                        });

                    if (error) {
                        console.error(`❌ Failed to upload ${key}:`, error);
                        results.push({ key, success: false, error: error.message });
                    } else {
                        console.log(`☁️ Uploaded global: ${key}`);
                        results.push({ key, success: true });
                    }
                }
            }
            
            // CRITICAL: Also upload deletion tracking lists
            const deletionKeys = ['ezcubic_deleted_users', 'ezcubic_deleted_tenants'];
            for (const key of deletionKeys) {
                const localData = localStorage.getItem(key);
                if (localData) {
                    const parsed = JSON.parse(localData);
                    if (parsed && parsed.length > 0) {
                        const { error } = await window.SupabaseConfig.getClient()
                            .from('tenant_data')
                            .upsert({
                                tenant_id: 'global',
                                data_key: key,
                                data: {
                                    key: key,
                                    value: parsed,
                                    synced_at: new Date().toISOString()
                                },
                                updated_at: new Date().toISOString()
                            }, {
                                onConflict: 'tenant_id,data_key'
                            });
                        
                        if (error) {
                            console.error(`❌ Failed to upload ${key}:`, error);
                        } else {
                            console.log(`☁️ Uploaded deletion tracking: ${key}`);
                        }
                    }
                }
            }
            
            return { success: true, results };
        } catch (error) {
            console.error('❌ Global upload error:', error);
            return { success: false, error: error.message };
        }
    },

    // Download global data from cloud (users, tenants)
    // CRITICAL: Downloads deletion tracking FIRST before processing users
    async downloadGlobalData() {
        console.log('☁️ Downloading global data (users, tenants)...');

        try {
            const { data, error } = await window.SupabaseConfig.getClient()
                .from('tenant_data')
                .select('*')
                .eq('tenant_id', 'global');

            if (error) throw error;

            if (data && data.length > 0) {
                // ====== STEP 1: Process deletion tracking FIRST ======
                let cloudDeletedUsers = [];
                let cloudDeletedTenants = [];
                
                for (const record of data) {
                    const key = record.data?.key || record.data_key;
                    const value = record.data?.value;
                    
                    if (key === 'ezcubic_deleted_users' && value) {
                        cloudDeletedUsers = value;
                        console.log('  📥 Found cloud deleted users:', cloudDeletedUsers.length);
                    }
                    if (key === 'ezcubic_deleted_tenants' && value) {
                        cloudDeletedTenants = value;
                        console.log('  📥 Found cloud deleted tenants:', cloudDeletedTenants.length);
                    }
                }
                
                // Merge local + cloud deletion tracking
                const localDeletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
                const localDeletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
                
                const mergedDeletedUsers = [...new Set([...localDeletedUsers, ...cloudDeletedUsers])];
                const mergedDeletedTenants = [...new Set([...localDeletedTenants, ...cloudDeletedTenants])];
                
                localStorage.setItem('ezcubic_deleted_users', JSON.stringify(mergedDeletedUsers));
                localStorage.setItem('ezcubic_deleted_tenants', JSON.stringify(mergedDeletedTenants));
                
                console.log('  🗑️ Merged deleted users tracking:', mergedDeletedUsers.length);
                console.log('  🗑️ Merged deleted tenants tracking:', mergedDeletedTenants.length);
                
                // ====== STEP 2: Now process users and tenants (with updated deletion tracking) ======
                for (const record of data) {
                    const key = record.data?.key || record.data_key;
                    const value = record.data?.value;
                    
                    if (key && value && this.globalSyncKeys.includes(key)) {
                        // Merge users intelligently (don't overwrite, add missing)
                        if (key === 'ezcubic_users') {
                            await this.mergeUsers(value);
                        } else {
                            localStorage.setItem(key, JSON.stringify(value));
                        }
                        console.log(`📥 Downloaded global: ${key}`);
                    }
                }
            }

            console.log('✅ Global download complete');
            return { success: true };
        } catch (error) {
            console.error('❌ Global download error:', error);
            return { success: false, error: error.message };
        }
    },

    // Merge users from cloud with local (avoid duplicates, newer wins)
    // CRITICAL: Respects deletion tracking to prevent deleted users from coming back
    async mergeUsers(cloudUsers) {
        // Get deletion tracking lists
        const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
        const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
        
        const localUsersStr = localStorage.getItem('ezcubic_users');
        let localUsers = localUsersStr ? JSON.parse(localUsersStr) : [];
        
        // FIRST: Filter out deleted users from local
        localUsers = localUsers.filter(u => {
            const isDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
            const isTenantDeleted = u.tenantId && deletedTenants.includes(u.tenantId);
            if (isDeleted || isTenantDeleted) {
                console.log(`🗑️ Removing deleted local user: ${u.email}`);
                return false;
            }
            return true;
        });
        
        // Create map of local users by ID
        const userMap = new Map();
        localUsers.forEach(u => userMap.set(u.id, u));
        
        // Merge cloud users (skip deleted ones)
        let updated = false;
        for (const cloudUser of cloudUsers) {
            // CRITICAL: Skip deleted users
            const isDeleted = deletedUsers.includes(cloudUser.id) || deletedUsers.includes(cloudUser.email);
            const isTenantDeleted = cloudUser.tenantId && deletedTenants.includes(cloudUser.tenantId);
            if (isDeleted || isTenantDeleted) {
                console.log(`🗑️ Skipping deleted cloud user: ${cloudUser.email}`);
                continue;
            }
            
            const localUser = userMap.get(cloudUser.id);
            
            if (!localUser) {
                // New user from cloud - add it
                userMap.set(cloudUser.id, cloudUser);
                updated = true;
                console.log(`👤 Added user from cloud: ${cloudUser.email}`);
            } else {
                // User exists - compare timestamps, newer wins
                const localTime = new Date(localUser.updatedAt || localUser.createdAt || 0);
                const cloudTime = new Date(cloudUser.updatedAt || cloudUser.createdAt || 0);
                
                if (cloudTime > localTime) {
                    userMap.set(cloudUser.id, cloudUser);
                    updated = true;
                    console.log(`👤 Updated user from cloud: ${cloudUser.email}`);
                }
            }
        }
        
        if (updated) {
            const mergedUsers = Array.from(userMap.values());
            localStorage.setItem('ezcubic_users', JSON.stringify(mergedUsers));
            
            // Reload users array if the function exists
            if (typeof window.loadUsers === 'function') {
                window.loadUsers();
            }
        }
    },

    // Sync users immediately (call after creating/updating user)
    async syncUsersNow() {
        console.log('🔄 Syncing users to cloud...');
        await this.uploadGlobalData();
    },

    // ============================================
    // SYNC OPERATIONS
    // ============================================

    // Upload all local data to cloud
    async uploadToCloud() {
        if (this.syncInProgress) {
            console.log('⏳ Sync already in progress...');
            return { success: false, reason: 'sync_in_progress' };
        }

        this.syncInProgress = true;
        const tenantId = this.getCurrentTenantId();
        
        if (!tenantId) {
            this.syncInProgress = false;
            return { success: false, reason: 'no_tenant' };
        }

        console.log('☁️ Uploading data to cloud...');
        const results = [];

        try {
            // Upload global data first (users, tenants)
            await this.uploadGlobalData();

            // Then upload tenant-specific data
            for (const key of this.syncableKeys) {
                const localData = localStorage.getItem(`${tenantId}_${key}`);
                if (localData) {
                    const result = await window.SupabaseConfig.saveTenantData(
                        tenantId,
                        'tenant_data',
                        {
                            key: key,
                            value: JSON.parse(localData),
                            synced_at: new Date().toISOString()
                        }
                    );
                    results.push({ key, success: result.success });
                }
            }

            this.lastSyncTime = new Date();
            localStorage.setItem('lastCloudSync', this.lastSyncTime.toISOString());
            
            console.log('✅ Upload complete:', results);
            this.syncInProgress = false;
            return { success: true, results };
        } catch (error) {
            console.error('❌ Upload error:', error);
            this.syncInProgress = false;
            return { success: false, error: error.message };
        }
    },

    // Download cloud data to local
    async downloadFromCloud() {
        if (this.syncInProgress) {
            console.log('⏳ Sync already in progress...');
            return { success: false, reason: 'sync_in_progress' };
        }

        this.syncInProgress = true;
        const tenantId = this.getCurrentTenantId();
        
        // Always download global data first (users needed for login)
        await this.downloadGlobalData();

        if (!tenantId) {
            this.syncInProgress = false;
            return { success: true, reason: 'global_only' };
        }

        console.log('☁️ Downloading tenant data from cloud...');

        try {
            const { data, error } = await window.SupabaseConfig.getClient()
                .from('tenant_data')
                .select('*')
                .eq('tenant_id', tenantId);

            if (error) throw error;

            if (data && data.length > 0) {
                for (const record of data) {
                    const key = record.data.key;
                    const value = record.data.value;
                    
                    if (this.syncableKeys.includes(key)) {
                        localStorage.setItem(`${tenantId}_${key}`, JSON.stringify(value));
                        console.log(`📥 Downloaded: ${key}`);
                    }
                }
            }

            this.lastSyncTime = new Date();
            localStorage.setItem('lastCloudSync', this.lastSyncTime.toISOString());
            
            console.log('✅ Download complete');
            this.syncInProgress = false;
            return { success: true };
        } catch (error) {
            console.error('❌ Download error:', error);
            this.syncInProgress = false;
            return { success: false, error: error.message };
        }
    },

    // Two-way sync (merge local and cloud)
    async syncBidirectional() {
        console.log('🔄 Starting bidirectional sync...');
        
        const tenantId = this.getCurrentTenantId();
        if (!tenantId) return { success: false, reason: 'no_tenant' };

        try {
            // Get cloud data
            const { data: cloudData, error } = await window.SupabaseConfig.getClient()
                .from('tenant_data')
                .select('*')
                .eq('tenant_id', tenantId);

            if (error) throw error;

            const cloudMap = {};
            if (cloudData) {
                cloudData.forEach(record => {
                    if (record.data && record.data.key) {
                        cloudMap[record.data.key] = {
                            value: record.data.value,
                            synced_at: record.data.synced_at || record.updated_at
                        };
                    }
                });
            }

            // Compare and sync each key
            for (const key of this.syncableKeys) {
                const localDataStr = localStorage.getItem(`${tenantId}_${key}`);
                const cloudRecord = cloudMap[key];
                const localLastModified = localStorage.getItem(`${tenantId}_${key}_lastModified`);

                if (localDataStr && !cloudRecord) {
                    // Local only - upload
                    await this.uploadKey(tenantId, key, JSON.parse(localDataStr));
                } else if (!localDataStr && cloudRecord) {
                    // Cloud only - download
                    localStorage.setItem(`${tenantId}_${key}`, JSON.stringify(cloudRecord.value));
                } else if (localDataStr && cloudRecord) {
                    // Both exist - compare timestamps
                    const localTime = localLastModified ? new Date(localLastModified) : new Date(0);
                    const cloudTime = new Date(cloudRecord.synced_at);

                    if (localTime > cloudTime) {
                        // Local is newer - upload
                        await this.uploadKey(tenantId, key, JSON.parse(localDataStr));
                    } else if (cloudTime > localTime) {
                        // Cloud is newer - download
                        localStorage.setItem(`${tenantId}_${key}`, JSON.stringify(cloudRecord.value));
                    }
                }
            }

            this.lastSyncTime = new Date();
            localStorage.setItem('lastCloudSync', this.lastSyncTime.toISOString());
            
            console.log('✅ Bidirectional sync complete');
            return { success: true };
        } catch (error) {
            console.error('❌ Sync error:', error);
            return { success: false, error: error.message };
        }
    },

    // Upload single key
    async uploadKey(tenantId, key, value) {
        const { data, error } = await window.SupabaseConfig.getClient()
            .from('tenant_data')
            .upsert({
                tenant_id: tenantId,
                data_key: key,
                data: {
                    key: key,
                    value: value,
                    synced_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'tenant_id,data_key'
            });

        if (error) {
            console.error(`❌ Failed to upload ${key}:`, error);
        } else {
            console.log(`☁️ Uploaded: ${key}`);
        }
    },

    // ============================================
    // AUTO SYNC
    // ============================================

    startAutoSync(intervalMs = 60000) { // Default: every 1 minute
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        console.log(`🔄 Auto-sync started (every ${intervalMs/1000}s)`);
        
        // Initial sync
        setTimeout(() => this.syncBidirectional(), 2000);

        // Periodic sync
        this.syncInterval = setInterval(() => {
            if (window.SupabaseConfig.isCloudMode()) {
                this.syncBidirectional();
            }
        }, intervalMs);
    },

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ Auto-sync stopped');
        }
    },

    // ============================================
    // REALTIME SYNC
    // ============================================

    setupRealtimeSync() {
        const tenantId = this.getCurrentTenantId();
        if (!tenantId) return;

        console.log('📡 Setting up realtime sync...');

        // Subscribe to changes in tenant_data table
        const channel = window.SupabaseConfig.subscribeToTable(
            'tenant_data',
            tenantId,
            (payload) => {
                this.handleRealtimeUpdate(payload);
            }
        );

        this.realtimeChannels.push(channel);
    },

    cleanupRealtimeSync() {
        for (const channel of this.realtimeChannels) {
            window.SupabaseConfig.unsubscribeFromChannel(channel);
        }
        this.realtimeChannels = [];
        console.log('📡 Realtime sync cleaned up');
    },

    handleRealtimeUpdate(payload) {
        console.log('📡 Received realtime update:', payload.eventType);
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new;
            if (record && record.data && record.data.key) {
                const tenantId = this.getCurrentTenantId();
                const key = record.data.key;
                const value = record.data.value;
                
                // Update local storage
                localStorage.setItem(`${tenantId}_${key}`, JSON.stringify(value));
                console.log(`📥 Realtime update applied: ${key}`);
                
                // Trigger UI refresh if needed
                if (typeof window.refreshCurrentView === 'function') {
                    window.refreshCurrentView();
                }
            }
        }
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    getCurrentTenantId() {
        // Get from current session or localStorage
        const session = JSON.parse(localStorage.getItem('erpSession') || '{}');
        return session.tenantId || localStorage.getItem('currentTenantId') || null;
    },

    getLastSyncTime() {
        const stored = localStorage.getItem('lastCloudSync');
        return stored ? new Date(stored) : null;
    },

    getSyncStatus() {
        return {
            inProgress: this.syncInProgress,
            lastSync: this.getLastSyncTime(),
            autoSyncEnabled: !!this.syncInterval,
            cloudModeEnabled: window.SupabaseConfig?.isCloudMode() || false
        };
    },

    // Mark data as modified (for sync tracking)
    markModified(key) {
        const tenantId = this.getCurrentTenantId();
        if (tenantId) {
            localStorage.setItem(`${tenantId}_${key}_lastModified`, new Date().toISOString());
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => CloudSync.init(), 500);
    });
} else {
    setTimeout(() => CloudSync.init(), 500);
}

// Export for global access
window.CloudSync = CloudSync;

console.log('🐱 Cloud Sync module loaded');
