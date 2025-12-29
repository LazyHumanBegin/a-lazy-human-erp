/**
 * EZ CUBIC Tenant Module - Index
 * Re-exports all tenant functions for module imports
 * 
 * @version 2028010
 * @date 2025-01-01
 */

// All tenant functions are exposed on window by tenant.js
// This index file is for future ES6 module support

export {
    generateCompanyCode,
    migrateFounderData,
    downloadTenantInfoFromCloud,
    downloadTenantFromCloud,
    loadUserTenantData,
    initializeEmptyTenantData,
    syncTenantDataToCloud,
    resetToEmptyData,
    resetWindowArraysOnly
} from './tenant.js';
