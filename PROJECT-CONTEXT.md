# Ez.Smart Project Context

> **Quick Start for New Conversations:**  
> "Read PROJECT-CONTEXT.md first, then help me with [your task]"

---

## 📋 Project Overview

| Field | Value |
|-------|-------|
| **Name** | Ez.Smart |
| **Version** | v2.3.1 |
| **Type** | Multi-tenant ERP/POS SaaS |
| **Target** | Small businesses, F&B restaurants, retail |
| **Stack** | Vanilla JS (no framework), HTML, CSS |
| **Cloud** | Supabase (auth + storage + sync) |
| **Hosting** | Netlify (auto-deploys from GitHub) |
| **GitHub** | LazyHumanBegin/a-lazy-human-erp |

---

## 🏗️ Architecture

### Single-Page Application
- One HTML file: `Ez.Smart.v2.1.html`
- Modular JS files in `/js/` folder
- All styling in `style.css`

### Multi-Tenant System
- Each tenant has isolated data
- Data stored in localStorage per tenant
- Cloud sync via Supabase for cross-device access
- Tenant management in `/js/tenant/`

### Data Flow
```
User Action → JS Module → localStorage (tenant-specific) → CloudSync → Supabase
```

---

## 📁 File Structure

```
Ez.Smart.v2.1/
├── Ez.Smart.v2.1.html    # Main app (6,918 lines)
├── style.css             # All styles (15,838 lines)
├── PROJECT-CONTEXT.md    # This file
├── TESTING-CHECKLIST.md  # Testing guide
├── images/               # Static assets
└── js/
    ├── app.js            # App initialization
    ├── core.js           # Core utilities
    ├── data.js           # Data management
    ├── ui.js             # UI utilities
    ├── dashboard.js      # Dashboard module
    ├── pos.js            # Point of Sale (2,598 lines)
    ├── orders.js         # Order management (791 lines)
    ├── inventory.js      # Inventory/stock
    ├── transactions.js   # Financial transactions (823 lines)
    ├── customers.js      # Customer management
    ├── crm.js            # CRM features
    ├── reports.js        # Business reports
    ├── charts.js         # Chart visualizations
    ├── balance-sheet.js  # Balance sheet
    ├── bills.js          # Bills management
    ├── quotations.js     # Quotations
    ├── projects.js       # Project tracking
    ├── stock.js          # Stock operations
    ├── taxes.js          # Tax calculations
    ├── pdf-export.js     # PDF generation
    ├── ai-assistant.js   # AI helper (2,839 lines)
    ├── chatbot.js        # Chatbot interface
    └── tenant/
        └── tenant.js     # Multi-tenant logic
```

### Codebase Size (as of v2.3.1)
- **Total Lines:** ~93,500
- **JS:** 65,166 lines (23 files)
- **HTML:** 6,918 lines
- **CSS:** 15,838 lines
- **Largest Files:** platform-control.js (3,340), ai-assistant.js (2,839), pos.js (2,598)

---

## ✅ Completed Features (v2.3.1)

### Core Modules
- ✅ Dashboard with analytics
- ✅ Customer management (CRUD, search, history)
- ✅ Inventory management (products, categories, stock tracking)
- ✅ Transaction management (income/expense, categories)
- ✅ Reports (sales, P&L, inventory, balance sheet)
- ✅ PDF export for all reports
- ✅ Multi-tenant support

### POS System
- ✅ Dine-in with table management
- ✅ Takeaway orders
- ✅ Delivery orders
- ✅ Platform orders (GrabFood, FoodPanda, ShopeeFood)
- ✅ Editable platform commission rates
- ✅ Kitchen display (KDS)
- ✅ Table merge/transfer/split
- ✅ Multiple payment methods
- ✅ Order void (with stock reversal)
- ✅ Order cancel

### Cloud & Sync
- ✅ Supabase authentication
- ✅ Cloud data storage
- ✅ Multi-device sync
- ✅ Offline mode with sync on reconnect

---

