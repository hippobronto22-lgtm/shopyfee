import re

with open("src/App.jsx", "r") as f:
    content = f.read()

# 1. Add Firebase imports
imports_chunk = """import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';"""
content = re.sub(r"import React,.*?from 'react';", imports_chunk, content, count=1, flags=re.DOTALL)

# 2. Add isLoading state inside App
app_start = "export default function App() {"
loading_state = """export default function App() {
  const [isLoading, setIsLoading] = useState(true);
"""
content = content.replace(app_start, loading_state)

# 3. Modify States to be empty / uninitialized initially (we'll keep initial for seeding)
# Actually, let's keep the initial states as defaultSeed objects outside the component to keep App clean
seed_data = """
const defaultShopeeData = [
    { statusToko: "Non-Star", kategori: "Pakaian", subKategori: "Atasan", jenisProduk: "Kaos", fee: 5.5 },
    { statusToko: "Non-Star", kategori: "Pakaian", subKategori: "Bawahan", jenisProduk: "Celana Jeans", fee: 6.5 },
    { statusToko: "Non-Star", kategori: "Elektronik", subKategori: "Komputer", jenisProduk: "Laptop", fee: 4.0 },
    { statusToko: "Non-Star", kategori: "Elektronik", subKategori: "HP & Tablet", jenisProduk: "Smartphone", fee: 3.5 },
    { statusToko: "Star / Star+", kategori: "Pakaian", subKategori: "Atasan", jenisProduk: "Kaos", fee: 6.5 },
    { statusToko: "Star / Star+", kategori: "Elektronik", subKategori: "Komputer", jenisProduk: "Laptop", fee: 4.7 },
    { statusToko: "Shopee Mall", kategori: "Pakaian", subKategori: "Atasan", jenisProduk: "Kaos", fee: 8.0 }
];
const defaultProgramData = [
    { id: "1", nama: "Gratis Ongkir Xtra", fee: 4.0 },
    { id: "2", nama: "Cashback Xtra", fee: 1.4 }
];
const defaultProducts = [
    { id: 1, name: 'Kopi Arabica 200g', hpp: 40000, profit: 10000, feePercent: 6.5, price: 55000, stock: 25, statusToko: 'Non-Star', kategori: 'Pakaian', subKategori: 'Bawahan', jenisProduk: '6.5', programs: [] },
    { id: 2, name: 'Teh Hijau Celup', hpp: 15000, profit: 8000, feePercent: 4.0, price: 25000, stock: 40, statusToko: 'Non-Star', kategori: 'Elektronik', subKategori: 'Komputer', jenisProduk: '4.0', programs: [] },
    { id: 3, name: 'Gula Aren Cair', hpp: 12000, profit: 5000, feePercent: 5.5, price: 20000, stock: 5, statusToko: 'Non-Star', kategori: 'Pakaian', subKategori: 'Atasan', jenisProduk: '5.5', programs: [] },
    { id: 4, name: 'Susu UHT 1L', hpp: 13000, profit: 3000, feePercent: 4.0, price: 18000, stock: 12, statusToko: 'Non-Star', kategori: 'Elektronik', subKategori: 'Komputer', jenisProduk: '4.0', programs: [] },
];
const defaultAssets = [
    { id: 1, type: 'CAPEX', name: 'Laptop Kasir', amount: 5000000, date: new Date().toLocaleDateString('id-ID'), timestamp: Date.now(), description: 'Pembelian aset laptop untuk operasional', depreciation: 24 },
    { id: 2, type: 'OPEX', name: 'Listrik & Internet', amount: 450000, date: new Date().toLocaleDateString('id-ID'), timestamp: Date.now(), description: 'Tagihan bulanan', depreciation: null },
];

export default function App"""

content = content.replace("export default function App", seed_data)

