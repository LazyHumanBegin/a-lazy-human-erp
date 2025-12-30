# Ez.Smart v2.3.1 Testing Checklist

**Tester:** _______________  
**Date:** _______________  
**Device/Browser:** _______________

---

## 🔄 Data Sync Testing

| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Create customer on Device A → appears on Device B | ☐ | ☐ | |
| Create transaction on A → syncs to B | ☐ | ☐ | |
| Delete transaction on A → deleted on B after refresh | ☐ | ☐ | |
| Void order on A → stock reversal syncs to B | ☐ | ☐ | |
| Edit inventory on A → updates on B | ☐ | ☐ | |
| Offline mode → make changes → go online → auto-sync | ☐ | ☐ | |
| Conflict resolution (edit same item on A & B) | ☐ | ☐ | |

---

## 🍽️ POS Testing

### Dine-in Flow
| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Create new table | ☐ | ☐ | |
| Open table → add items | ☐ | ☐ | |
| Send to kitchen | ☐ | ☐ | |
| Mark items as served | ☐ | ☐ | |
| Print bill | ☐ | ☐ | |
| Complete payment (Cash) | ☐ | ☐ | |
| Complete payment (Card) | ☐ | ☐ | |
| Complete payment (E-wallet) | ☐ | ☐ | |
| Table merge | ☐ | ☐ | |
| Table transfer | ☐ | ☐ | |
| Split bill | ☐ | ☐ | |

### Takeaway Flow
| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Create takeaway order | ☐ | ☐ | |
| Add items with modifiers | ☐ | ☐ | |
| Apply discount | ☐ | ☐ | |
| Complete payment | ☐ | ☐ | |
| Order appears in history | ☐ | ☐ | |

### Delivery/Platform Orders
| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Create GrabFood order | ☐ | ☐ | |
| Commission calculated correctly | ☐ | ☐ | |
| Create FoodPanda order | ☐ | ☐ | |
| Create ShopeeFood order | ☐ | ☐ | |
| Platform commission shows in reports | ☐ | ☐ | |
| Edit commission rates in Settings | ☐ | ☐ | |

### Order Management
| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Cancel order (before payment) | ☐ | ☐ | |
| Void order (after payment) | ☐ | ☐ | |
| Void reverses stock correctly | ☐ | ☐ | |
| Void creates reversal transaction | ☐ | ☐ | |
| Filter orders by "Voided" status | ☐ | ☐ | |
| Voided orders excluded from stats | ☐ | ☐ | |

---

## 📦 Inventory Testing

| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Add new product | ☐ | ☐ | |
| Edit product details | ☐ | ☐ | |
| Delete product | ☐ | ☐ | |
| Stock adjustment (+) | ☐ | ☐ | |
| Stock adjustment (-) | ☐ | ☐ | |
| Low stock alert triggers | ☐ | ☐ | |
| Stock deducted after sale | ☐ | ☐ | |
| Stock restored after void | ☐ | ☐ | |

---

## 💰 Transactions Testing

| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Add income transaction | ☐ | ☐ | |
| Add expense transaction | ☐ | ☐ | |
| Edit transaction | ☐ | ☐ | |
| Delete transaction | ☐ | ☐ | |
| Deleted transaction stays deleted after refresh | ☐ | ☐ | |
| Filter by date range | ☐ | ☐ | |
| Filter by category | ☐ | ☐ | |
| Export transactions | ☐ | ☐ | |

---

## 📊 Reports Testing

| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Dashboard totals correct | ☐ | ☐ | |
| Sales report accurate | ☐ | ☐ | |
| Profit/Loss report accurate | ☐ | ☐ | |
| Sales Channel report (platform commissions) | ☐ | ☐ | |
| Inventory report | ☐ | ☐ | |
| Export to PDF | ☐ | ☐ | |

---

## 👥 Multi-tenant Testing

| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Create new tenant | ☐ | ☐ | |
| Switch between tenants | ☐ | ☐ | |
| Data isolation (Tenant A can't see Tenant B) | ☐ | ☐ | |
| Delete tenant | ☐ | ☐ | |

---

## 🌐 Cross-Browser Testing

| Browser | Version | Pass | Fail | Notes |
|---------|---------|:----:|:----:|-------|
| Chrome (Desktop) | | ☐ | ☐ | |
| Safari (macOS) | | ☐ | ☐ | |
| Safari (iOS) | | ☐ | ☐ | |
| Chrome (Android) | | ☐ | ☐ | |
| Firefox | | ☐ | ☐ | |
| Edge | | ☐ | ☐ | |

---

## ⚡ Performance Testing

| Test Case | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| App loads in < 3 seconds | ☐ | ☐ | |
| 100+ orders - no lag | ☐ | ☐ | |
| 500+ transactions - no lag | ☐ | ☐ | |
| 200+ inventory items - no lag | ☐ | ☐ | |
| Rapid create/delete cycles stable | ☐ | ☐ | |

---

## 🐛 Bug Log

| # | Date | Description | Steps to Reproduce | Severity | Status |
|---|------|-------------|-------------------|----------|--------|
| 1 | | | | 🔴 High / 🟡 Med / 🟢 Low | Open / Fixed |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

---

## 📝 Feature Requests / Improvements

| # | Description | Priority | Notes |
|---|-------------|----------|-------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## ✅ Sign-off

| Milestone | Date | Tester | Approved |
|-----------|------|--------|----------|
| Closed Beta Ready | | | ☐ |
| Open Beta Ready | | | ☐ |
| Production Ready | | | ☐ |

---

**Legend:**
- 🔴 **High** - Blocks core functionality, must fix before release
- 🟡 **Medium** - Affects user experience, fix before open beta
- 🟢 **Low** - Minor issue, can fix post-release
