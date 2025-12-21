-- ============================================
-- A LAZY HUMAN ERP - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable Row Level Security (RLS) for multi-tenant isolation
-- This ensures each tenant only sees their own data

-- ============================================
-- 1. TENANTS TABLE
-- Stores company/business information
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    ssm_number VARCHAR(50),
    tax_number VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. USERS TABLE
-- Stores user accounts linked to tenants
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) REFERENCES tenants(tenant_id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    permissions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TENANT DATA TABLE
-- Stores all tenant-specific data (flexible JSON)
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    data_key VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, data_key)
);

-- ============================================
-- 4. SYNC LOG TABLE
-- Tracks sync history for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    data_key VARCHAR(100),
    status VARCHAR(20) DEFAULT 'success',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data isolation between tenants
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Tenants: Users can only see their own tenant
CREATE POLICY "Users can view own tenant" ON tenants
    FOR SELECT USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own tenant" ON tenants
    FOR UPDATE USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

-- Users: Can see users in same tenant
CREATE POLICY "Users can view same tenant users" ON users
    FOR SELECT USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth_id = auth.uid());

-- Tenant Data: Full access to own tenant's data
CREATE POLICY "Users can view own tenant data" ON tenant_data
    FOR SELECT USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own tenant data" ON tenant_data
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own tenant data" ON tenant_data
    FOR UPDATE USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own tenant data" ON tenant_data
    FOR DELETE USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

-- Sync Log: View own tenant's sync history
CREATE POLICY "Users can view own sync log" ON sync_log
    FOR SELECT USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own sync log" ON sync_log
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_id = auth.uid()
        )
    );

-- ============================================
-- ALLOW ANONYMOUS ACCESS FOR INITIAL TESTING
-- Remove these in production!
-- ============================================

-- Temporary: Allow anonymous insert for tenant_data (testing only)
CREATE POLICY "Anon can insert tenant_data" ON tenant_data
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can select tenant_data" ON tenant_data
    FOR SELECT USING (true);

CREATE POLICY "Anon can update tenant_data" ON tenant_data
    FOR UPDATE USING (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenant_data_tenant ON tenant_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_data_key ON tenant_data(data_key);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant ON sync_log(tenant_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_data_updated_at
    BEFORE UPDATE ON tenant_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_data;

-- ============================================
-- DONE! Your database is ready 🐱
-- ============================================