# Replace useState initializations
content = re.sub(r'const \[shopeeData, setShopeeData\] = useState\(\[[\s\S]*?\]\);', 'const [shopeeData, setShopeeData] = useState([]);', content)
content = re.sub(r'const \[programData, setProgramData\] = useState\(\[[\s\S]*?\]\);', 'const [programData, setProgramData] = useState([]);', content)
content = re.sub(r'const \[products, setProducts\] = useState\(\[[\s\S]*?\]\);', 'const [products, setProducts] = useState([]);', content)
content = re.sub(r'const \[assets, setAssets\] = useState\(\[[\s\S]*?\]\);', 'const [assets, setAssets] = useState([]);', content)
content = re.sub(r'const \[paymentFeeMall, setPaymentFeeMall\] = useState\(1\.8\);', 'const [paymentFeeMall, setPaymentFeeMall] = useState(0);', content)

# 4. Modify useEffect
use_effect_old = r"useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);"
use_effect_new = """useEffect(() => {
    const text = shopeeData.map(d => `${d.statusToko} | ${d.kategori} | ${d.subKategori} | ${d.jenisProduk} | ${d.fee}`).join('\\n');
    if (text) setMasterDataText(text);
}, [shopeeData]);

useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load Settings
        const shopeeSnap = await getDocs(collection(db, 'settings_shopee'));
        if (shopeeSnap.empty) {
            const batch = writeBatch(db);
            defaultShopeeData.forEach((item, i) => batch.set(doc(db, 'settings_shopee', `item_${i}`), item));
            await batch.commit();
            setShopeeData(defaultShopeeData);
        } else {
            setShopeeData(shopeeSnap.docs.map(d => d.data()));
        }

        const progSnap = await getDocs(collection(db, 'settings_program'));
        if (progSnap.empty) {
            const batch = writeBatch(db);
            defaultProgramData.forEach((item) => batch.set(doc(db, 'settings_program', item.id), item));
            await batch.commit();
            setProgramData(defaultProgramData);
        } else {
            setProgramData(progSnap.docs.map(d => d.data()));
        }

        const generalSnap = await getDocs(collection(db, 'settings_general'));
        if (generalSnap.empty) {
            await setDoc(doc(db, 'settings_general', 'paymentFeeMall'), { value: 1.8 });
            setPaymentFeeMall(1.8);
        } else {
            let val = 1.8;
            generalSnap.forEach(d => { if(d.id === 'paymentFeeMall') val = d.data().value; });
            setPaymentFeeMall(val);
        }

        // Load Inventory
        const prodSnap = await getDocs(collection(db, 'inventory'));
        if (prodSnap.empty) {
            const batch = writeBatch(db);
            defaultProducts.forEach((item) => batch.set(doc(db, 'inventory', item.id.toString()), item));
            await batch.commit();
            setProducts(defaultProducts);
        } else {
            setProducts(prodSnap.docs.map(d => d.data()));
        }

        // Load Assets
        const astSnap = await getDocs(collection(db, 'assets'));
        if (astSnap.empty) {
            const batch = writeBatch(db);
            defaultAssets.forEach((item) => batch.set(doc(db, 'assets', item.id.toString()), item));
            await batch.commit();
            setAssets(defaultAssets);
        } else {
            setAssets(astSnap.docs.map(d => d.data()));
        }

        // Load Transactions
        const trxSnap = await getDocs(collection(db, 'transactions'));
        setTransactions(trxSnap.docs.map(d => d.data()).sort((a,b) => b.timestamp - a.timestamp));

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading data from Firebase", err);
        setIsLoading(false);
        showToast('Gagal memuat data dari database', 'error');
      }
    };
    loadData();
}, []);"""

content = re.sub(use_effect_old, use_effect_new, content)

