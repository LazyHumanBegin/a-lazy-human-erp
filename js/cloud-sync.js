// ============================================
// A LAZY HUMAN ERP - CLOUD SYNC MODULE
// Syncs localStorage data to Supabase cloud
// ============================================

const CloudSync = {
    syncInProgress: false,
    lastSyncTime: null,
    syncInterval: null,
    realtimeChannels: [],

    // Data keys to sync to cloud
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
        'company_settings'
    ],

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        console.log('☁️ Initializing Cloud Sync...');
        
        // Wait for Supabase to be ready
        if (!window.SupabaseConfig) {
            console.warn('⚠️ Supabase not loaded, retrying in 1s...');
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
        
        if (!tenantId) {
            this.syncInProgress = false;
            return { success: false, reason: 'no_tenant' };
        }

        console.log('☁️ Downloading data from cloud...');

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
