# EZCubic ERP v2.1 - Code Cleanup Tasks

**Created:** 20 December 2025  
**Status:** For future maintenance  

---

## 🔴 Priority 1: Remove Unused Files

### Task 1.1: Delete unused inventory.js
- **File:** `js/inventory.js`
- **Reason:** `inventory-new.js` is loaded instead
- **Action:** Delete file
- **Risk:** None
- **Time:** 5 minutes

---

## 🟡 Priority 2: Consolidate Utility Functions

### Task 2.1: formatDate() - 13 duplicates!
**Files containing duplicates:**
- aging-reports.js
- branches.js
- core.js ← **KEEP THIS ONE**
- delivery-orders.js
- e-invoice.js
- hr-modules.js
- journal-entries.js
- leave-attendance.js
- multi-tenant.js
- payroll.js
- purchase-orders.js
- quotations.js
- stock.js
- suppliers.js

**Action:** Remove function from all files except core.js

---

### Task 2.2: escapeHTML() / escapeHtml() - 6 duplicates
**Files containing duplicates:**
- branches.js
- core.js ← **KEEP THIS ONE**
- e-invoice.js
- kpi.js
- leave-attendance.js
- purchase-orders.js

**Action:** Remove function from all files except core.js

---

### Task 2.3: showNotification() - 5 duplicates
**Files containing duplicates:**
- branches.js
- core.js ← **KEEP THIS ONE**
- e-invoice.js
- leave-attendance.js
- purchase-orders.js

**Action:** Remove function from all files except core.js

---

### Task 2.4: formatDateTime() - 3 duplicates
**Files containing duplicates:**
- e-invoice.js
- journal-entries.js
- multi-tenant.js

**Action:** Move to core.js, remove from other files

---

### Task 2.5: formatCurrency() - 2 duplicates
**Files containing duplicates:**
- core.js ← **KEEP THIS ONE**
- kpi.js

**Action:** Remove from kpi.js

---

### Task 2.6: generateUUID() - 2 duplicates
**Files containing duplicates:**
- core.js ← **KEEP THIS ONE**
- e-invoice.js

**Action:** Remove from e-invoice.js

---

## 🟢 Priority 3: Other Duplicates (Lower Priority)

These functions are duplicated but may have slight variations. Review before removing:

| Function | Files |
|----------|-------|
| `capitalizeFirst()` | Check all files |
| `getInitials()` | Check all files |
| `formatNumber()` | Check all files |
| `formatRM()` | Check all files |
| `generateUniqueId()` | Check all files |
| `validateTaxInput()` | Check all files |
| `quickAddIncome()` | Check all files |
| `quickAddExpense()` | Check all files |

---

## 📝 How to Clean Up Safely

### Step 1: Backup First
```bash
cp -r Ez.Smart.v2.1 Ez.Smart.v2.1-backup
```

### Step 2: Ensure core.js loads FIRST
Check `Ez.Smart.v2.1.html` script order:
```html
<script src="js/core.js"></script>  <!-- Must be early -->
```

### Step 3: Add window exports to core.js
```javascript
// At end of core.js
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatCurrency = formatCurrency;
window.escapeHTML = escapeHTML;
window.showNotification = showNotification;
window.generateUUID = generateUUID;
```

### Step 4: Remove duplicates from other files
Delete the function definitions, keep the function calls.

### Step 5: Test each module
After each file change, test that module still works.

---

## ⚠️ Important Notes

1. **Don't do this before going live** - Risk of breaking something
2. **Test after each change** - One file at a time
3. **Keep backup** - Easy rollback if something breaks
4. **Check function signatures** - Some duplicates may have different parameters

---

## ✅ Completed Cleanup Tasks

- [ ] Task 1.1: Delete inventory.js
- [ ] Task 2.1: Consolidate formatDate()
- [ ] Task 2.2: Consolidate escapeHTML()
- [ ] Task 2.3: Consolidate showNotification()
- [ ] Task 2.4: Consolidate formatDateTime()
- [ ] Task 2.5: Consolidate formatCurrency()
- [ ] Task 2.6: Consolidate generateUUID()

---

*Last updated: 20 December 2025*