# 5. Modify Handlers for Firebase
# handleSaveMasterData
save_master_data_old = r"const handleSaveMasterData = \(\) => \{[\s\S]*?setTimeout\(\(\) => setSaveSuccess\(false\), 2000\);\n  \};"
save_master_data_new = """const handleSaveMasterData = async () => {
    const lines = masterDataText.split('\\n');
    const parsed = [];
    lines.forEach(line => {
      if(!line.trim()) return;
      const parts = line.split('|').map(p => p.trim());
      if(parts.length >= 5) {
        parsed.push({
          statusToko: parts[0],
          kategori: parts[1],
          subKategori: parts[2],
          jenisProduk: parts[3],
          fee: parseFloat(parts[4]) || 0
        });
      }
    });

    try {
      const snap = await getDocs(collection(db, 'settings_shopee'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      parsed.forEach((item, i) => batch.set(doc(db, 'settings_shopee', `item_${i}`), item));
      await batch.commit();

      setShopeeData(parsed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch(err) {
      showToast('Gagal menyimpan Master Data', 'error');
    }
  };"""
content = re.sub(save_master_data_old, save_master_data_new, content)

# updateProgram
update_prog_old = r"const updateProgram = \(index, field, value\) => \{[\s\S]*?setProgramData\(newProgs\);\n  \};"
update_prog_new = """const updateProgram = async (index, field, value) => {
    const newProgs = [...programData];
    newProgs[index][field] = field === 'fee' ? parseFloat(value) || 0 : value;
    setProgramData(newProgs);
    try { await updateDoc(doc(db, 'settings_program', newProgs[index].id), { [field]: newProgs[index][field] }); } catch(err){}
  };"""
content = re.sub(update_prog_old, update_prog_new, content)

# addProgram
add_prog_old = r"const addProgram = \(\) => setProgramData\(\[\.\.\.programData, \{id: Date\.now\(\)\.toString\(\), nama: 'Program Baru', fee: 0\}\]\);"
add_prog_new = """const addProgram = async () => {
    const newProg = {id: Date.now().toString(), nama: 'Program Baru', fee: 0};
    setProgramData([...programData, newProg]);
    try { await setDoc(doc(db, 'settings_program', newProg.id), newProg); } catch(err){}
  };"""
content = re.sub(add_prog_old, add_prog_new, content)

# removeProgram
rm_prog_old = r"const removeProgram = \(index\) => setProgramData\(programData\.filter\(\(_, i\) => i !== index\)\);"
rm_prog_new = """const removeProgram = async (index) => {
    const prog = programData[index];
    setProgramData(programData.filter((_, i) => i !== index));
    if(prog) try { await deleteDoc(doc(db, 'settings_program', prog.id)); } catch(err){}
  };"""
content = re.sub(rm_prog_old, rm_prog_new, content)

# paymentFeeMall effect
change_payment_mall = """
  useEffect(() => {
     if(isLoading) return;
     const savePaymentFee = async () => {
        try { await setDoc(doc(db, 'settings_general', 'paymentFeeMall'), { value: paymentFeeMall }); } catch(err){}
     };
     const timeout = setTimeout(savePaymentFee, 1000);
     return () => clearTimeout(timeout);
  }, [paymentFeeMall]);
"""
content = content.replace("const [paymentFeeMall, setPaymentFeeMall] = useState(0);", f"const [paymentFeeMall, setPaymentFeeMall] = useState(0);\n{change_payment_mall}")


# handleCheckout
checkout_old = r"const handleCheckout = \(\) => \{[\s\S]*?setActiveTab\('reports'\);\n  \};"
checkout_new = """const handleCheckout = async () => {
    if (cart.length === 0) return;
    const newTransaction = {
      id: `TRX-${1000 + transactions.length + 1}`,
      date: new Date().toLocaleString('id-ID'),
      timestamp: Date.now(),
      items: cart,
      total: calculateTotal()
    };
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(c => c.product.id === p.id);
      return cartItem ? { ...p, stock: p.stock - cartItem.qty } : p;
    });
    
    // Optimistic Update
    setProducts(updatedProducts);
    setTransactions([newTransaction, ...transactions]);
    setCart([]);
    showToast('Transaksi diproses...', 'success');
    setActiveTab('reports');

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'transactions', newTransaction.id), newTransaction);
      cart.forEach(c => {
         const p = updatedProducts.find(up => up.id === c.product.id);
         if(p) batch.update(doc(db, 'inventory', p.id.toString()), { stock: p.stock });
      });
      await batch.commit();
      showToast('Transaksi berhasil disimpan!', 'success');
    } catch(err) {
      showToast('Gagal menyimpan ke database', 'error');
    }
  };"""
