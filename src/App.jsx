import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Plus, 
  Trash2, 
  Receipt,
  Calculator,
  Settings,
  CheckCircle2,
  Info,
  Wallet,
  Building2,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  RefreshCcw,
  Filter,
  Calendar,
  Search,
  TrendingUp,
  ShoppingBag,
  Star,
  Download,
  Upload
} from 'lucide-react';


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

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  // State untuk navigasi menu
  const [activeTab, setActiveTab] = useState('dashboard');
  const mainRef = useRef(null);

  // State Notifikasi (Toast & Confirm)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // State Pencarian POS
  const [posSearchTerm, setPosSearchTerm] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- 1. STATE MASTER DATA (DINAMIS) ---
  const [shopeeData, setShopeeData] = useState([]);

  const [programData, setProgramData] = useState([]);

  const [paymentFeeMall, setPaymentFeeMall] = useState(0);

  useEffect(() => {
     if(isLoading) return;
     const savePaymentFee = async () => {
        try { await setDoc(doc(db, 'settings_general', 'paymentFeeMall'), { value: paymentFeeMall }); } catch(err){ console.error(err); }
     };
     const timeout = setTimeout(savePaymentFee, 1000);
     return () => clearTimeout(timeout);
  }, [paymentFeeMall]);

  const [masterDataText, setMasterDataText] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const text = shopeeData.map(d => `${d.statusToko} | ${d.kategori} | ${d.subKategori} | ${d.jenisProduk} | ${d.fee}`).join('\n');
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
}, []);

  const handleSaveMasterData = async () => {
    const lines = masterDataText.split('\n');
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
  };

  // --- LOGIKA EXCEL (UPLOAD & DOWNLOAD) ---
  const handleDownloadTemplate = () => {
    if (!window.XLSX) return showToast('Library Excel sedang dimuat, coba lagi sebentar.', 'error');
    
    const dataToExport = [["Status Toko", "Kategori", "SubKategori", "Jenis", "Persen(%)"]];
    shopeeData.forEach(item => {
      dataToExport.push([item.statusToko, item.kategori, item.subKategori, item.jenisProduk, item.fee]);
    });

    const ws = window.XLSX.utils.aoa_to_sheet(dataToExport);
    ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}];
    
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Biaya Admin");
    window.XLSX.writeFile(wb, "Master_Data_Biaya.xlsx");
  };

  const handleUploadExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.XLSX) return showToast('Library Excel belum siap.', 'error');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let textArray = [];
        let startIdx = 0;
        
        // Lewati baris pertama jika itu adalah header
        if (json.length > 0 && String(json[0][0]).toLowerCase().includes("status")) startIdx = 1;

        for (let i = startIdx; i < json.length; i++) {
          const row = json[i];
          if (row.length === 0 || (!row[0] && !row[1])) continue; 
          
          const status = row[0] || "-";
          const kat = row[1] || "-";
          const sub = row[2] || "-";
          const jenis = row[3] || "-";
          const fee = parseFloat(row[4]) || 0;
          
          textArray.push(`${status} | ${kat} | ${sub} | ${jenis} | ${fee}`);
        }

        setMasterDataText(textArray.join('\n'));
        showToast('Data Excel berhasil dibaca! Klik Simpan untuk menerapkan.', 'success');
      } catch (error) {
        showToast('Terjadi kesalahan saat membaca file Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input file
  };

  const updateProgram = async (index, field, value) => {
    const newProgs = [...programData];
    newProgs[index][field] = field === 'fee' ? parseFloat(value) || 0 : value;
    setProgramData(newProgs);
    try { await updateDoc(doc(db, 'settings_program', newProgs[index].id), { [field]: newProgs[index][field] }); } catch(err){ console.error(err); }
  };
  const addProgram = async () => {
    const newProg = {id: Date.now().toString(), nama: 'Program Baru', fee: 0};
    setProgramData([...programData, newProg]);
    try { await setDoc(doc(db, 'settings_program', newProg.id), newProg); } catch(err){ console.error(err); }
  };
  const removeProgram = async (index) => {
    const prog = programData[index];
    setProgramData(programData.filter((_, i) => i !== index));
    if(prog) try { await deleteDoc(doc(db, 'settings_program', prog.id)); } catch(err){ console.error(err); }
  };

  // --- 2. STATE DATABASE PRODUK & TRANSAKSI ---
  const [products, setProducts] = useState([]);
  
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);

  const [newProduct, setNewProduct] = useState({ 
    name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: []
  });
  const [editingProductId, setEditingProductId] = useState(null);
  
  // State Restock
  const [restockModal, setRestockModal] = useState({ isOpen: false, productId: null, amount: '' });

  // --- 3. STATE MANAJEMEN ASET & PENGELUARAN ---
  const [assets, setAssets] = useState([]);
  const [newAsset, setNewAsset] = useState({ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' });
  const [editingAssetId, setEditingAssetId] = useState(null);

  // State Filter Aset
  const [assetFilter, setAssetFilter] = useState({ type: 'ALL', startDate: '', endDate: '' });

  // State Filter Laporan
  const [reportFilter, setReportFilter] = useState({ startDate: '', endDate: '' });

  // --- LOGIKA KASCADING DROPDOWN KALKULATOR TERINTEGRASI ---
  const statuses = [...new Set(shopeeData.map(d => d.statusToko))];
  const categories = [...new Set(shopeeData.filter(d => d.statusToko === newProduct.statusToko).map(d => d.kategori))];
  const subCategories = [...new Set(shopeeData.filter(d => d.statusToko === newProduct.statusToko && d.kategori === newProduct.kategori).map(d => d.subKategori))];
  const jenisProdukList = shopeeData.filter(d => d.statusToko === newProduct.statusToko && d.kategori === newProduct.kategori && d.subKategori === newProduct.subKategori);

  const handleStatusChange = (e) => setNewProduct({...newProduct, statusToko: e.target.value, kategori: '', subKategori: '', jenisProduk: ''});
  const handleKategoriChange = (e) => setNewProduct({...newProduct, kategori: e.target.value, subKategori: '', jenisProduk: ''});
  const handleSubKategoriChange = (e) => setNewProduct({...newProduct, subKategori: e.target.value, jenisProduk: ''});

  const handleProgramToggle = (fee, isChecked) => {
    if (isChecked) setNewProduct({...newProduct, programs: [...newProduct.programs, fee]});
    else setNewProduct({...newProduct, programs: newProduct.programs.filter(f => f !== fee)});
  };

  // --- MESIN HITUNG KALKULATOR ---
  const hppNum = parseFloat(newProduct.hpp) || 0;
  const profitNum = parseFloat(newProduct.profit) || 0;
  const adminFeePercent = parseFloat(newProduct.jenisProduk) || 0;
  const programFeePercent = newProduct.programs.reduce((sum, pFee) => sum + pFee, 0);
  const paymentFeePercent = newProduct.statusToko === 'Shopee Mall' ? paymentFeeMall : 0;
  const totalFeePercent = adminFeePercent + programFeePercent + paymentFeePercent;

  const potonganAdmin = Math.round((hppNum + profitNum) * (adminFeePercent / 100));
  const potonganProgram = Math.round((hppNum + profitNum) * (programFeePercent / 100));
  const baseHarga = (hppNum + profitNum + potonganAdmin + potonganProgram) / (1 - (paymentFeePercent / 100));
  const finalHargaJual = Math.ceil(baseHarga || 0);

  // --- LOGIKA KASIR (POS) ---
  const filteredPosProducts = products.filter(p => p.name.toLowerCase().includes(posSearchTerm.toLowerCase()));

  const addToCart = (product) => {
    if (product.stock === 0) return showToast('Stok produk habis!', 'error');
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      if (existingItem.qty >= product.stock) return showToast('Kuantitas melebihi stok yang tersedia!', 'error');
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };
  const removeFromCart = (productId) => setCart(cart.filter(item => item.product.id !== productId));
  const calculateTotal = () => cart.reduce((total, item) => total + (item.product.price * item.qty), 0);

  const handleCheckout = async () => {
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
  };

  // --- LOGIKA INVENTARIS ---
  const handleAddProduct = async (e) => {
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
      try { await updateDoc(doc(db, 'inventory', editingProductId.toString()), updatedProduct); showToast('Data produk berhasil diperbarui!', 'success'); } catch(e){ console.error(e); }
    } else {
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      const productToAdd = { 
        id: newId, name: newProduct.name, hpp: hppNum, profit: profitNum, feePercent: totalFeePercent,
        price: finalHargaJual > 0 ? finalHargaJual : hppNum, stock: parseInt(newProduct.stock),
        statusToko: newProduct.statusToko, kategori: newProduct.kategori, subKategori: newProduct.subKategori,
        jenisProduk: newProduct.jenisProduk, programs: newProduct.programs
      };
      setProducts([productToAdd, ...products]);
      try { await setDoc(doc(db, 'inventory', newId.toString()), productToAdd); showToast('Produk baru berhasil ditambahkan!', 'success'); } catch(e){ console.error(e); }
    }
    setNewProduct({ name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: [] });
  };

  const handleEditProduct = (product) => {
    setNewProduct({
      name: product.name, stock: product.stock.toString(), hpp: product.hpp.toString(), profit: product.profit.toString(),
      statusToko: product.statusToko || '', kategori: product.kategori || '', subKategori: product.subKategori || '',
      jenisProduk: product.jenisProduk || '', programs: product.programs || []
    });
    setEditingProductId(product.id);
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Produk',
      message: 'Yakin ingin menghapus produk ini dari inventaris?',
      onConfirm: async () => {
        setProducts(products.filter(p => p.id !== id));
        if (editingProductId === id) handleCancelEditProduct();
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try { await deleteDoc(doc(db, 'inventory', id.toString())); showToast('Produk berhasil dihapus!', 'success'); } catch(e){ console.error(e); }
      }
    });
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setNewProduct({ name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: [] });
  };

  const submitRestock = async () => {
    if(!restockModal.amount || isNaN(restockModal.amount)) return;
    const pId = restockModal.productId;
    const newStock = products.find(p => p.id === pId).stock + parseInt(restockModal.amount);
    setProducts(products.map(p => p.id === pId ? { ...p, stock: newStock } : p));
    setRestockModal({ isOpen: false, productId: null, amount: '' });
    try { await updateDoc(doc(db, 'inventory', pId.toString()), { stock: newStock }); showToast('Stok berhasil ditambahkan!', 'success'); } catch(e){ console.error(e); }
  };

  // --- LOGIKA MANAJEMEN ASET ---
  const handleAddAsset = async (e) => {
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
      try { await updateDoc(doc(db, 'assets', editingAssetId.toString()), updatedAsset); showToast('Data pengeluaran berhasil diperbarui!', 'success');} catch(e){ console.error(e); }
    } else {
      const newId = assets.length > 0 ? Math.max(...assets.map(a => a.id)) + 1 : 1;
      const assetToAdd = {
        id: newId, type: newAsset.type, name: newAsset.name, amount: parseFloat(newAsset.amount),
        date: new Date().toLocaleDateString('id-ID'), timestamp: Date.now(),
        description: newAsset.description, depreciation: newAsset.type === 'CAPEX' ? parseInt(newAsset.depreciation) : null
      };
      setAssets([assetToAdd, ...assets]);
      try { await setDoc(doc(db, 'assets', newId.toString()), assetToAdd); showToast('Data berhasil dicatat!', 'success'); } catch(e){ console.error(e); }
    }
    setNewAsset({ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' });
  };

  const handleEditAsset = (asset) => {
    setNewAsset({
      type: asset.type, name: asset.name, amount: asset.amount.toString(),
      description: asset.description || '', depreciation: asset.depreciation ? asset.depreciation.toString() : ''
    });
    setEditingAssetId(asset.id);
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAsset = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Pengeluaran',
      message: 'Yakin ingin menghapus data pengeluaran ini?',
      onConfirm: async () => {
        setAssets(assets.filter(a => a.id !== id));
        if (editingAssetId === id) setEditingAssetId(null);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try { await deleteDoc(doc(db, 'assets', id.toString())); showToast('Data pengeluaran dihapus!', 'success'); } catch(e){ console.error(e); }
      }
    });
  };

  const handleCancelEditAsset = () => {
    setEditingAssetId(null);
    setNewAsset({ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' });
  };

  // --- LOGIKA FILTER ASET ---
  const filteredAssets = assets.filter(a => {
    let matchType = assetFilter.type === 'ALL' || a.type === assetFilter.type;
    let matchStart = !assetFilter.startDate || a.timestamp >= new Date(assetFilter.startDate).setHours(0,0,0,0);
    let matchEnd = !assetFilter.endDate || a.timestamp <= new Date(assetFilter.endDate).setHours(23,59,59,999);
    return matchType && matchStart && matchEnd;
  });

  const sumFilteredOpex = filteredAssets.filter(a => a.type === 'OPEX').reduce((sum, a) => sum + a.amount, 0);
  const sumFilteredCapexDepreciation = filteredAssets.filter(a => a.type === 'CAPEX' && a.depreciation).reduce((sum, a) => sum + Math.round(a.amount / a.depreciation), 0);

  // --- LOGIKA FILTER LAPORAN & PERHITUNGAN LABA ---
  const handleDeleteTransaction = (id) => {
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
  };

  const filteredTransactions = transactions.filter(t => {
    let matchStart = !reportFilter.startDate || t.timestamp >= new Date(reportFilter.startDate).setHours(0,0,0,0);
    let matchEnd = !reportFilter.endDate || t.timestamp <= new Date(reportFilter.endDate).setHours(23,59,59,999);
    return matchStart && matchEnd;
  });

  const filteredReportAssets = assets.filter(a => {
    let matchStart = !reportFilter.startDate || a.timestamp >= new Date(reportFilter.startDate).setHours(0,0,0,0);
    let matchEnd = !reportFilter.endDate || a.timestamp <= new Date(reportFilter.endDate).setHours(23,59,59,999);
    return matchStart && matchEnd;
  });

  // Kalkulasi Detail Laporan
  const reportTotalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const reportTotalOpex = filteredReportAssets.filter(a => a.type === 'OPEX').reduce((sum, a) => sum + a.amount, 0);
  
  const getTrxDetails = (trx) => {
    let totalHpp = 0;
    let totalFeeEstimasi = 0;
    trx.items.forEach(item => {
      totalHpp += (item.product.hpp * item.qty);
      totalFeeEstimasi += Math.round(item.product.price * (item.product.feePercent / 100) * item.qty);
    });
    const labaBersih = trx.total - totalHpp - totalFeeEstimasi;
    return { totalHpp, totalFeeEstimasi, labaBersih };
  };

  const totalLabaKotor = filteredTransactions.reduce((sum, trx) => sum + getTrxDetails(trx).labaBersih, 0);
  const labaOperasional = totalLabaKotor - reportTotalOpex;

  // --- LOGIKA DASHBOARD (Top Products & Overviews) ---
  const totalRevenueAll = transactions.reduce((sum, trx) => sum + trx.total, 0);
  const lowStockCount = products.filter(p => p.stock < 10).length;

  const productSales = {};
  transactions.forEach(trx => {
    trx.items.forEach(item => {
      if (productSales[item.product.id]) {
        productSales[item.product.id].qty += item.qty;
        productSales[item.product.id].revenue += item.qty * item.product.price;
      } else {
        productSales[item.product.id] = { name: item.product.name, qty: item.qty, revenue: item.qty * item.product.price };
      }
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const formatRp = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

  
  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 relative">
      {isLoading && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <RefreshCcw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Menyinkronkan Data...</h2>
        </div>
      )}

      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-800 text-white flex flex-col shadow-xl z-10 shrink-0">
        <div className="p-6 bg-slate-900 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-center tracking-wider text-blue-400 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 mr-2 text-white" /> TokoKu.
          </h2>
        </div>
        <nav className="flex-1 mt-6 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 border-l-4 border-blue-300' : 'hover:bg-slate-700'}`}>
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('pos')} className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === 'pos' ? 'bg-blue-600 border-l-4 border-blue-300' : 'hover:bg-slate-700'}`}>
            <ShoppingCart className="w-5 h-5 mr-3" /> Kasir (POS)
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === 'inventory' ? 'bg-blue-600 border-l-4 border-blue-300' : 'hover:bg-slate-700'}`}>
            <Package className="w-5 h-5 mr-3" /> Inventaris Produk
          </button>
          <button onClick={() => setActiveTab('assets')} className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === 'assets' ? 'bg-blue-600 border-l-4 border-blue-300' : 'hover:bg-slate-700'}`}>
            <Wallet className="w-5 h-5 mr-3" /> Manajemen Aset
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === 'reports' ? 'bg-blue-600 border-l-4 border-blue-300' : 'hover:bg-slate-700'}`}>
            <BarChart3 className="w-5 h-5 mr-3" /> Laporan Penjualan
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === 'settings' ? 'bg-orange-600 border-l-4 border-orange-300' : 'hover:bg-slate-700'}`}>
            <Settings className="w-5 h-5 mr-3 text-orange-300" /> Pengaturan Biaya
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center z-0">
          <h1 className="text-2xl font-semibold text-gray-700 capitalize">
            {activeTab === 'pos' ? 'Sistem Kasir (Point of Sale)' : 
             activeTab === 'settings' ? 'Master Data & Pengaturan Biaya' : 
             activeTab === 'assets' ? 'Manajemen Aset & Pengeluaran' : activeTab}
          </h1>
          <div className="text-sm text-gray-500 font-medium">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* CONTENT */}
        <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-8 scroll-smooth">
          
          {/* TAMPILAN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:-translate-y-1 transition duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-blue-100 text-sm font-medium mb-1">Total Omzet Keseluruhan</div>
                      <div className="text-3xl font-black">{formatRp(totalRevenueAll)}</div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl"><ArrowUpRight className="w-6 h-6 text-white" /></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white transform hover:-translate-y-1 transition duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-emerald-100 text-sm font-medium mb-1">Total Transaksi</div>
                      <div className="text-3xl font-black">{transactions.length}</div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl"><Receipt className="w-6 h-6 text-white" /></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white transform hover:-translate-y-1 transition duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-amber-100 text-sm font-medium mb-1">Total Item Inventaris</div>
                      <div className="text-3xl font-black">{products.length} <span className="text-lg font-medium">SKU</span></div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl"><Package className="w-6 h-6 text-white" /></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl shadow-lg p-6 text-white transform hover:-translate-y-1 transition duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-rose-100 text-sm font-medium mb-1">Peringatan Stok Habis</div>
                      <div className="text-3xl font-black">{lowStockCount}</div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl"><Info className="w-6 h-6 text-white" /></div>
                  </div>
                </div>
              </div>

              {/* Lower Section Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Transaksi Terakhir */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-blue-500" /> Transaksi Terakhir
                    </h3>
                    <button onClick={() => setActiveTab('reports')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Lihat Semua</button>
                  </div>
                  <div className="p-0 flex-1">
                    {transactions.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400">Belum ada transaksi.</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {transactions.slice(0, 5).map(trx => (
                          <li key={trx.id} className="p-4 hover:bg-gray-50 flex justify-between items-center transition">
                            <div>
                              <div className="font-bold text-gray-800">{trx.id}</div>
                              <div className="text-xs text-gray-500">{trx.date} • {trx.items.length} macam produk</div>
                            </div>
                            <div className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                              {formatRp(trx.total)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Produk Terlaris */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-rose-500" /> Produk Terlaris
                    </h3>
                  </div>
                  <div className="p-0 flex-1">
                    {topProducts.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400">Belum ada data penjualan.</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {topProducts.map((prod, idx) => (
                          <li key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                {idx === 0 ? <Star className="w-4 h-4 fill-amber-500"/> : idx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-gray-800">{prod.name}</div>
                                <div className="text-xs text-gray-500">Terjual: {prod.qty} item</div>
                              </div>
                            </div>
                            <div className="font-bold text-gray-800">
                              {formatRp(prod.revenue)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAMPILAN KASIR (POS) */}
          {activeTab === 'pos' && (
            <div className="flex flex-col md:flex-row gap-6 h-full animate-fade-in">
              {/* Daftar Produk */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm p-6 flex flex-col border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Pilih Produk</h3>
                </div>

                {/* Search Bar POS */}
                <div className="mb-6 relative group">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Cari nama produk..." 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={posSearchTerm}
                    onChange={(e) => setPosSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-2 -mx-2 px-2">
                  {filteredPosProducts.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-gray-400 font-medium">Produk tidak ditemukan.</div>
                  ) : filteredPosProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => addToCart(product)}
                      className={`relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-200 select-none
                        ${product.stock === 0 
                          ? 'opacity-50 bg-gray-50 cursor-not-allowed border-2 border-gray-100' 
                          : 'bg-white border-2 border-gray-100 hover:border-blue-400 hover:-translate-y-1 hover:shadow-lg active:scale-95 active:bg-blue-50 group'}`}
                    >
                      <h4 className="font-bold text-gray-800 line-clamp-2 min-h-[2.5rem] leading-tight group-active:text-blue-700">{product.name}</h4>
                      <div className="mt-3 flex justify-between items-end">
                        <p className="text-blue-600 font-black text-lg">{formatRp(product.price)}</p>
                        <p className={`text-[10px] font-bold px-2 py-1 rounded-md ${product.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          Stok: {product.stock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keranjang (Cart) */}
              <div className="w-full md:w-96 bg-white rounded-2xl shadow-sm p-6 flex flex-col border border-gray-100 h-fit max-h-full sticky top-0">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-3 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-blue-500"/> Keranjang Belanja
                </h3>
                <div className="flex-1 overflow-y-auto mb-4 min-h-[200px] pr-2">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm py-10">
                      <ShoppingBag className="w-12 h-12 mb-3 text-gray-200"/>
                      Belum ada produk dipilih
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {cart.map(item => (
                        <li key={item.product.id} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl bg-gray-50">
                          <div className="flex-1">
                            <div className="font-bold text-sm text-gray-800">{item.product.name}</div>
                            <div className="text-xs font-medium text-gray-500 mt-0.5">{formatRp(item.product.price)} <span className="mx-1">x</span> <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200 text-blue-600">{item.qty}</span></div>
                          </div>
                          <div className="font-black text-sm text-gray-800 mr-3">
                            {formatRp(item.product.price * item.qty)}
                          </div>
                          <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600 bg-white p-1.5 rounded-lg border border-red-100 hover:border-red-300 transition shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-5 mt-auto">
                  <div className="flex justify-between items-end mb-5">
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-xs">Total Tagihan</span>
                    <span className="text-3xl font-black text-blue-600">{formatRp(calculateTotal())}</span>
                  </div>
                  <button onClick={handleCheckout} disabled={cart.length === 0} className={`w-full py-4 rounded-xl font-bold text-white transition-all transform ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95'}`}>
                    Bayar Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAMPILAN INVENTARIS & KALKULATOR */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center border-b pb-3">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" /> {editingProductId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
                </h3>
                <form onSubmit={handleAddProduct} className="space-y-6">
                  
                  {/* Bagian 1: Info Dasar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Produk</label>
                      <input type="text" placeholder="Contoh: Kopi Susu Literan" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stok Awal</label>
                      <input type="number" placeholder="Jumlah Stok" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} required />
                    </div>
                  </div>

                  {/* Bagian 2: Kalkulator Modal & Profit Dinamis */}
                  <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-4">
                    <h4 className="font-semibold text-orange-800 flex items-center text-sm">
                      <Calculator className="w-4 h-4 mr-2" /> Kalkulasi Harga Jual (Platform Fee)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modal (HPP)</label>
                        <input type="number" placeholder="Rp 0" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none" value={newProduct.hpp} onChange={(e) => setNewProduct({...newProduct, hpp: e.target.value})} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Profit</label>
                        <input type="number" placeholder="Rp 0" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none" value={newProduct.profit} onChange={(e) => setNewProduct({...newProduct, profit: e.target.value})} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">1. Status Toko</label>
                        <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500" value={newProduct.statusToko} onChange={handleStatusChange}>
                          <option value="" disabled>-- Pilih Status --</option>
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {newProduct.statusToko && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">2. Kategori</label>
                          <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500" value={newProduct.kategori} onChange={handleKategoriChange}>
                            <option value="" disabled>-- Pilih Kategori --</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                      {newProduct.kategori && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">3. Sub Kategori</label>
                          <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500" value={newProduct.subKategori} onChange={handleSubKategoriChange}>
                            <option value="" disabled>-- Pilih Sub --</option>
                            {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                      {newProduct.subKategori && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">4. Jenis Produk</label>
                          <select className="w-full px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg outline-none text-sm font-semibold text-[#EE4D2D] focus:ring-2 focus:ring-orange-500" value={newProduct.jenisProduk} onChange={(e) => setNewProduct({...newProduct, jenisProduk: e.target.value})}>
                            <option value="" disabled>-- Pilih Jenis --</option>
                            {jenisProdukList.map((j, idx) => (
                              <option key={idx} value={j.fee}>{j.jenisProduk} ({j.fee}%)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {newProduct.statusToko && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Program Layanan Tambahan (Opsional)</label>
                        <div className="flex flex-wrap gap-3">
                          {programData.map(prog => (
                            <label key={prog.id} className="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                              <input type="checkbox" value={prog.fee} checked={newProduct.programs.includes(prog.fee)} onChange={(e) => handleProgramToggle(prog.fee, e.target.checked)} className="w-4 h-4 text-[#EE4D2D] rounded border-gray-300 focus:ring-[#EE4D2D]" />
                              <span className="ml-2 text-xs font-medium text-gray-700">{prog.nama} <span className="text-[#EE4D2D]">(+{prog.fee}%)</span></span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bagian 3: Ringkasan & Submit */}
                  <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="mb-4 md:mb-0">
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Harga Jual Akhir (Etalase)</div>
                      <div className="text-3xl font-extrabold text-[#EE4D2D]">{formatRp(finalHargaJual > 0 ? finalHargaJual : hppNum)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Total Potongan Platform: <span className="font-bold text-gray-700">{totalFeePercent.toFixed(1)}%</span>
                        {potonganAdmin > 0 && ` (-Rp${potonganAdmin})`}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      {editingProductId && (
                        <button type="button" onClick={handleCancelEditProduct} className="flex-1 md:flex-none bg-gray-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-600 transition shadow-md hover:shadow-lg">Batal</button>
                      )}
                      <button type="submit" className="flex-1 md:flex-none bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition shadow-md hover:shadow-lg flex items-center justify-center">
                        <Plus className="w-5 h-5 mr-2" /> {editingProductId ? 'Update Produk' : 'Simpan Produk'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Tabel Daftar Produk */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                   <h3 className="font-semibold text-gray-700 flex items-center"><Package className="w-5 h-5 mr-2"/> Daftar Inventaris Anda</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Modal (HPP)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target Profit</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Biaya Admin</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga Jual</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sisa Stok</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className={`hover:bg-gray-50 ${editingProductId === product.id ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-400">PRD-{product.id.toString().padStart(3, '0')}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{formatRp(product.hpp)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">{formatRp(product.profit)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-semibold">{product.feePercent}%</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-[#EE4D2D]">{formatRp(product.price)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${product.stock < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                            <button onClick={() => setRestockModal({ isOpen: true, productId: product.id, amount: '' })} className="text-green-600 hover:text-green-900 mr-3" title="Repeat Data Stock (Restock)">
                              <RefreshCcw className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900 mr-3" title="Edit Data">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900" title="Hapus Produk">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAMPILAN MANAJEMEN ASET */}
          {activeTab === 'assets' && (
            <div className="space-y-6 animate-fade-in">
              {/* Filter Section */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Mulai</label>
                      <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" value={assetFilter.startDate} onChange={(e) => setAssetFilter({...assetFilter, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Akhir</label>
                      <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" value={assetFilter.endDate} onChange={(e) => setAssetFilter({...assetFilter, endDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Pengeluaran</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" value={assetFilter.type} onChange={(e) => setAssetFilter({...assetFilter, type: e.target.value})}>
                        <option value="ALL">Semua Jenis</option>
                        <option value="OPEX">OPEX (Operasional)</option>
                        <option value="CAPEX">CAPEX (Aset Tetap)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAssetFilter({ type: 'ALL', startDate: '', endDate: '' })} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition">Reset</button>
                  </div>
                </div>
              </div>

              {/* Summary Cards Filtered */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-amber-800 text-sm font-bold flex items-center mb-1"><Filter className="w-4 h-4 mr-2"/>Total OPEX (Periode Terpilih)</h4>
                  <div className="text-2xl font-black text-amber-900">{formatRp(sumFilteredOpex)}</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-indigo-800 text-sm font-bold flex items-center mb-1"><Filter className="w-4 h-4 mr-2"/>Total Depresiasi CAPEX (Per Bulan)</h4>
                  <div className="text-2xl font-black text-indigo-900">{formatRp(sumFilteredCapexDepreciation)}</div>
                  <p className="text-xs text-indigo-600 mt-1">*Akumulasi beban penyusutan per bulan dari aset yang difilter</p>
                </div>
              </div>

              {/* Form Tambah Aset/Opex */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center border-b pb-3">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" /> {editingAssetId ? 'Edit Data Pengeluaran' : 'Catat Pengeluaran Baru'}
                </h3>
                <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis</label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500" value={newAsset.type} onChange={(e) => setNewAsset({...newAsset, type: e.target.value, depreciation: ''})}>
                      <option value="OPEX">OPEX (Operasional)</option>
                      <option value="CAPEX">CAPEX (Aset Tetap)</option>
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama / Keterangan</label>
                    <input type="text" placeholder="Cth: Tagihan" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} required />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nominal (Rp)</label>
                    <input type="number" placeholder="Rp 0" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newAsset.amount} onChange={(e) => setNewAsset({...newAsset, amount: e.target.value})} required />
                  </div>
                  {newAsset.type === 'CAPEX' && (
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Depresiasi (Bulan)</label>
                      <input type="number" placeholder="Cth: 12" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newAsset.depreciation} onChange={(e) => setNewAsset({...newAsset, depreciation: e.target.value})} required={newAsset.type === 'CAPEX'} />
                    </div>
                  )}
                  <div className={newAsset.type === 'CAPEX' ? 'lg:col-span-1' : 'lg:col-span-2'}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Tambahan</label>
                    <input type="text" placeholder="Opsional" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newAsset.description} onChange={(e) => setNewAsset({...newAsset, description: e.target.value})} />
                  </div>
                  <div className="lg:col-span-1 flex gap-2">
                    {editingAssetId && <button type="button" onClick={handleCancelEditAsset} className="w-1/3 bg-gray-500 text-white font-bold px-2 py-2 rounded-lg hover:bg-gray-600 transition shadow-sm text-sm" title="Batal Edit">X</button>}
                    <button type="submit" className={`${editingAssetId ? 'w-2/3' : 'w-full'} bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm text-sm`}>
                      {editingAssetId ? 'Update' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel Aset */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700 flex items-center"><Wallet className="w-5 h-5 mr-2"/> Riwayat Pencatatan (Filtered)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Item</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Depresiasi</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nominal Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAssets.length === 0 ? (
                        <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Tidak ada data sesuai filter.</td></tr>
                      ) : filteredAssets.map((asset) => (
                        <tr key={asset.id} className={`hover:bg-gray-50 ${editingAssetId === asset.id ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{asset.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-md ${asset.type === 'CAPEX' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                              {asset.type === 'CAPEX' ? <Building2 className="w-3 h-3 mr-1 mt-0.5"/> : <Coins className="w-3 h-3 mr-1 mt-0.5"/>} {asset.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{asset.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{asset.description || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {asset.type === 'CAPEX' && asset.depreciation ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-indigo-700">{asset.depreciation} Bulan</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{formatRp(Math.round(asset.amount / asset.depreciation))}/bln</span>
                              </div>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">- {formatRp(asset.amount)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                            <button onClick={() => handleEditAsset(asset)} className="text-blue-600 hover:text-blue-900 mr-3" title="Edit Data"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteAsset(asset.id)} className="text-red-600 hover:text-red-900" title="Hapus Data"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAMPILAN LAPORAN */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Filter Section untuk Laporan */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1"/> Tanggal Mulai</label>
                    <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" value={reportFilter.startDate} onChange={(e) => setReportFilter({...reportFilter, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1"/> Tanggal Akhir</label>
                    <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" value={reportFilter.endDate} onChange={(e) => setReportFilter({...reportFilter, endDate: e.target.value})} />
                  </div>
                </div>
                <button onClick={() => setReportFilter({ startDate: '', endDate: '' })} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition">Reset Filter</button>
              </div>

              {/* Kartu Ringkasan Keuangan Laba/Rugi (Berdasarkan Filter) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Omzet Filtered</div>
                    <div className="p-2 bg-blue-50 rounded-lg"><ArrowUpRight className="w-4 h-4 text-blue-600" /></div>
                  </div>
                  <div className="text-2xl font-black text-gray-800">{formatRp(reportTotalRevenue)}</div>
                  <div className="text-xs text-gray-400 mt-1">Dari {filteredTransactions.length} transaksi</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Laba Kotor Transaksi</div>
                    <div className="p-2 bg-emerald-50 rounded-lg"><Coins className="w-4 h-4 text-emerald-600" /></div>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{formatRp(totalLabaKotor)}</div>
                  <div className="text-xs text-gray-400 mt-1">(Omzet - HPP - Est. Biaya)</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total OPEX Filtered</div>
                    <div className="p-2 bg-amber-50 rounded-lg"><ArrowDownRight className="w-4 h-4 text-amber-600" /></div>
                  </div>
                  <div className="text-2xl font-black text-gray-800">{formatRp(reportTotalOpex)}</div>
                  <div className="text-xs text-gray-400 mt-1">Biaya Operasional</div>
                </div>
                <div className={`p-5 rounded-xl shadow-sm border ${labaOperasional >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className={`text-xs font-bold uppercase tracking-wider ${labaOperasional >= 0 ? 'text-green-700' : 'text-red-700'}`}>Laba Operasional Bersih</div>
                  </div>
                  <div className={`text-2xl font-black ${labaOperasional >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatRp(labaOperasional)}
                  </div>
                  <div className={`text-xs mt-1 ${labaOperasional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    (Laba Kotor - OPEX)
                  </div>
                </div>
              </div>

              {/* Laporan Detail Transaksi */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
               <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Laporan Detail Penjualan</h3>
               </div>
               
               {filteredTransactions.length === 0 ? (
                 <div className="p-10 text-center text-gray-500">Tidak ada data transaksi di periode ini.</div>
               ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">ID Transaksi</th>
                        <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Item Terjual</th>
                        <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase">Total Omzet</th>
                        <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase">Total HPP</th>
                        <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase">Est. Biaya Platform</th>
                        <th className="px-4 py-4 text-right text-xs font-medium text-blue-600 uppercase">Laba Bersih TRX</th>
                        <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-gray-50/50">
                      {filteredTransactions.map((trx) => {
                        const detail = getTrxDetails(trx);
                        return (
                          <tr key={trx.id} className="hover:bg-white">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-blue-600">{trx.id}</div>
                              <div className="text-xs text-gray-500">{trx.date}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              <ul className="list-disc pl-4 text-xs">
                                {trx.items.map((item, idx) => (
                                  <li key={idx}>{item.product.name} (x{item.qty})</li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">{formatRp(trx.total)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-500">- {formatRp(detail.totalHpp)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-500">- {formatRp(detail.totalFeeEstimasi)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-black text-emerald-600">{formatRp(detail.labaBersih)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              <button onClick={() => handleDeleteTransaction(trx.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Batalkan / Void Transaksi">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
                      <tr>
                        <td colSpan="2" className="px-4 py-4 text-right text-sm text-gray-700 uppercase">Total Keseluruhan Filtered:</td>
                        <td className="px-4 py-4 text-right text-sm text-gray-800">{formatRp(reportTotalRevenue)}</td>
                        <td className="px-4 py-4 text-right text-sm text-gray-500">- {formatRp(filteredTransactions.reduce((sum, t) => sum + getTrxDetails(t).totalHpp, 0))}</td>
                        <td className="px-4 py-4 text-right text-sm text-red-500">- {formatRp(filteredTransactions.reduce((sum, t) => sum + getTrxDetails(t).totalFeeEstimasi, 0))}</td>
                        <td className="px-4 py-4 text-right text-base text-emerald-700">{formatRp(totalLabaKotor)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
               )}
            </div>
            </div>
          )}

          {/* TAMPILAN PENGATURAN BIAYA (MASTER DATA) */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start">
                <Info className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800">
                  <strong>Master Data Kalkulator</strong>: Ubah data di bawah ini untuk memperbarui opsi biaya pada menu Tambah Produk.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
                  <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
                    <h3 className="font-bold text-gray-700 text-sm">Pohon Biaya Admin Platform</h3>
                    <div className="flex gap-2">
                      <button onClick={handleDownloadTemplate} className="flex items-center text-xs font-bold text-gray-600 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shadow-sm">
                        <Download className="w-4 h-4 mr-1" /> Template
                      </button>
                      <label className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition shadow-sm cursor-pointer mb-0">
                        <Upload className="w-4 h-4 mr-1" /> Upload
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleUploadExcel} />
                      </label>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 text-xs text-blue-800 border-b border-blue-100">
                    Format: <b>Status | Kategori | SubKategori | Jenis | Persen(%)</b>
                  </div>
                  <div className="flex-1 p-4 flex flex-col">
                    <textarea className="w-full h-full p-3 text-xs font-mono bg-slate-50 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 outline-none resize-none whitespace-pre leading-relaxed" spellCheck="false" value={masterDataText} onChange={(e) => setMasterDataText(e.target.value)}></textarea>
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl">
                    <span className={`text-xs text-green-600 font-bold flex items-center transition-opacity duration-300 ${saveSuccess ? 'opacity-100' : 'opacity-0'}`}><CheckCircle2 className="w-4 h-4 mr-1" /> Berhasil disimpan</span>
                    <button onClick={handleSaveMasterData} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold px-6 py-2 rounded-lg transition shadow-sm">Simpan</button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 p-4 border-b border-gray-200"><h3 className="font-bold text-gray-700 text-sm">Biaya Transaksi (Shopee Mall)</h3></div>
                    <div className="p-4">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Payment Fee Mall</span>
                        <div className="relative w-24">
                          <input type="number" step="0.1" className="w-full text-sm p-2 pr-6 border border-gray-300 rounded-lg text-right outline-none" value={paymentFeeMall} onChange={(e) => setPaymentFeeMall(parseFloat(e.target.value) || 0)} />
                          <span className="absolute right-2.5 top-2.5 text-gray-400 text-xs font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[350px]">
                    <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-gray-700 text-sm">Program Layanan Tambahan</h3>
                      <button onClick={addProgram} className="text-green-600 hover:text-green-800 text-xs font-bold px-3 py-1.5 rounded bg-green-100 hover:bg-green-200 transition"><Plus className="w-3 h-3 inline-block" /> Tambah</button>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-3">
                      {programData.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-gray-200">
                          <input type="text" className="flex-1 text-sm p-2 border border-gray-300 rounded-lg outline-none" value={item.nama} onChange={(e) => updateProgram(index, 'nama', e.target.value)} />
                          <div className="relative w-24 shrink-0">
                            <input type="number" step="0.1" className="w-full text-sm p-2 pr-6 border border-gray-300 rounded-lg text-right outline-none" value={item.fee} onChange={(e) => updateProgram(index, 'fee', e.target.value)} />
                            <span className="absolute right-2.5 top-2.5 text-gray-400 text-xs font-bold">%</span>
                          </div>
                          <button onClick={() => removeProgram(index)} className="text-red-400 p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal Restock */}
      {restockModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Tambah Stok (Restock)</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Masukkan jumlah stok yang masuk untuk <strong className="text-blue-600">{products.find(p => p.id === restockModal.productId)?.name}</strong>.</p>
              <div>
                <input 
                  type="number" 
                  placeholder="Contoh: 50" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-bold text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={restockModal.amount}
                  onChange={(e) => setRestockModal({...restockModal, amount: e.target.value})}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button onClick={() => setRestockModal({ isOpen: false, productId: null, amount: '' })} className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Batal</button>
              <button onClick={submitRestock} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700">Restock Data</button>
            </div>
          </div>
        </div>
      )}

      {/* Komponen Toast Notifikasi */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[70] px-6 py-3 rounded-xl shadow-2xl flex items-center animate-fade-in text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <Info className="w-5 h-5 mr-3" /> : <CheckCircle2 className="w-5 h-5 mr-3" />}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Komponen Modal Konfirmasi (Hapus) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">{confirmModal.title}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600">{confirmModal.message}</p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Batal</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Animasi Sederhana */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}