## 🔧 Key Technical Decisions

### Why Vanilla JS?
- No build step required
- Direct browser deployment
- Smaller footprint for target users
- Easier maintenance for solo developer

### Why localStorage + Cloud Sync?
- Offline-first architecture
- Fast local operations
- Cloud backup for multi-device
- Graceful degradation without internet

### Multi-Tenant Data Isolation
```javascript
// Data stored per tenant
localStorage.setItem(`tenant_${tenantId}_data`, JSON.stringify(data))
```

### Cloud Sync Pattern
```javascript
// After critical operations (delete, void, etc.)
CloudSync.uploadToCloud()  // Force immediate sync
```

---

## 🐛 Known Issues / Watchlist

### Fixed in v2.3.1
- ✅ Transaction deletion not persisting (came back after refresh)
- ✅ Stock not reverting on void

### Code Size Watchlist
- `platform-control.js` (3,340 lines) - closest to 4K threshold
- Alert when any JS file exceeds 4,000 lines
- Alert when CSS exceeds 20,000 lines

---

## 🔄 Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| v2.3.1 | 2024-12-30 | Void order, transaction delete fix, editable commissions |
| v2.3.0 | 2024-12-30 | POS table management, order types, platform orders |
| v2.2.x | Earlier | Core ERP features, multi-tenant |

---

## 🚀 Deployment

### GitHub Push
```bash
cd "/Users/jeremy/Desktop/EZ CUBIC/Balance Sheet/Ez.Smart.v2.1"
git add -A
git commit -m "v2.3.x - description"
git push origin main
```

### Netlify
- Auto-deploys from GitHub `main` branch
- No manual deployment needed

### Local Development
```bash
cd "/Users/jeremy/Desktop/EZ CUBIC/Balance Sheet/Ez.Smart.v2.1"
python3 -m http.server 8890
# Open http://localhost:8890
```

---

## 📊 Market Readiness (as of v2.3.1)

| Stage | Readiness | Notes |
|-------|-----------|-------|
| Closed Beta | 95% | Ready for 5-10 trusted users |
| Open Beta | 75% | Need 4-6 weeks closed beta first |
| Market Release | 55% | Need payment gateway, terms, security |

---

## 💡 Future Roadmap

### High Priority
- [ ] Payment gateway integration (Stripe/local)
- [ ] User onboarding flow
- [ ] Terms of service / Privacy policy
- [ ] Security audit

### Medium Priority
- [ ] Mobile app (PWA enhancement)
- [ ] API for third-party integrations
- [ ] Advanced analytics
- [ ] Multi-language support

### Low Priority
- [ ] White-label options
- [ ] Marketplace for plugins
- [ ] Advanced AI features

---

## 🔑 Important Variables & Functions

### Global Window Exports
```javascript
// POS
window.getPlatformCommissions()
window.savePlatformCommissions(commissions)

// Orders
window.voidOrder(orderId)

// Transactions
window.deleteTransaction(transactionId)
window.confirmDeleteTransaction(transactionId)

// Cloud
window.CloudSync.uploadToCloud()
window.CloudSync.downloadFromCloud()
```

### Tenant Data Access
```javascript
// Get current tenant ID
const tenantId = getCurrentTenantId()

// Get tenant data
const data = getTenantData(tenantId)

// Save tenant data (use for critical operations)
saveTenantData(tenantId, data)
```

---

## 📞 Quick Reference

### Common Tasks

**Add a new module:**
1. Create `js/newmodule.js`
2. Add `<script src="js/newmodule.js"></script>` in HTML
3. Export functions to window if needed

**Add UI section:**
1. Add HTML section in `Ez.Smart.v2.1.html`
2. Add navigation link
3. Add styles in `style.css`
4. Add JS logic

**Debug cloud sync:**
```javascript
console.log(localStorage.getItem(`tenant_${tenantId}_data`))
CloudSync.uploadToCloud()
```

---

*Last Updated: December 30, 2024*
*Version: 2.3.1*