content = re.sub(checkout_old, checkout_new, content)

# handleAddProduct
add_product_old = r"const handleAddProduct = \(e\) => \{[\s\S]*?setNewProduct\(\{ name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: \[\] \}\);\n  \};"
add_product_new = """const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.hpp || !newProduct.stock) return showToast('Mohon lengkapi Nama Produk, Modal (HPP), dan Stok!', 'error');

    if (editingProductId) {
      const updatedProduct = {
        ...products.find(p=>p.id === editingProductId), name: newProduct.name, hpp: hppNum, profit: profitNum, feePercent: totalFeePercent,
        price: finalHargaJual > 0 ? finalHargaJual : hppNum, stock: parseInt(newProduct.stock),
        statusToko: newProduct.statusToko, kategori: newProduct.kategori, subKategori: newProduct.subKategori,
        jenisProduk: newProduct.jenisProduk, programs: newProduct.programs
      };
      setProducts(products.map(p => p.id === editingProductId ? updatedProduct : p));
      setEditingProductId(null);
      try { await updateDoc(doc(db, 'inventory', editingProductId.toString()), updatedProduct); showToast('Data produk berhasil diperbarui!', 'success'); } catch(e){}
    } else {
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      const productToAdd = { 
        id: newId, name: newProduct.name, hpp: hppNum, profit: profitNum, feePercent: totalFeePercent,
        price: finalHargaJual > 0 ? finalHargaJual : hppNum, stock: parseInt(newProduct.stock),
        statusToko: newProduct.statusToko, kategori: newProduct.kategori, subKategori: newProduct.subKategori,
        jenisProduk: newProduct.jenisProduk, programs: newProduct.programs
      };
      setProducts([productToAdd, ...products]);
      try { await setDoc(doc(db, 'inventory', newId.toString()), productToAdd); showToast('Produk baru berhasil ditambahkan!', 'success'); } catch(e){}
    }
    setNewProduct({ name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: [] });
  };"""
content = re.sub(add_product_old, add_product_new, content)

# handleDeleteProduct
del_product_old = r"const handleDeleteProduct = \(id\) => \{[\s\S]*?\}\);\n  \};"
del_product_new = """const handleDeleteProduct = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Produk',
      message: 'Yakin ingin menghapus produk ini dari inventaris?',
      onConfirm: async () => {
        setProducts(products.filter(p => p.id !== id));
        if (editingProductId === id) handleCancelEditProduct();
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try { await deleteDoc(doc(db, 'inventory', id.toString())); showToast('Produk berhasil dihapus!', 'success'); } catch(e){}
      }
    });
  };"""
content = re.sub(del_product_old, del_product_new, content)

# submitRestock
restock_old = r"const submitRestock = \(\) => \{[\s\S]*?showToast\('Stok berhasil ditambahkan!', 'success'\);\n  \};"
restock_new = """const submitRestock = async () => {
    if(!restockModal.amount || isNaN(restockModal.amount)) return;
    const pId = restockModal.productId;
    const newStock = products.find(p => p.id === pId).stock + parseInt(restockModal.amount);
    setProducts(products.map(p => p.id === pId ? { ...p, stock: newStock } : p));
    setRestockModal({ isOpen: false, productId: null, amount: '' });
    try { await updateDoc(doc(db, 'inventory', pId.toString()), { stock: newStock }); showToast('Stok berhasil ditambahkan!', 'success'); } catch(e){}
  };"""
content = re.sub(restock_old, restock_new, content)

