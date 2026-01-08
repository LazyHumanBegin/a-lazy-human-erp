// Debug helper to check stock data
console.log('=== STOCK DEBUG HELPER ===');

// Check products data
const products = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
console.log(`Total products: ${products.length}`);

// Check branch stock data
const branchStock = JSON.parse(localStorage.getItem('ezcubic_branch_stock') || '{}');
console.log(`Branch stock entries: ${Object.keys(branchStock).length}`);

// Sample first few products
products.slice(0, 3).forEach(p => {
    console.log(`\nProduct: ${p.name} (${p.sku})`);
    console.log(`  product.stock: ${p.stock}`);
    console.log(`  product.branchStock:`, p.branchStock);
    
    // Check localStorage branch stock
    Object.keys(branchStock).filter(k => k.startsWith(p.id)).forEach(key => {
        console.log(`  localStorage ${key}: ${branchStock[key]}`);
    });
});

// Check for discrepancies
products.forEach(p => {
    if (p.branchStock) {
        const branchTotal = Object.values(p.branchStock).reduce((sum, qty) => sum + qty, 0);
        if (branchTotal !== p.stock) {
            console.warn(`⚠️ MISMATCH: ${p.name}`);
            console.warn(`  product.stock = ${p.stock}`);
            console.warn(`  branchStock total = ${branchTotal}`);
            console.warn(`  branchStock breakdown:`, p.branchStock);
        }
    }
});