# handleAddAsset
add_asset_old = r"const handleAddAsset = \(e\) => \{[\s\S]*?setNewAsset\(\{ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' \}\);\n  \};"
add_asset_new = """const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.amount) return;
    if (newAsset.type === 'CAPEX' && !newAsset.depreciation) return showToast('Mohon isi lama masa depresiasi!', 'error');

    if (editingAssetId) {
      const updatedAsset = {
        ...assets.find(a=>a.id === editingAssetId), type: newAsset.type, name: newAsset.name, amount: parseFloat(newAsset.amount),
        description: newAsset.description, depreciation: newAsset.type === 'CAPEX' ? parseInt(newAsset.depreciation) : null
      };
      setAssets(assets.map(a => a.id === editingAssetId ? updatedAsset : a));
      setEditingAssetId(null);
      try { await updateDoc(doc(db, 'assets', editingAssetId.toString()), updatedAsset); showToast('Data pengeluaran berhasil diperbarui!', 'success');} catch(e){}
    } else {
      const newId = assets.length > 0 ? Math.max(...assets.map(a => a.id)) + 1 : 1;
      const assetToAdd = {
        id: newId, type: newAsset.type, name: newAsset.name, amount: parseFloat(newAsset.amount),
        date: new Date().toLocaleDateString('id-ID'), timestamp: Date.now(),
        description: newAsset.description, depreciation: newAsset.type === 'CAPEX' ? parseInt(newAsset.depreciation) : null
      };
      setAssets([assetToAdd, ...assets]);
      try { await setDoc(doc(db, 'assets', newId.toString()), assetToAdd); showToast('Data berhasil dicatat!', 'success'); } catch(e){}
    }
    setNewAsset({ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' });
  };"""
content = re.sub(add_asset_old, add_asset_new, content)

# handleDeleteAsset
del_asset_old = r"const handleDeleteAsset = \(id\) => \{[\s\S]*?\}\);\n  \};"
del_asset_new = """const handleDeleteAsset = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Pengeluaran',
      message: 'Yakin ingin menghapus data pengeluaran ini?',
      onConfirm: async () => {
        setAssets(assets.filter(a => a.id !== id));
        if (editingAssetId === id) setEditingAssetId(null);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try { await deleteDoc(doc(db, 'assets', id.toString())); showToast('Data pengeluaran dihapus!', 'success'); } catch(e){}
      }
    });
  };"""
content = re.sub(del_asset_old, del_asset_new, content)

# handleDeleteTransaction
del_trx_old = r"const handleDeleteTransaction = \(id\) => \{[\s\S]*?\}\);\n  \};"
del_trx_new = """const handleDeleteTransaction = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Batalkan Transaksi',
      message: 'Yakin ingin membatalkan transaksi ini? Stok produk akan dikembalikan.',
      onConfirm: async () => {
        const trx = transactions.find(t => t.id === id);
        if (trx) {
          const updatedProds = products.map(p => {
             const item = trx.items.find(i => i.product.id === p.id);
             return item ? { ...p, stock: p.stock + item.qty } : p;
          });
          setProducts(updatedProds);
          setTransactions(transactions.filter(t => t.id !== id));
          
          try {
             const batch = writeBatch(db);
             batch.delete(doc(db, 'transactions', id));
             updatedProds.forEach(p => batch.update(doc(db, 'inventory', p.id.toString()), { stock: p.stock }));
             await batch.commit();
             showToast('Transaksi dibatalkan dan stok dikembalikan!', 'success');
          } catch(err) { showToast('Gagal memproses pembatalan', 'error'); }
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };"""
content = re.sub(del_trx_old, del_trx_new, content)

# Add Loading overlay if isLoading
loading_overlay = """
  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 relative">
      {isLoading && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <RefreshCcw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Menyinkronkan Data...</h2>
        </div>
      )}
"""
content = re.sub(r'return \(\s*<div className="flex h-screen bg-gray-100 font-sans text-gray-800">', loading_overlay, content)

with open("src/App.jsx", "w") as f:
    f.write(content)

