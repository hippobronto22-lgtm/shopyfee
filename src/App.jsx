import React, { useState, useEffect, useRef } from 'react';
import { db as localDb, seedDatabase } from './db';
import { auth, db } from './firebase';
import shopeeFees from './shopee_fees.json';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { storageService } from './services/storage';
import { loginUser, logoutUser, getUserData, checkSubscriptionStatus } from './services/auth';
import { onAuthStateChanged } from 'firebase/auth';
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
  TrendingDown,
  ShoppingBag,
  Star,
  Download,
  Upload,
  User,
  UserPlus,
  Users,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Printer,
  Smartphone,
  ArrowRight,
  AlertTriangle,
  Database,
  Layout,
  CloudSync,
  Target,
  RefreshCw,
  Zap,
  History,
  FileJson,
  Layers,
  Award,
  Bluetooth,
  PackageSearch,
  ShieldCheck,
  AlertCircle,
  Store,
  Check,
  Menu,
  X
} from 'lucide-react';
import SuperadminPanel from './components/SuperadminPanel';



// Data master dihapus karena sudah menggunakan shopee_fees.json
const defaultProgramData = [
    { id: "1", nama: "Gratis Ongkir Xtra", fee: 4.0 },
    { id: "2", nama: "Promo Xtra", fee: 4.5 },
    { id: "3", nama: "Biaya Produk Pre Order", fee: 3.0 }
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
  const [isSyncing, setIsSyncing] = useState(false);

  // State Authentication
  const [currentUser, setCurrentUser] = useState(null);
  const isSuperadmin = currentUser?.role?.toLowerCase() === 'superadmin' || currentUser?.email === 'hippobronto22@gmail.com';
  const [subscriptionStatus, setSubscriptionStatus] = useState({ active: true, expired: false, warning: false });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const isNative = Capacitor.isNativePlatform();
  const ownerId = isNative ? null : currentUser?.uid;

  // State untuk navigasi menu
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardChartFilter, setDashboardChartFilter] = useState('Mingguan'); // 'Mingguan' | 'Bulanan' | 'Tahunan'
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('master');
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'Admin' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const mainRef = useRef(null);

  // State Notifikasi (Toast & Confirm)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // State Pencarian POS
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [posTransactionDate, setPosTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [activePosSubTab, setActivePosSubTab] = useState('kasir');  // 'kasir' | 'history'
  const [activeInventorySubTab, setActiveInventorySubTab] = useState('add'); // 'add' | 'list' | 'lowstock'
  const [activeAssetsSubTab, setActiveAssetsSubTab] = useState('add'); // 'add' | 'history'

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- 2. STATE DATABASE PRODUK & TRANSAKSI ---
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: [], orderFee: 1250,
    discountType: 'Rp', discountValue: '', voucherType: 'Rp', voucherValue: ''
  });
  const [jenisProdukSearchTerm, setJenisProdukSearchTerm] = useState('');
  const [showJenisProdukSuggestions, setShowJenisProdukSuggestions] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [restockModal, setRestockModal] = useState({ isOpen: false, productId: null, amount: '' });
  const [printModal, setPrintModal] = useState({ isOpen: false, transaction: null });

  // --- 3. STATE MANAJEMEN ASET & PENGELUARAN ---
  const [assets, setAssets] = useState([]);
  const [newAsset, setNewAsset] = useState({ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' });
  const [editingAssetId, setEditingAssetId] = useState(null);

  // State Filter Aset
  const [assetFilter, setAssetFilter] = useState({ type: 'ALL', startDate: '', endDate: '' });

  // State Filter Laporan
  const [reportFilter, setReportFilter] = useState({ startDate: '', endDate: '' });

  // --- 1. STATE MASTER DATA (DINAMIS) ---
  const [shopeeData, setShopeeData] = useState([]);

  const [programData, setProgramData] = useState([]);
  const [paymentFeeMall, setPaymentFeeMall] = useState(0);
  const [orderFee, setOrderFee] = useState(1250);

  // State untuk Impor Excel
  const [importConflicts, setImportConflicts] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
     if (isLoading || !isNative) return; // Only auto-save for Native Android App
     const saveSettings = async () => {
        try { 
          await storageService.put(storageService.TABLES.SETTINGS_GENERAL, { id: 'paymentFeeMall', value: paymentFeeMall }, ownerId); 
          await storageService.put(storageService.TABLES.SETTINGS_GENERAL, { id: 'orderFee', value: orderFee }, ownerId);
        } catch(err){ console.error(err); }
     };
     const timeout = setTimeout(saveSettings, 1000);
     return () => clearTimeout(timeout);
  }, [paymentFeeMall, orderFee, isLoading, isNative, ownerId]);

  const [masterDataText, setMasterDataText] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const text = shopeeData.map(d => `${d.statusToko} | ${d.kategori} | ${d.subKategori} | ${d.jenisProduk} | ${d.fee}`).join('\n');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (text) setMasterDataText(text);
}, [shopeeData]);

  const loadData = async (uid = null) => {
    try {
      setIsLoading(true);
      
      // 1. Seed Native (Android) if first time
      if (isNative) {
        await seedDatabase(shopeeFees, defaultProgramData, defaultProducts, defaultAssets);
      }

      // 2. Fetch all core data in parallel for speed
      const [shopeeArr, progArr, generalArr, prodArr, assetArr, trxArr] = await Promise.all([
        storageService.getAll(storageService.TABLES.SETTINGS_SHOPEE, uid),
        storageService.getAll(storageService.TABLES.SETTINGS_PROGRAM, uid),
        storageService.getAll(storageService.TABLES.SETTINGS_GENERAL, uid),
        storageService.getAll(storageService.TABLES.INVENTORY, uid),
        storageService.getAll(storageService.TABLES.ASSETS, uid),
        storageService.getAll(storageService.TABLES.TRANSACTIONS, uid)
      ]);

      // 3. AUTO-SEED / FALLBACK with Global Master support
      if (!isNative && uid) {
        // ALWAYS try to fetch GLOBAL first for SaaS
        const [globalShopee, globalProg, globalGen] = await Promise.all([
          storageService.getAll(storageService.TABLES.SETTINGS_SHOPEE, 'GLOBAL'),
          storageService.getAll(storageService.TABLES.SETTINGS_PROGRAM, 'GLOBAL'),
          storageService.getAll(storageService.TABLES.SETTINGS_GENERAL, 'GLOBAL')
        ]);

        let finalShopee = globalShopee.length > 0 ? globalShopee : (shopeeArr.length > 0 ? shopeeArr : shopeeFees);
        let finalProg = globalProg.length > 0 ? globalProg : (progArr.length > 0 ? progArr : defaultProgramData);
        let finalGeneral = globalGen.length > 0 ? globalGen : generalArr;

        setShopeeData(finalShopee);
        setProgramData(finalProg);

        // Handle general settings
        let valMall = 1.8;
        let valOrder = 1250;
        finalGeneral.forEach(d => {
          if (d.id === 'paymentFeeMall') valMall = d.value;
          if (d.id === 'orderFee') valOrder = d.value || 1250;
        });
        setPaymentFeeMall(valMall);
        setOrderFee(valOrder);
      } else {
        // Native or Guest
        setShopeeData(shopeeArr.length > 0 ? shopeeArr : shopeeFees);
        setProgramData(progArr.length > 0 ? progArr : defaultProgramData);
        
        let valMall = 1.8;
        let valOrder = 1250;
        generalArr.forEach(d => {
          if (d.id === 'paymentFeeMall') valMall = d.value;
          if (d.id === 'orderFee') valOrder = d.value || 1250;
        });
        setPaymentFeeMall(valMall);
        setOrderFee(valOrder);
      }

      // 4. Handle default special program if missing
      setProgramData(prev => {
        if (prev.length > 0 && !prev.find(p => p.nama === "Biaya Produk Pre Order")) {
          const newProg = { id: Date.now().toString(), nama: "Biaya Produk Pre Order", fee: 3.0 };
          storageService.add(storageService.TABLES.SETTINGS_PROGRAM, newProg, uid);
          return [...prev, newProg];
        }
        return prev;
      });

      setProducts(prodArr);
      setAssets(assetArr);
      setTransactions(trxArr.sort((a, b) => b.timestamp - a.timestamp));

      // 6. Native-only user management
      if (isNative) {
        const userArr = await storageService.getAll('users');
        setUsers(userArr.sort((a, b) => b.createdAt - a.createdAt));
        const savedUserId = localStorage.getItem('shopee_calc_user_id');
        if (savedUserId) {
          const activeUser = userArr.find(u => u.id === savedUserId);
          if (activeUser) setCurrentUser(activeUser);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error loading data", err);
      setIsLoading(false);
      showToast('Gagal memuat data. Periksa koneksi internet Anda.', 'error');
    }
  };

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    if (isNative) {
      loadData();
    } else {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userData = await getUserData(user);
          const fullUser = { ...user, ...userData };
          setCurrentUser(fullUser);
          const status = checkSubscriptionStatus(fullUser);
          setSubscriptionStatus(status);
          
          if (status.active || fullUser.role === 'superadmin') {
            loadData(user.uid);
          } else {
            setIsLoading(false);
          }
        } else {
          setCurrentUser(null);
          setSubscriptionStatus({ active: false, expired: false, warning: false });
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    }
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
      setIsSyncing(true);
      await storageService.clear(storageService.TABLES.SETTINGS_SHOPEE, ownerId);
      await storageService.bulkAdd(storageService.TABLES.SETTINGS_SHOPEE, parsed, ownerId);

      setShopeeData(parsed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsSyncing(false);
    } catch(err) { 
      console.error(err); 
      setIsSyncing(false);
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
      } catch(err) { 
        console.error(err);
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
    try { await storageService.update(storageService.TABLES.SETTINGS_PROGRAM, newProgs[index].id, { [field]: newProgs[index][field] }, ownerId); } catch(err){ console.error(err); }
  };
  const addProgram = async () => {
    const newProg = {id: Date.now().toString(), nama: 'Program Baru', fee: 0};
    setProgramData([...programData, newProg]);
    try { await storageService.add(storageService.TABLES.SETTINGS_PROGRAM, newProg, ownerId); } catch(err){ console.error(err); }
  };
  const removeProgram = async (index) => {
    const prog = programData[index];
    setProgramData(programData.filter((_, i) => i !== index));
    if(prog) try { await storageService.delete(storageService.TABLES.SETTINGS_PROGRAM, prog.id, ownerId); } catch(err){ console.error(err); }
  };


  // --- LOGIKA KASCADING DROPDOWN KALKULATOR TERINTEGRASI ---
  const statuses = [...new Set(shopeeData.map(d => d.statusToko))];
  const categories = [...new Set(shopeeData.filter(d => d.statusToko === newProduct.statusToko).map(d => d.kategori))];
  const subCategories = [...new Set(shopeeData.filter(d => d.statusToko === newProduct.statusToko && d.kategori === newProduct.kategori).map(d => d.subKategori))];
  const jenisProdukList = shopeeData.filter(d => d.statusToko === newProduct.statusToko && d.kategori === newProduct.kategori && d.subKategori === newProduct.subKategori);

  const handleStatusChange = (e) => {
    setNewProduct({...newProduct, statusToko: e.target.value, kategori: '', subKategori: '', jenisProduk: ''});
    setJenisProdukSearchTerm('');
  };

  const handleSelectJenisProduk = (item) => {
    setNewProduct({
      ...newProduct,
      kategori: item.kategori,
      subKategori: item.subKategori,
      jenisProduk: item.fee // simpan persen fee
    });
    setJenisProdukSearchTerm(item.jenisProduk);
    setShowJenisProdukSuggestions(false);
  };

  const filteredJenisProdukList = React.useMemo(() => {
    if (!jenisProdukSearchTerm || jenisProdukSearchTerm.length < 1) return [];
    const term = jenisProdukSearchTerm.toLowerCase();
    return shopeeData.filter(d => 
      d.statusToko === newProduct.statusToko && 
      (d.jenisProduk.toLowerCase().includes(term) || 
       d.kategori.toLowerCase().includes(term) ||
       d.subKategori.toLowerCase().includes(term))
    ).slice(0, 50); // Limit to 50 results for performance
  }, [shopeeData, newProduct.statusToko, jenisProdukSearchTerm]);

  const handleProgramToggle = (id, isChecked) => {
    if (isChecked) setNewProduct({...newProduct, programs: [...newProduct.programs, id]});
    else setNewProduct({...newProduct, programs: newProduct.programs.filter(f => f !== id)});
  };

  // --- MESIN HITUNG KALKULATOR ---
  const hppNum = parseFloat(newProduct.hpp) || 0;
  const profitNum = parseFloat(newProduct.profit) || 0;
  const orderFeeNum = parseFloat(newProduct.orderFee) || orderFee; // Use product specific or global default
  const adminFeePercent = parseFloat(newProduct.jenisProduk) || 0;
  const programFeePercent = newProduct.programs.reduce((sum, pVal) => {
    const prog = programData.find(pd => pd.id === pVal || pd.fee === pVal || pd.nama === pVal);
    return sum + (prog ? prog.fee : 0);
  }, 0);
  const paymentFeePercent = newProduct.statusToko === 'Shopee Mall' ? paymentFeeMall : 0;
  const totalFeePercent = adminFeePercent + programFeePercent + paymentFeePercent;

  const potonganAdmin = Math.round((hppNum + profitNum) * (adminFeePercent / 100));
  const potonganProgramRaw = newProduct.programs.reduce((total, pVal) => {
    const prog = programData.find(pd => pd.id === pVal || pd.fee === pVal || pd.nama === pVal);
    if (!prog) return total;
    let fee = (hppNum + profitNum) * (prog.fee / 100);
    if (prog.nama === "Gratis Ongkir Xtra") fee = Math.min(fee, 40000);
    if (prog.nama === "Promo Xtra") fee = Math.min(fee, 60000);
    return total + fee;
  }, 0);
  const potonganProgram = Math.round(potonganProgramRaw);
  const baseHargaBeforeFees = hppNum + profitNum + orderFeeNum + potonganAdmin + potonganProgram;
  const baseHarga = baseHargaBeforeFees / (1 - (paymentFeePercent / 100));
  
  const discountVal = parseFloat(newProduct.discountValue) || 0;
  const voucherVal = parseFloat(newProduct.voucherValue) || 0;
  
  const discountAmt = newProduct.discountType === 'Rp' ? discountVal : baseHarga * (discountVal / 100);
  const voucherAmt = newProduct.voucherType === 'Rp' ? voucherVal : baseHarga * (voucherVal / 100);
  
  const finalHargaJual = Math.ceil(baseHarga + discountAmt + voucherAmt || 0);
  const totalPotonganPaymentFee = Math.round(baseHarga * (paymentFeePercent / 100));

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
    const tDate = new Date(posTransactionDate);
    // Set time to mid-day to ensure it falls within the correct date in most timezones/filters
    tDate.setHours(12, 0, 0, 0);
    
    const newTransaction = {
      id: `TRX-${1000 + transactions.length + 1}`,
      date: tDate.toLocaleString('id-ID'),
      timestamp: tDate.getTime(),
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
    showToast('Data penjualan berhasil diinput!', 'success');
    
    // Receipt popup removed as per user request
    // setPrintModal({ isOpen: true, transaction: newTransaction });

    try {
      // For SaaS, we use Firestore. Dexie transaction is for local only.
      if (isNative) {
        await localDb.transaction('rw', [localDb.transactions, localDb.inventory], async () => {
          await localDb.transactions.add(newTransaction);
          // Update Stock
          for (const item of cart) {
            const p = products.find(p => p.id === item.product.id);
            if (p) {
              await localDb.inventory.update(p.id, { stock: p.stock });
            }
          }
        });
      } else {
        await storageService.add(storageService.TABLES.TRANSACTIONS, newTransaction, ownerId);
        for (const item of cart) {
          const p = updatedProducts.find(up => up.id === item.product.id);
          if (p) {
            await storageService.update(storageService.TABLES.INVENTORY, p.id.toString(), { stock: p.stock }, ownerId);
          }
        }
      }
      showToast('Transaksi berhasil disimpan!', 'success');
    } catch(err) { 
      console.error(err); 
      showToast('Gagal menyimpan ke database', 'error');
    }
  };

  const printReceipt = async (transaction) => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000af30-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      });

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      let printCharacteristic = null;
      
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            printCharacteristic = char;
            break;
          }
        }
        if (printCharacteristic) break;
      }

      if (!printCharacteristic) throw new Error('Printer tidak kompatibel.');

      const d = "--------------------------------\n";
      let receipt = "\x1B\x61\x01\x1B\x45\x01TokoKu POS\n\x1B\x45\x00Sahabat Belanja Anda\n\n\x1B\x61\x00";
      receipt += `No   : ${transaction.id}\n`;
      receipt += `Tgl  : ${transaction.date}\n`;
      receipt += `Kasir: ${currentUser ? currentUser.username : '-'}\n`;
      receipt += d;
      transaction.items.forEach(item => {
        receipt += `${item.product.name}\n`;
        receipt += `${item.qty} x ${formatRp(item.product.price)} = ${formatRp(item.qty * item.product.price)}\n`;
      });
      receipt += d;
      receipt += `\x1B\x61\x02TOTAL: ${formatRp(transaction.total)}\n`;
      receipt += "\x1B\x61\x01\nTerima Kasih!\n\n\n";

      const enc = new TextEncoder();
      const data = enc.encode(receipt);
      for (let i = 0; i < data.length; i += 100) {
        await printCharacteristic.writeValue(data.slice(i, i + 100));
      }
      showToast('Nota berhasil dicetak!', 'success');
      setPrintModal({ isOpen: false, transaction: null });
      if (currentUser?.role === 'Kasir') {
        setActiveTab('pos');
      } else {
        setActiveTab('reports');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mencetak: ' + err.message, 'error');
    }
  };


  // --- LOGIKA INVENTARIS ---
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const mandatoryFields = [
      { name: 'Nama Produk', val: newProduct.name },
      { name: 'Stok Awal', val: newProduct.stock },
      { name: 'Modal (HPP)', val: newProduct.hpp },
      { name: 'Target Profit', val: newProduct.profit },
      { name: 'Status Toko', val: newProduct.statusToko },
      { name: 'Jenis Produk', val: newProduct.jenisProduk }
    ];

    const missing = mandatoryFields.filter(f => !f.val);
    if (missing.length > 0) {
      return showToast(`Mohon lengkapi data mandatori: ${missing.map(m => m.name).join(', ')}`, 'error');
    }

    if (editingProductId) {
      const updatedProduct = {
        ...products.find(p=>p.id === editingProductId), name: newProduct.name, hpp: hppNum, profit: profitNum, feePercent: totalFeePercent, orderFee: orderFeeNum,
        discountType: newProduct.discountType, discountValue: newProduct.discountValue,
        voucherType: newProduct.voucherType, voucherValue: newProduct.voucherValue,
        potonganAdmin, potonganProgram, potonganPayment: totalPotonganPaymentFee,
        potonganDiskon: Math.round(discountAmt), potonganVoucher: Math.round(voucherAmt),
        price: finalHargaJual > 0 ? finalHargaJual : hppNum, stock: parseInt(newProduct.stock),
        statusToko: newProduct.statusToko, kategori: newProduct.kategori, subKategori: newProduct.subKategori,
        jenisProduk: newProduct.jenisProduk, programs: newProduct.programs
      };
      setProducts(products.map(p => p.id === editingProductId ? updatedProduct : p));
      setEditingProductId(null);
      try { await storageService.put(storageService.TABLES.INVENTORY, updatedProduct, ownerId); showToast('Data produk berhasil diperbarui!', 'success'); } catch(e){ console.error(e); }
    } else {
      const newId = Date.now();
      const productToAdd = { 
        id: newId, name: newProduct.name, hpp: hppNum, profit: profitNum, feePercent: totalFeePercent, orderFee: orderFeeNum,
        discountType: newProduct.discountType, discountValue: newProduct.discountValue,
        voucherType: newProduct.voucherType, voucherValue: newProduct.voucherValue,
        potonganAdmin, potonganProgram, potonganPayment: totalPotonganPaymentFee,
        potonganDiskon: Math.round(discountAmt), potonganVoucher: Math.round(voucherAmt),
        price: finalHargaJual > 0 ? finalHargaJual : hppNum, stock: parseInt(newProduct.stock),
        statusToko: newProduct.statusToko, kategori: newProduct.kategori, subKategori: newProduct.subKategori,
        jenisProduk: newProduct.jenisProduk, programs: newProduct.programs
      };
      setProducts([productToAdd, ...products]);
      try { await storageService.add(storageService.TABLES.INVENTORY, productToAdd, ownerId); showToast('Produk baru berhasil ditambahkan!', 'success'); } catch(e){ console.error(e); }
    }
    setNewProduct({ name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: [], orderFee: 0, discountType: 'Rp', discountValue: '', voucherType: 'Rp', voucherValue: '' });
  };

   const generateInventoryTemplate = () => {
    const excel = window.XLSX || XLSX;
    if (!excel) return showToast('Library Excel belum siap.', 'error');

    // Sheet 1: Input Data
    const programHeaders = programData.map(p => `Program: ${p.nama}`);
    const headers = ["Nama Produk", "Stok", "HPP", "Target Laba", "Status Toko", "Kategori", "Sub Kategori", "Jenis Produk (Admin Fee %)", ...programHeaders];
    const example = ["Contoh Produk A", 100, 50000, 10000, "Non-Star", "Pakaian", "Atasan", 5.5, ...programData.map(() => "N")];
    const ws1 = excel.utils.aoa_to_sheet([headers, example]);

    // Sheet 2: Panduan Biaya
    const guideData = [["STATUS TOKO", "KATEGORI", "SUB KATEGORI", "JENIS PRODUK", "FEE ADMIN (%)"]];
    shopeeData.forEach(d => {
      guideData.push([d.statusToko, d.kategori, d.subKategori, d.jenisProduk, d.fee]);
    });
    guideData.push([]);
    guideData.push(["PROGRAM TAMBAHAN", "FEE (%)"]);
    programData.forEach(p => {
      guideData.push([p.nama, p.fee]);
    });
    const ws2 = excel.utils.aoa_to_sheet(guideData);

    const wb = excel.utils.book_new();
    excel.utils.book_append_sheet(wb, ws1, "Input Data");
    excel.utils.book_append_sheet(wb, ws2, "Panduan Biaya");
    excel.writeFile(wb, "Template_Import_Produk.xlsx");
  };

  const handleImportInventoryExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const excel = window.XLSX || XLSX;
        if (!excel) return showToast('Library Excel belum siap.', 'error');

        setIsSyncing(true);
        const data = evt.target.result;
        const workbook = excel.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = excel.utils.sheet_to_json(sheet);

        const conflicts = [];
        const validProducts = [];
        let nextId = Date.now();
        const programHeaders = programData.map(p => `Program: ${p.nama}`);

        rows.forEach((row, index) => {
          const name = row["Nama Produk"];
          const stock = parseInt(row["Stok"]) || 0;
          const hpp = parseFloat(row["HPP"]) || 0;
          const profit = parseFloat(row["Target Laba"]) || 0;
          const statusToko = row["Status Toko"] || "";
          const kategori = row["Kategori"] || "";
          const subKategori = row["Sub Kategori"] || "";
          const adminFee = parseFloat(row["Jenis Produk (Admin Fee %)"]) || 0;

          if (!name || hpp <= 0) return;

          // Cek Duplikat (Nama + HPP)
          const isDuplicate = products.some(p => p.name === name && p.hpp === hpp);
          if (isDuplicate) {
            conflicts.push({ row: index + 2, name, hpp, reason: 'Sudah ada di sistem' });
            return;
          }

          // Program Tambahan
          const selectedPrograms = [];
          programHeaders.forEach((header, idx) => {
             if (row[header] === 'Y' || row[header] === 'y') {
               selectedPrograms.push(programData[idx].fee);
             }
          });

          // Kalkulasi Harga (Rumus dari App.jsx)
          const programFeePct = selectedPrograms.reduce((s, f) => s + f, 0);
          const payFeePct = statusToko === 'Shopee Mall' ? paymentFeeMall : 0;
          const totalFeePct = adminFee + programFeePct + payFeePct;
          
          const potAdmin = Math.round((hpp + profit) * (adminFee / 100));
          const potProg = Math.round((hpp + profit) * (programFeePct / 100));
          const base = (hpp + profit + potAdmin + potProg) / (1 - (payFeePct / 100));
          const finalH = Math.ceil(base || 0);

          validProducts.push({
            id: nextId++, name, stock, hpp, profit, statusToko, kategori, subKategori,
            jenisProduk: adminFee.toString(),
            programs: selectedPrograms,
            feePercent: totalFeePct,
            price: finalH > 0 ? finalH : hpp
          });
        });

        if (conflicts.length > 0) {
          setImportConflicts(conflicts);
        }

        if (validProducts.length > 0) {
          await storageService.bulkAdd(storageService.TABLES.INVENTORY, validProducts, ownerId);
          setProducts(prev => [...validProducts, ...prev]);

          showToast(`${validProducts.length} produk berhasil diimpor!`, 'success');
        } else if (conflicts.length === 0) {
          showToast('Tidak ada data valid untuk diimpor.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal memproses file Excel', 'error');
      } finally {
        setIsSyncing(false);
        setIsImporting(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportMasterDataExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const excel = window.XLSX || XLSX;
          const bstr = evt.target.result;
          const wb = excel.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = excel.utils.sheet_to_json(ws);

          if (data.length === 0) {
            setIsLoading(false);
            return showToast('File Excel kosong', 'error');
          }

          const uid = isNative ? null : (currentUser ? currentUser.uid : null);

          if (isNative) {
            await storageService.clear(storageService.TABLES.SETTINGS_SHOPEE);
            for (const item of data) {
              await storageService.add(storageService.TABLES.SETTINGS_SHOPEE, item);
            }
          } else {
            const { writeBatch, doc, collection } = await import('firebase/firestore');
            const chunks = [];
            for (let i = 0; i < data.length; i += 500) {
              chunks.push(data.slice(i, i + 500));
            }

            for (const chunk of chunks) {
              const batch = writeBatch(db);
              chunk.forEach((item) => {
                const newDocRef = doc(collection(db, storageService.TABLES.SETTINGS_SHOPEE));
                batch.set(newDocRef, { ...item, ownerId: uid });
              });
              await batch.commit();
            }
          }

          setShopeeData(data);
          showToast(`Berhasil mengimpor ${data.length} Master Data!`, 'success');
        } catch (err) {
          console.error(err);
          showToast('Gagal memproses file Excel', 'error');
        } finally {
          setIsLoading(false);
          e.target.value = null;
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      showToast('Gagal membaca file', 'error');
    }
  };

  const handleEditProduct = (product) => {
    setNewProduct({
      name: product.name, stock: product.stock.toString(), hpp: product.hpp.toString(), profit: product.profit.toString(),
      statusToko: product.statusToko || '', kategori: product.kategori || '', subKategori: product.subKategori || '',
      jenisProduk: product.jenisProduk || '', programs: product.programs || [], orderFee: product.orderFee || 0,
      discountType: product.discountType || 'Rp', discountValue: product.discountValue || '',
      voucherType: product.voucherType || 'Rp', voucherValue: product.voucherValue || ''
    });
    setEditingProductId(product.id);
    setActiveInventorySubTab('add');
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
        try { await storageService.delete(storageService.TABLES.INVENTORY, id.toString(), ownerId); showToast('Produk berhasil dihapus!', 'success'); } catch(e){ console.error(e); }
      }
    });
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setNewProduct({ name: '', stock: '', hpp: '', profit: '', statusToko: '', kategori: '', subKategori: '', jenisProduk: '', programs: [], orderFee: 0, discountType: 'Rp', discountValue: '', voucherType: 'Rp', voucherValue: '' });
  };

  const submitRestock = async () => {
    if(!restockModal.amount || isNaN(restockModal.amount)) return;
    const pId = restockModal.productId;
    const newStock = products.find(p => p.id === pId).stock + parseInt(restockModal.amount);
    setProducts(products.map(p => p.id === pId ? { ...p, stock: newStock } : p));
    setRestockModal({ isOpen: false, productId: null, amount: '' });
    try { await storageService.update(storageService.TABLES.INVENTORY, pId.toString(), { stock: newStock }, ownerId); showToast('Stok berhasil ditambahkan!', 'success'); } catch(e){ console.error(e); }
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
      setActiveAssetsSubTab('history');
      try { await storageService.put(storageService.TABLES.ASSETS, updatedAsset, ownerId); showToast('Data pengeluaran berhasil diperbarui!', 'success');} catch(e){ console.error(e); }
    } else {
      const newId = Date.now();
      const assetToAdd = {
        id: newId, type: newAsset.type, name: newAsset.name, amount: parseFloat(newAsset.amount),
        date: new Date().toLocaleDateString('id-ID'), timestamp: Date.now(),
        description: newAsset.description, depreciation: newAsset.type === 'CAPEX' ? parseInt(newAsset.depreciation) : null
      };
      setAssets([assetToAdd, ...assets]);
      setActiveAssetsSubTab('history');
      try { await storageService.add(storageService.TABLES.ASSETS, assetToAdd, ownerId); showToast('Data berhasil dicatat!', 'success'); } catch(e){ console.error(e); }
    }
    setNewAsset({ type: 'OPEX', name: '', amount: '', description: '', depreciation: '' });
  };

  const handleEditAsset = (asset) => {
    setNewAsset({
      type: asset.type, name: asset.name, amount: asset.amount.toString(),
      description: asset.description || '', depreciation: asset.depreciation ? asset.depreciation.toString() : ''
    });
    setEditingAssetId(asset.id);
    setActiveAssetsSubTab('add');
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAsset = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Pengeluaran',
      message: 'Yakin ingin menghapus data pengeluaran ini?',
      onConfirm: async () => {
        setAssets(assets.filter(a => a.id !== id));
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try { await storageService.delete(storageService.TABLES.ASSETS, id.toString(), ownerId); showToast('Data berhasil dihapus!', 'success'); } catch(e){ console.error(e); }
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

  // --- LOGIKA FILTER LAPORAN & PERHITUNGAN LAPA ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password) return showToast('Username dan Password wajib diisi!', 'error');

    try {
      if (editingUserId) {
        const updatedUser = { ...users.find(u => u.id === editingUserId), ...userForm };
        setUsers(users.map(u => u.id === editingUserId ? updatedUser : u));
        await storageService.update('users', editingUserId, userForm, ownerId);
        showToast('User berhasil diperbarui!', 'success');
        setEditingUserId(null);
      } else {
        const newId = `usr-${Date.now()}`;
        const newUser = { id: newId, ...userForm, createdAt: Date.now() };
        setUsers([newUser, ...users]);
        await storageService.add('users', newUser, ownerId);
        showToast('User baru berhasil didaftarkan!', 'success');
      }
      setUserForm({ username: '', password: '', role: 'Admin' });
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses data user', 'error');
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setUserForm({ username: user.username, password: user.password, role: user.role });
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setUserForm({ username: '', password: '', role: 'Admin' });
  };

  const handleDeleteUser = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus User',
      message: 'Apakah Anda yakin ingin menghapus akses user ini?',
      onConfirm: async () => {
        setUsers(users.filter(u => u.id !== id));
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try {
          await storageService.delete('users', id, ownerId);
          showToast('User berhasil dihapus!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Gagal menghapus user', 'error');
        }
      }
    });
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswordMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return showToast('Harap masukkan Username & Password', 'error');

    if (isNative) {
      const authUser = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
      if (authUser) {
        setCurrentUser(authUser);
        localStorage.setItem('shopee_calc_user_id', authUser.id);
        showToast(`Selamat datang, ${authUser.username}!`, 'success');
        if (authUser.role === 'Kasir') setActiveTab('pos');
        else setActiveTab('dashboard');
      } else {
        showToast('Username atau Password salah!', 'error');
      }
    } else {
      try {
        setIsLoading(true);
        // On SaaS, username is email
        await loginUser(loginForm.username, loginForm.password);
        showToast('Login berhasil!', 'success');
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        let msg = 'Email atau Password salah!';
        if (err.code === 'auth/user-not-found') msg = 'User tidak ditemukan!';
        if (err.code === 'auth/wrong-password') msg = 'Password salah!';
        showToast(msg, 'error');
      }
    }
  };

  const handleLogout = (force = false) => {
    const performLogout = async () => {
      if (isNative) {
        setCurrentUser(null);
        localStorage.removeItem('shopee_calc_user_id');
        setLoginForm({ username: '', password: '' });
        showToast('Anda telah berhasil keluar', 'success');
      } else {
        try {
          await logoutUser();
          showToast('Berhasil keluar', 'success');
        } catch (err) {
          showToast('Gagal keluar', 'error');
        }
      }
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    };

    if (force) {
      performLogout();
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'Konfirmasi Keluar',
        message: 'Apakah Anda yakin ingin keluar dari sistem?',
        onConfirm: performLogout
      });
    }
  };


  const handleExportExcel = () => {
    try {
      const summaryData = [
        ['LAPORAN RINGKASAN PENJUALAN'],
        ['Periode:', `${reportFilter.startDate || 'Semua'} s/d ${reportFilter.endDate || 'Semua'}`],
        [],
        ['Parameter', 'Nilai (IDR)'],
        ['Total Omzet (Filtered)', reportTotalRevenue],
        ['Total HPP', filteredTransactions.reduce((sum, t) => sum + getTrxDetails(t).totalHpp, 0)],
        ['Total Estimasi Fee Platform', filteredTransactions.reduce((sum, t) => sum + getTrxDetails(t).totalFeeEstimasi, 0)],
        ['Laba Kotor Transaksi', totalLabaKotor],
        ['Total OPEX (Operasional)', reportTotalOpex],
        ['Beban Amortisasi CAPEX (Aset)', reportTotalCapexRounded],
        ['Laba Operasional Bersih', labaOperasional],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      const trxData = [
        ['ID Transaksi', 'Tanggal', 'Item', 'Qty Total', 'Omzet', 'Total HPP', 'Fee Platform', 'Laba Bersih TRX']
      ];
      filteredTransactions.forEach(t => {
        const d = getTrxDetails(t);
        const itemNames = t.items.map(i => `${i.product.name} (x${i.qty})`).join(', ');
        trxData.push([t.id, t.date, itemNames, t.items.reduce((s, i) => s + i.qty, 0), t.total, d.totalHpp, d.totalFeeEstimasi, d.labaBersih]);
      });
      const wsTrx = XLSX.utils.aoa_to_sheet(trxData);

      const assetData = [
        ['Tanggal Pembelian', 'Jenis', 'Nama / Item', 'Lama Amortisasi (Bulan)', 'Nominal Total', 'Beban per Bulan', 'Beban Terhitung (Periode Filter)']
      ];
      assets.forEach(a => {
        let chargeInPeriod = 0;
        const fStart = reportFilter.startDate ? new Date(reportFilter.startDate).setHours(0,0,0,0) : 0;
        const fEnd = reportFilter.endDate ? new Date(reportFilter.endDate).setHours(23,59,59,999) : new Date().setHours(23,59,59,999);

        if (a.type === 'OPEX') {
          if (a.timestamp >= fStart && a.timestamp <= fEnd) chargeInPeriod = a.amount;
        } else if (a.type === 'CAPEX' && a.depreciation) {
          const mCost = a.amount / a.depreciation;
          const buyDate = new Date(a.timestamp);
          for (let i = 0; i < a.depreciation; i++) {
             const cTime = new Date(buyDate.getFullYear(), buyDate.getMonth() + i, 1).getTime();
             if (cTime >= fStart && cTime <= fEnd) chargeInPeriod += mCost;
          }
        }
        
        if (chargeInPeriod > 0 || !reportFilter.startDate) {
          assetData.push([a.date, a.type, a.name, a.depreciation || '-', a.amount, a.type === 'CAPEX' ? (a.amount/a.depreciation) : '-', chargeInPeriod]);
        }
      });
      const wsAssets = XLSX.utils.aoa_to_sheet(assetData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
      XLSX.utils.book_append_sheet(wb, wsTrx, 'Detail Transaksi');
      XLSX.utils.book_append_sheet(wb, wsAssets, 'Detail Pengeluaran');

      XLSX.writeFile(wb, `Laporan_Shopee_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Laporan Excel berhasil diunduh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh laporan Excel', 'error');
    }
  };

  const handleDeleteTransaction = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Transaksi',
      message: 'Apakah Anda yakin ingin menghapus transaksi ini? Stok produk akan dikembalikan.',
      onConfirm: async () => {
        try {
          const trx = transactions.find(t => t.id === id);
          if (!trx) return;

          const updatedProds = products.map(p => {
             const item = trx.items.find(i => i.product.id === p.id);
             return item ? { ...p, stock: p.stock + item.qty } : p;
          });

          if (isNative) {
            await localDb.transaction('rw', [localDb.transactions, localDb.inventory], async () => {
              await localDb.transactions.delete(id);
              for (const p of updatedProds) {
                await localDb.inventory.update(p.id, { stock: p.stock });
              }
            });
          } else {
            await storageService.delete(storageService.TABLES.TRANSACTIONS, id, ownerId);
            for (const item of trx.items) {
               const p = products.find(prod => prod.id === item.product.id);
               if (p) {
                 await storageService.update(storageService.TABLES.INVENTORY, p.id.toString(), { stock: p.stock + item.qty }, ownerId);
               }
            }
          }
          
          setProducts(updatedProds);
          setTransactions(transactions.filter(t => t.id !== id));
          showToast('Transaksi dibatalkan & Stok dikembalikan!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Gagal membatalkan transaksi', 'error');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
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
  
  // Logika Amortisasi CAPEX (Beban muncul setiap tanggal 1 bulan berjalan)
  const reportTotalCapex = assets.reduce((total, asset) => {
    if (asset.type !== 'CAPEX' || !asset.depreciation) return total;
    let amortAmount = 0;
    const monthlyCost = asset.amount / asset.depreciation;
    const buyDate = new Date(asset.timestamp);
    const fStart = reportFilter.startDate ? new Date(reportFilter.startDate).setHours(0,0,0,0) : 0;
    const fEnd = reportFilter.endDate ? new Date(reportFilter.endDate).setHours(23,59,59,999) : new Date().setHours(23,59,59,999);

    for (let i = 0; i < asset.depreciation; i++) {
      const chargeDate = new Date(buyDate.getFullYear(), buyDate.getMonth() + i, 1);
      const chargeTime = chargeDate.getTime();
      if (chargeTime >= fStart && chargeTime <= fEnd) amortAmount += monthlyCost;
    }
    return total + amortAmount;
  }, 0);
  
  const reportTotalCapexRounded = Math.round(reportTotalCapex);
  
  const getTrxDetails = (trx) => {
    let totalHpp = 0;
    let totalFeeEstimasi = 0;
    let totalOrderFee = 0;
    trx.items.forEach(item => {
      totalHpp += (item.product.hpp * item.qty);
      // Mengambil total fee platform per unit (Admin + Program + Payment) dari katalog
      const unitFeePlatform = (item.product.potonganAdmin || 0) + 
                              (item.product.potonganProgram || 0) + 
                              (item.product.potonganPayment || 0);
      totalFeeEstimasi += (unitFeePlatform * item.qty);
      totalOrderFee += ((item.product.orderFee || 0) * item.qty);
    });
    // Laba kotor per transaksi (Omzet - HPP)
    const labaKotorTrx = trx.total - totalHpp;
    return { totalHpp, totalFeeEstimasi, totalOrderFee, labaKotorTrx };
  };

  const reportTotalHpp = filteredTransactions.reduce((sum, trx) => sum + getTrxDetails(trx).totalHpp, 0);
  const reportTotalFeePlatform = filteredTransactions.reduce((sum, trx) => sum + getTrxDetails(trx).totalFeeEstimasi, 0);
  const totalLabaKotor = Math.round(reportTotalRevenue - reportTotalHpp);
  const totalLabaBersih = Math.round(totalLabaKotor - (reportTotalFeePlatform + reportTotalOpex + reportTotalCapexRounded));

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
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

  const formatRp = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number || 0);

  const today = new Date().toLocaleDateString('id-ID');
  const todaySales = transactions.filter(t => t.date.split(',')[0] === today).reduce((sum, trx) => sum + trx.total, 0);
  const totalProfit = transactions.reduce((sum, trx) => sum + getTrxDetails(trx).labaKotorTrx, 0);

  const chartData = (() => {
    let rawData = [];
    let labels = [];
    const now = new Date();
    
    if (dashboardChartFilter === 'Mingguan') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const startOfDay = new Date(d.setHours(0,0,0,0)).getTime();
        const endOfDay = new Date(d.setHours(23,59,59,999)).getTime();
        
        let sum = transactions.filter(t => t.timestamp >= startOfDay && t.timestamp <= endOfDay).reduce((a,b) => a+b.total, 0);
        rawData.push(sum);
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' }).substring(0,3);
        const dateNum = d.getDate();
        labels.push(`${dayName} ${dateNum}`);
      }
    } else if (dashboardChartFilter === 'Bulanan') {
      for(let i=3; i>=0; i--) {
         const dEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
         const dStart = new Date(dEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
         dStart.setHours(0,0,0,0);
         dEnd.setHours(23,59,59,999);
         let sum = transactions.filter(t => t.timestamp >= dStart.getTime() && t.timestamp <= dEnd.getTime()).reduce((a,b) => a+b.total, 0);
         rawData.push(sum);
         labels.push(`M-${4-i}`);
      }
    } else if (dashboardChartFilter === 'Tahunan') {
      for(let i=11; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStart = d.getTime();
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999).getTime();
        let sum = transactions.filter(t => t.timestamp >= mStart && t.timestamp <= mEnd).reduce((a,b) => a+b.total, 0);
        rawData.push(sum);
        labels.push(d.toLocaleDateString('id-ID', { month: 'short' }).substring(0,3));
      }
    }
    
    const maxVal = Math.max(...rawData, 1);
    return rawData.map((val, idx) => ({
      val, 
      label: labels[idx].toUpperCase(), 
      percent: Math.max((val / maxVal) * 100, 5),
      isToday: dashboardChartFilter === 'Mingguan' && idx === 6
    }));
  })();


  const handleResolveConflict = (conflictId, resolution) => {
    const updatedConflicts = importConflicts.filter(c => c.id !== conflictId);
    setImportConflicts(updatedConflicts);
    showToast(`Konflik diselesaikan dengan: ${resolution}`, 'success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-b-2 border-blue-400 rounded-full animate-spin-reverse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Calculator className="w-8 h-8 text-white/20" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 relative">
        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative z-10 flex flex-col items-center animate-scale-in">
          
          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-[1.5rem] overflow-hidden shadow-lg shadow-[#F15A24]/20">
            <img src="icon.png" alt="ShopyFee Logo" className="w-full h-full object-cover" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
            Shopy<span className="text-[#F15A24]">Fee</span>
          </h1>
          <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-10 text-center">
            Business Intelligence Suite
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Username Akun"
                  className="w-full bg-[#F4F5F7] border-none rounded-full py-4 pl-14 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#F15A24]/20 transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-[#F4F5F7] border-none rounded-full py-4 pl-14 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#F15A24]/20 transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium tracking-widest"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-4 bg-[#F15A24] hover:bg-[#E04812] text-white py-4 sm:py-5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-[#F15A24]/30 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
            >
              Masuk Sekarang <ArrowUpRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="mt-8 text-center relative z-10">
          <p className="text-[9px] font-bold text-slate-400/60 uppercase tracking-widest">
            © 2026 ShopyFee Business System • V.1.0 Premium
          </p>
        </div>
      </div>
    );
  }

  // Subscription Guard for Web
  if (!isNative && !subscriptionStatus.active && currentUser.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center bg-premium-mesh">
        <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-8 border border-error/20 animate-pulse">
           <AlertTriangle className="w-12 h-12 text-error" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-4">
          Access <span className="text-error">Suspended</span>
        </h1>
        <p className="max-w-md text-white/50 text-sm font-medium leading-relaxed mb-12">
          {subscriptionStatus.expired 
            ? "Masa langganan Anda telah berakhir. Silakan lakukan perpanjangan paket untuk melanjutkan akses ke data bisnis Anda." 
            : "Akun Anda saat ini sedang dinonaktifkan oleh administrator. Silakan hubungi tim dukungan kami."}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
           <a href="https://wa.me/your-number" className="btn-primary py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
             Hubungi Administrator <Smartphone className="w-4 h-4" />
           </a>
           <button onClick={() => handleLogout(true)} className="bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white/60 transition-all">
             Logout from Account
           </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body antialiased relative">

      {/* BACKDROP - Mobile/Tablet */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside className={`
        flex flex-col h-screen w-64 bg-surface-container-low py-6 gap-2 border-r border-outline-variant/20 shrink-0 
        fixed top-0 left-0 z-[60] transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:z-50
      `}>
        <div className="px-8 mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-extrabold tracking-tighter text-on-surface">Kalkulator Shopee</h1>
            <p className="text-xs text-on-surface-variant font-medium">Business Manager</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-on-surface-variant hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
          {(currentUser.role?.toLowerCase() === 'admin' || currentUser.role === 'Manager' || currentUser.role === 'superadmin') && (
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
              className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
                activeTab === 'dashboard' 
                  ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                  : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className={`truncate text-left ${activeTab === 'dashboard' ? 'font-semibold' : ''}`}>Dashboard</span>
            </button>
          )}

          {!isNative && (currentUser.role?.toLowerCase() === 'superadmin' || currentUser.email === 'hippobronto22@gmail.com') && (
            <button 
              onClick={() => { setActiveTab('superadmin'); setIsSidebarOpen(false); }} 
              className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
                activeTab === 'superadmin' 
                  ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                  : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className={`truncate text-left ${activeTab === 'superadmin' ? 'font-semibold' : ''}`}>Superadmin Panel</span>
            </button>
          )}


          <button 
            onClick={() => { setActiveTab('pos'); setIsSidebarOpen(false); }} 
            className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
              activeTab === 'pos' 
                ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
            }`}
          >
            <ShoppingBag className="w-5 h-5 shrink-0" />
            <span className={`truncate text-left ${activeTab === 'pos' ? 'font-semibold' : ''}`}>Input Data Penjualan</span>
          </button>

          {(currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'superadmin' || currentUser.email === 'hippobronto22@gmail.com') && (
            <button 
              onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }} 
              className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
                activeTab === 'inventory' 
                  ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                  : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
              }`}
            >
              <Package className="w-5 h-5 shrink-0" />
              <span className={`truncate text-left ${activeTab === 'inventory' ? 'font-semibold' : ''}`}>Input Data Produk</span>
            </button>
          )}

          {(currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'manager' || currentUser.role?.toLowerCase() === 'superadmin' || currentUser.email === 'hippobronto22@gmail.com') && (
            <button 
              onClick={() => { setActiveTab('assets'); setIsSidebarOpen(false); }} 
              className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
                activeTab === 'assets' 
                  ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                  : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
              }`}
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className={`truncate text-left ${activeTab === 'assets' ? 'font-semibold' : ''}`}>Input Biaya Capex & Opex</span>
            </button>
          )}

          {(currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'manager' || currentUser.role?.toLowerCase() === 'superadmin' || currentUser.email === 'hippobronto22@gmail.com') && (
             <button 
              onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
              className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
                activeTab === 'reports' 
                  ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                  : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              <span className={`truncate text-left ${activeTab === 'reports' ? 'font-semibold' : ''}`}>Laporan Penjualan</span>
            </button>
          )}
          
          {(currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'manager' || currentUser.role?.toLowerCase() === 'superadmin' || currentUser.email === 'hippobronto22@gmail.com') && (
            <button 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
              className={`group flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-xl ${
                activeTab === 'settings' 
                  ? 'text-primary bg-surface-container-lowest border-l-4 border-primary shadow-sm !rounded-l-none' 
                  : 'text-slate-600 font-medium hover:text-primary hover:bg-black/5'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className={`truncate text-left ${activeTab === 'settings' ? 'font-semibold' : ''}`}>Pengaturan</span>
            </button>
          )}
        </nav>

        <div className="px-8 mt-auto pt-6 border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
              {(isNative ? (currentUser.username || 'U') : (currentUser.businessName || currentUser.email || 'U')).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate capitalize">{isNative ? currentUser.username : (currentUser.businessName || currentUser.email)}</p>
              <p className="text-[10px] text-on-surface-variant/60 font-medium">{currentUser.role}</p>
            </div>
            <button onClick={handleLogout} className="text-on-surface-variant hover:text-error transition-colors shrink-0" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface ml-0 lg:ml-64">
        {!isNative && subscriptionStatus.warning && (
          <div className="bg-amber-500 text-white px-8 py-3 flex items-center justify-between animate-fade-in shrink-0">
             <div className="flex items-center gap-3">
               <AlertTriangle className="w-5 h-5" />
               <span className="text-[10px] font-black uppercase tracking-widest">
                 Masa aktif layanan berakhir dalam {subscriptionStatus.daysLeft} hari. Silakan lakukan perpanjangan.
               </span>
             </div>
             <a href="https://wa.me/your-number" target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all">
               Topup Sekarang
             </a>
          </div>
        )}

        
        {/* HEADER */}
        <header className="w-full h-16 flex justify-between items-center px-4 md:px-8 border-b border-outline-variant/20 bg-surface sticky top-0 z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-on-surface-variant hover:bg-black/5 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">
              {activeTab === 'pos' ? 'Input Data Penjualan' : 
               activeTab === 'superadmin' ? 'Superadmin Panel' :
               activeTab === 'settings' ? 'Pengaturan' : 
               activeTab === 'assets' ? 'Input Biaya Capex & Opex' : 
               activeTab === 'reports' ? 'Laporan Penjualan' :
               activeTab === 'inventory' ? 'Input Data Produk' : 'Dashboard'}
            </h2>
          </div>
        </header>

        {/* CONTENT */}
        <div ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto w-full scroll-smooth p-6 md:p-8 max-w-[1600px] mx-auto min-w-0">
          
          {/* TAMPILAN DASHBOARD */}
          {activeTab === 'superadmin' && !isNative && (currentUser.role?.toLowerCase() === 'superadmin' || currentUser.email === 'hippobronto22@gmail.com') && (
            <SuperadminPanel showToast={showToast} />
          )}

          {activeTab === 'dashboard' && (

            <div className="space-y-10 animate-fade-in pb-12 w-full max-w-[1600px] mx-auto">
              <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 mb-10 flex flex-col md:flex-row items-start justify-between group overflow-hidden relative">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <h2 className="text-3xl font-black text-on-surface tracking-tight">Enterprise Dashboard</h2>
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Operational insight & Profit analytics</p>
                </div>
                <div className="flex items-center gap-4 mt-6 md:mt-0 relative z-10">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">Today's Revenue</p>
                    <p className="text-xl font-black text-primary tracking-tight">{formatRp(todaySales)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-premium border border-outline-variant/5 text-primary">
                    <Calculator className="w-6 h-6" />
                  </div>
                </div>
                {/* Abstract Decorator */}
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none translate-x-1/2 skew-x-12 group-hover:translate-x-0 transition-transform duration-1000"></div>
              </div>

              {/* Metrics Bento Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
                {/* Metric 1: Revenue */}
                <div className="card-premium p-8 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary transition-transform group-hover:scale-110 duration-300">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] font-black">
                      <TrendingUp className="w-3 h-3" /> 12%
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-1">Total Penjualan</p>
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">{formatRp(totalRevenueAll)}</h3>
                </div>

                {/* Metric 2: Profit */}
                <div className="card-premium p-8 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary transition-transform group-hover:scale-110 duration-300">
                      <Target className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] font-black">
                      <TrendingUp className="w-3 h-3" /> 8.4%
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-1">Total Laba Bersih</p>
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">{formatRp(totalLabaBersih)}</h3>
                </div>

                {/* Metric 3: Transactions */}
                <div className="card-premium p-8 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary transition-transform group-hover:scale-110 duration-300">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-1">Total Transaksi</p>
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">{transactions.length} <span className="text-xs text-on-surface-variant font-medium">Order</span></h3>
                </div>

                {/* Metric 4: Low Stock or Total Products */}
                <div className={`card-premium p-8 group ${lowStockCount > 0 ? 'border-error/20' : ''}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${lowStockCount > 0 ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                      {lowStockCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    {lowStockCount > 0 && (
                      <div className="flex items-center gap-1 text-error bg-error/10 px-2 py-1 rounded-full text-[10px] font-black">
                        Warning
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-1">Stok Menipis</p>
                  <h3 className={`text-2xl font-black tracking-tight ${lowStockCount > 0 ? 'text-error' : 'text-on-surface'}`}>{lowStockCount} <span className="text-xs text-on-surface-variant font-medium">Produk</span></h3>
                </div>
              </div>

              {/* Dashboard Charts & Lists Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Section */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-1 structural-blade"></div>
                        <h4 className="text-lg font-bold text-on-surface">Grafik penjualan</h4>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:gap-2 p-1 bg-surface-container-low border border-outline-variant/10 rounded-lg max-w-full">
                        {['Mingguan', 'Bulanan', 'Tahunan'].map(tf => (
                          <button 
                            key={tf}
                            onClick={() => setDashboardChartFilter(tf)}
                            className={`flex-1 sm:flex-none text-[10px] sm:text-xs font-semibold px-2 sm:px-4 py-1.5 rounded-md transition-colors ${dashboardChartFilter === tf ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Simplified Visual Placeholder for Chart */}
                    <div className="relative h-64 w-full flex items-end justify-between gap-3 pt-4">
                      {chartData.map((d, index) => (
                        <div key={index} className="w-full flex flex-col justify-end group h-full">
                          <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity mb-2 text-xs font-bold text-primary whitespace-nowrap">
                            {formatRp(d.val)}
                          </div>
                          <div 
                            className={`w-full ${d.isToday ? 'bg-primary' : 'bg-primary/20'} rounded-t-lg transition-all duration-500 ease-out group-hover:bg-primary`}
                            style={{ height: `${d.percent}%` }}
                          ></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 px-1 gap-3">
                      {chartData.map((d, index) => (
                        <span key={index} className="w-full text-center text-[10px] font-bold text-on-surface-variant truncate">{d.label}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-1 structural-blade"></div>
                        <h4 className="text-lg font-bold text-on-surface">Transaksi Terakhir</h4>
                      </div>
                      <button onClick={() => setActiveTab('reports')} className="text-xs font-bold text-primary hover:underline">Lihat Semua</button>
                    </div>
                    <div className="space-y-4">
                      {/* Table Head */}
                      <div className="grid grid-cols-4 px-4 py-2 bg-surface-container-low rounded-lg text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                        <span>WAKTU</span>
                        <span>TRANSAKSI</span>
                        <span>TOTAL</span>
                        <span className="text-right">STATUS</span>
                      </div>
                      
                      {transactions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-on-surface-variant">Belum ada transaksi.</div>
                      ) : (
                        transactions.slice(0, 5).map(trx => (
                          <div key={trx.id} className="grid grid-cols-4 px-4 py-3 items-center hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer">
                            <span className="text-xs text-on-surface-variant">{trx.date.split(',')[0]}</span>
                            <div>
                               <span className="text-sm font-bold text-on-surface block">{trx.id}</span>
                               <span className="text-[10px] text-on-surface-variant">{trx.items.length} item(s)</span>
                            </div>
                            <span className="text-sm font-bold text-on-surface">{formatRp(trx.total)}</span>
                            <div className="text-right">
                              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">Selesai</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Side Panel (Popular Products) */}
                <div className="space-y-6">
                  <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-8 shrink-0">
                      <div className="w-1 structural-blade"></div>
                      <h4 className="text-lg font-bold text-on-surface">10 Produk Terlaris</h4>
                    </div>
                    
                    <div className="space-y-6 flex-1">
                      {topProducts.length === 0 ? (
                        <div className="flex items-center justify-center p-4 text-sm text-on-surface-variant h-full">Belum ada data penjualan.</div>
                      ) : (
                        topProducts.map((prod, i) => (
                          <div key={i} className="flex items-center gap-4 group cursor-pointer">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                               #{i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-on-surface mb-0.5 truncate" title={prod.name}>{prod.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium">{prod.qty} Terjual bulan ini</p>
                              <p className="text-xs font-extrabold text-primary mt-1">{formatRp(prod.revenue)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <button onClick={() => setActiveTab('reports')} className="w-full mt-10 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0">
                      Lihat Semua
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAMPILAN KASIR (POS) */}
          {activeTab === 'pos' && (
            <div className="flex flex-col gap-6 animate-fade-in w-full max-w-[1600px] mx-auto">
              {/* POS Sub-Navigation */}
              <div className="flex p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-fit">
                <button
                  onClick={() => setActivePosSubTab('kasir')}
                  className={`flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                    activePosSubTab === 'kasir' ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/50 hover:text-on-surface'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Kasir
                </button>
                <button
                  onClick={() => setActivePosSubTab('history')}
                  className={`flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                    activePosSubTab === 'history' ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/50 hover:text-on-surface'
                  }`}
                >
                  <Receipt className="w-4 h-4 mr-2" /> Riwayat
                  <span className="ml-2 bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">{transactions.length}</span>
                </button>
              </div>

              {/* SUB-TAB: KASIR */}
              {activePosSubTab === 'kasir' && (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Daftar Produk */}
                  <div className="flex-1 flex flex-col gap-6">
                    <div className="card-premium p-8">
                      <div className="flex flex-col md:flex-row gap-6 mb-8">
                        {/* Date Picker */}
                        <div className="w-full md:w-56">
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Tanggal Transaksi</label>
                          <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            <input 
                              type="date" 
                              className="input-premium pl-12 text-primary font-bold"
                              value={posTransactionDate}
                              onChange={(e) => setPosTransactionDate(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Search Bar POS */}
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Cari Produk</label>
                          <div className="relative">
                            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-on-surface-variant/40" />
                            <input 
                              type="text" 
                              placeholder="Cari berdasarkan nama atau kategori..." 
                              className="input-premium pl-12"
                              value={posSearchTerm}
                              onChange={(e) => setPosSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPosProducts.length === 0 ? (
                          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40">
                            <Search className="w-12 h-12 mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest">Produk tidak ditemukan</p>
                          </div>
                        ) : [...filteredPosProducts].sort((a,b) => {
                          const aSales = productSales[a.id]?.qty || 0;
                          const bSales = productSales[b.id]?.qty || 0;
                          return bSales - aSales;
                        }).map(product => (
                          <div 
                            key={product.id} 
                            onClick={() => addToCart(product)}
                            className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none border-slate-300 shadow-sm
                              ${product.stock === 0 
                                ? 'bg-surface-container-high/50 border-outline-variant/10 opacity-60 pointer-events-none' 
                                : 'bg-surface-container-lowest hover:border-primary/40 hover:shadow-premium-hover active:scale-[0.97]'}`}
                          >
                            <h4 className="font-bold text-on-surface text-sm line-clamp-2 min-h-[2.5rem] leading-tight mb-4 group-hover:text-primary transition-colors">{product.name}</h4>
                            <div className="mt-auto flex items-end justify-between">
                              <div>
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Harga</p>
                                <p className="text-primary font-black text-lg leading-none">{formatRp(product.price)}</p>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${product.stock < 10 ? 'bg-error/10 text-error' : 'bg-primary/5 text-primary'}`}>
                                Stok: {product.stock}
                              </div>
                            </div>
                            {product.stock > 0 && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                  <Plus className="w-4 h-4" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Keranjang (Cart) */}
                  <div className="w-full md:w-[320px] lg:w-[400px] shrink-0">
                    <div className="card-premium p-8 sticky top-24">
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-on-surface tracking-tight">Data Penjualan</h3>
                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Keranjang Belanja</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-full border border-primary/10">
                          {cart.reduce((s, i) => s + i.qty, 0)} Items
                        </div>
                      </div>

                      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar mb-8">
                        {cart.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center opacity-30 text-center">
                            <ShoppingCart className="w-12 h-12 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Keranjang masih kosong</p>
                          </div>
                        ) : (
                          cart.map(item => (
                            <div key={item.product.id} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 group transition-all hover:bg-white hover:shadow-sm">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{item.product.name}</p>
                                <p className="text-xs font-medium text-on-surface-variant/60">
                                  {formatRp(item.product.price)} <span className="mx-1 opacity-30">×</span> 
                                  <span className="text-primary font-black">{item.qty}</span>
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-on-surface">{formatRp(item.product.price * item.qty)}</p>
                                <button 
                                  onClick={() => removeFromCart(item.product.id)} 
                                  className="text-error/40 hover:text-error p-1 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-4 pt-6 border-t border-outline-variant/10">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">Total Tagihan</p>
                          <p className="text-2xl font-black text-primary tracking-tighter">{formatRp(calculateTotal())}</p>
                        </div>
                        <button 
                          onClick={handleCheckout} 
                          disabled={cart.length === 0} 
                          className="w-full btn-primary py-4 text-base tracking-[0.2em] shadow-primary/20"
                        >
                          INPUT DATA
                        </button>
                        <p className="text-center text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">Transaksi Aman & Terenkripsi</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB: RIWAYAT TRANSAKSI */}
              {activePosSubTab === 'history' && (
                <div className="animate-fade-in space-y-6">
                  <div className="flex items-center justify-between mb-2 px-2">
                    <div>
                      <h3 className="text-xl font-black text-on-surface tracking-tight">Riwayat Transaksi</h3>
                      <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Aktivitas Hari Ini</p>
                    </div>
                    <div className="px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                      {transactions.length} Total Trx
                    </div>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="card-premium py-32 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6 opacity-20">
                        <Receipt className="w-10 h-10" />
                      </div>
                      <p className="text-sm font-black text-on-surface-variant/40 uppercase tracking-widest">Belum ada transaksi tercatat</p>
                    </div>
                  ) : (
                    <div className="card-premium overflow-hidden border border-outline-variant/10 shadow-premium">
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-surface-container-high/50 border-b border-outline-variant/10">
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">ID Transaksi</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Tanggal</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Rincian Produk</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Total Tagihan</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Status</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5 bg-white">
                            {transactions.map(trx => (
                              <tr key={trx.id} className="group hover:bg-primary/5 transition-colors">
                                <td className="px-6 py-6 text-[10px] font-black text-primary uppercase tracking-widest">{trx.id}</td>
                                <td className="px-6 py-6 text-xs font-bold text-on-surface flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-on-surface-variant/40" />
                                  {trx.date}
                                </td>
                                <td className="px-6 py-6">
                                  <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar pr-2">
                                    {trx.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-[11px]">
                                        <span className="font-medium text-on-surface-variant truncate max-w-[150px]">{item.product.name}</span>
                                        <span className="font-black text-on-surface ml-4">x{item.qty}</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <span className="text-sm font-black text-primary tracking-tight">{formatRp(trx.total)}</span>
                                </td>
                                <td className="px-6 py-6">
                                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black rounded-lg border border-emerald-500/10">SELESAI</span>
                                </td>
                                <td className="px-6 py-6 text-center">
                                  <div className="flex justify-center">
                                    <button
                                      onClick={() => setPrintModal({ isOpen: true, transaction: trx })}
                                      className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all border border-outline-variant/5"
                                      title="Cetak Ulang"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAMPILAN MANAJEMEN PRODUK */}
          {activeTab === 'inventory' && (
            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-20">
              
              {/* Inventory Sub-Navigation & Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-fit">
                  <button
                    onClick={() => setActiveInventorySubTab('add')}
                    className={`flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                      activeInventorySubTab === 'add' ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/50 hover:text-on-surface'
                    }`}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Input Produk
                  </button>
                  <button
                    onClick={() => setActiveInventorySubTab('list')}
                    className={`flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                      activeInventorySubTab === 'list' ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/50 hover:text-on-surface'
                    }`}
                  >
                    <Package className="w-4 h-4 mr-2" /> Katalog Produk
                    <span className="ml-2 bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">{(products || []).length}</span>
                  </button>
                  <button
                    onClick={() => setActiveInventorySubTab('lowstock')}
                    className={`flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                      activeInventorySubTab === 'lowstock'
                        ? 'bg-white text-error shadow-premium'
                        : 'text-error/60 hover:text-error hover:bg-error/5'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Stok Menipis
                    <span className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activeInventorySubTab === 'lowstock' ? 'bg-error/10 text-error' : 'bg-error/5 text-error/40'
                    }`}>
                      {lowStockCount || 0}
                    </span>
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={generateInventoryTemplate}
                    className="flex items-center px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-lowest text-on-surface-variant border border-outline-variant/10 hover:border-primary/20 hover:text-primary transition-all duration-300 shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" /> Template
                  </button>
                  <label className="flex items-center px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary-dark transition-all duration-300 shadow-premium cursor-pointer mb-0">
                    {isImporting ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Impor Excel
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportInventoryExcel} disabled={isImporting} />
                  </label>
                </div>
              </div>

              {/* SUB-TAB: STOK MENIPIS */}
              {activeInventorySubTab === 'lowstock' && (
                <div className="animate-fade-in space-y-6">
                  <div className="bg-error/5 border border-error/10 rounded-2xl p-6 flex items-start gap-4">
                    <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center text-error shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-error uppercase tracking-widest mb-1">Peringatan Restock</h4>
                      <p className="text-xs font-medium text-error/70 leading-relaxed">
                        Produk-produk di bawah ini memiliki stok kurang dari 10 unit. Segera lakukan penambahan stok untuk menjaga kelancaran operasional toko Anda.
                      </p>
                    </div>
                  </div>

                  {((products || []).filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock).length === 0) ? (
                    <div className="card-premium py-32 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h4 className="text-sm font-black text-on-surface uppercase tracking-widest mb-2">Semua Stok Aman</h4>
                      <p className="text-xs font-medium text-on-surface-variant/40">Tidak ada produk dengan stok kritis saat ini.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {(products || [])
                        .filter(p => p.stock < 10)
                        .sort((a, b) => a.stock - b.stock)
                        .map(product => (
                          <div key={product.id} className="card-premium p-6 flex flex-col group transition-all border-error/10">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-error uppercase tracking-widest mb-1">ID: {product.id.toString().slice(-6)}</p>
                                <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-error transition-colors">{product.name}</h4>
                              </div>
                              <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${product.stock === 0 ? 'bg-error text-white' : 'bg-error/10 text-error'}`}>
                                {product.stock === 0 ? 'Habis' : `${product.stock} Unit`}
                              </div>
                            </div>

                            <div className="pt-6 border-t border-outline-variant/10 flex items-center justify-between mt-auto">
                              <div>
                                <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Harga Satuan</p>
                                <p className="text-lg font-black text-primary tracking-tight">{formatRp(product.price)}</p>
                              </div>
                              <button
                                onClick={() => setRestockModal({ isOpen: true, productId: product.id, amount: '' })}
                                className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                                title="Restock Sekarang"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: INPUT PRODUK BARU */}
              {activeInventorySubTab === 'add' && (
                <div className="space-y-8">
                  <div className="card-premium p-8 sm:p-10">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-outline-variant/10">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                        {editingProductId ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-on-surface tracking-tight">
                          {editingProductId ? 'Modifikasi Data Produk' : 'Registrasi Produk Baru'}
                        </h3>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Manajemen Inventaris & Harga</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddProduct} className="space-y-8">
                      {/* Bagian 1: Info Dasar */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Nama Produk <span className="text-error">*</span></label>
                          <input 
                            type="text" 
                            placeholder="Contoh: Kopi Susu Literan Signature" 
                            className="input-premium" 
                            value={newProduct.name} 
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} 
                            required 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Stok Tersedia <span className="text-error">*</span></label>
                          <input 
                            type="number" 
                            placeholder="Jumlah unit" 
                            className="input-premium" 
                            value={newProduct.stock} 
                            onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} 
                            required 
                          />
                        </div>
                      </div>

                      {/* Bagian 2: Kalkulator Modal & Profit Dinamis */}
                      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-8 space-y-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Calculator className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Intelligence Calculator <span className="text-[10px] text-on-surface-variant/40 font-bold lowercase italic">(Platform Fee & Profit)</span></h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Biaya Modal (HPP) <span className="text-error">*</span></label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">Rp</span>
                              <input 
                                type="number" 
                                placeholder="0" 
                                className="input-premium pl-10" 
                                value={newProduct.hpp} 
                                onChange={(e) => setNewProduct({...newProduct, hpp: e.target.value})} 
                                required 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Target Keuntungan <span className="text-error">*</span></label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">Rp</span>
                              <input 
                                type="number" 
                                placeholder="0" 
                                className="input-premium pl-10 text-primary font-bold" 
                                value={newProduct.profit} 
                                onChange={(e) => setNewProduct({...newProduct, profit: e.target.value})} 
                                required 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] ml-1">Diskon Produk</label>
                              <div className="flex p-0.5 bg-surface-container-high rounded-lg border border-outline-variant/10">
                                <button type="button" onClick={() => setNewProduct({...newProduct, discountType: 'Rp'})} className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${newProduct.discountType === 'Rp' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40'}`}>Rp</button>
                                <button type="button" onClick={() => setNewProduct({...newProduct, discountType: '%'})} className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${newProduct.discountType === '%' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40'}`}>%</button>
                              </div>
                            </div>
                            <div className="relative">
                              {newProduct.discountType === 'Rp' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">Rp</span>}
                              <input 
                                type="number" 
                                placeholder="0" 
                                className={`input-premium ${newProduct.discountType === 'Rp' ? 'pl-10' : ''}`} 
                                value={newProduct.discountValue} 
                                onChange={(e) => setNewProduct({...newProduct, discountValue: e.target.value})} 
                              />
                              {newProduct.discountType === '%' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">%</span>}
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] ml-1">Voucher Seller</label>
                              <div className="flex p-0.5 bg-surface-container-high rounded-lg border border-outline-variant/10">
                                <button type="button" onClick={() => setNewProduct({...newProduct, voucherType: 'Rp'})} className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${newProduct.voucherType === 'Rp' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40'}`}>Rp</button>
                                <button type="button" onClick={() => setNewProduct({...newProduct, voucherType: '%'})} className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${newProduct.voucherType === '%' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40'}`}>%</button>
                              </div>
                            </div>
                            <div className="relative">
                              {newProduct.voucherType === 'Rp' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">Rp</span>}
                              <input 
                                type="number" 
                                placeholder="0" 
                                className={`input-premium ${newProduct.voucherType === 'Rp' ? 'pl-10' : ''}`} 
                                value={newProduct.voucherValue} 
                                onChange={(e) => setNewProduct({...newProduct, voucherValue: e.target.value})} 
                              />
                              {newProduct.voucherType === '%' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">%</span>}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                          <div className="space-y-6">
                            <div>
                              <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">1. Status Toko <span className="text-error">*</span></label>
                              <select 
                                className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]" 
                                style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`}}
                                value={newProduct.statusToko} 
                                onChange={handleStatusChange}
                              >
                                <option value="" disabled>-- Pilih Status Akun Shopee --</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            
                            {newProduct.statusToko && (
                              <div className="relative group animate-fade-in-up">
                                <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">2. Pencarian Jenis Produk <span className="text-error">*</span></label>
                                <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
                                  <input 
                                    type="text"
                                    placeholder="Ketik kategori produk Anda..."
                                    className="input-premium pl-12 font-bold text-primary"
                                    value={jenisProdukSearchTerm}
                                    onChange={(e) => {
                                      setJenisProdukSearchTerm(e.target.value);
                                      setShowJenisProdukSuggestions(true);
                                    }}
                                    onFocus={() => setShowJenisProdukSuggestions(true)}
                                  />
                                </div>

                                {showJenisProdukSuggestions && jenisProdukSearchTerm && (
                                  <div className="absolute z-[60] left-0 right-0 mt-3 bg-white border border-outline-variant/10 rounded-2xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar animate-scale-in origin-top">
                                    {filteredJenisProdukList.length === 0 ? (
                                      <div className="p-8 text-center flex flex-col items-center justify-center opacity-30">
                                        <Search className="w-8 h-8 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Kategori tidak ditemukan</p>
                                      </div>
                                    ) : (
                                      filteredJenisProdukList.map((item, idx) => (
                                        <div 
                                          key={idx} 
                                          onClick={() => handleSelectJenisProduk(item)}
                                          className="p-5 hover:bg-primary/5 cursor-pointer border-b border-outline-variant/5 last:border-0 transition-all group"
                                        >
                                          <div className="flex justify-between items-center mb-1">
                                            <div className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{item.jenisProduk}</div>
                                            <div className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">FEE {item.fee}%</div>
                                          </div>
                                          <div className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">{item.kategori} <span className="mx-1 opacity-20">•</span> {item.subKategori}</div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="bg-surface-container-high/30 rounded-2xl p-6 space-y-4 border border-outline-variant/5">
                            <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Info className="w-3 h-3" /> Auto-Categorization Result
                            </p>
                            {newProduct.kategori ? (
                              <div className="animate-fade-in space-y-3">
                                <div>
                                  <p className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest mb-1">Kategori</p>
                                  <div className="text-xs font-bold text-on-surface bg-white/50 px-3 py-2 rounded-xl border border-outline-variant/10">{newProduct.kategori}</div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest mb-1">Sub-Kategori</p>
                                  <div className="text-xs font-bold text-on-surface bg-white/50 px-3 py-2 rounded-xl border border-outline-variant/10">{newProduct.subKategori}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="py-6 flex flex-col items-center justify-center opacity-20 text-center">
                                <PackageSearch className="w-8 h-8 mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Kategori akan tampil otomatis</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {newProduct.statusToko && (
                          <div className="pt-4">
                            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4 ml-1">Program Layanan Aktif <span className="text-[9px] text-on-surface-variant/30 lowercase italic">(Pilih yang Anda ikuti)</span></label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {programData.map(prog => (
                                <label key={prog.id} className={`group flex items-center p-4 rounded-2xl cursor-pointer transition-all border duration-300 ${newProduct.programs.includes(prog.id) ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white border-outline-variant/10 hover:border-primary/20'}`}>
                                  <div className="relative flex items-center justify-center w-5 h-5 mr-4">
                                    <input 
                                      type="checkbox" 
                                      value={prog.id} 
                                      checked={newProduct.programs.includes(prog.id)} 
                                      onChange={(e) => handleProgramToggle(prog.id, e.target.checked)} 
                                      className="peer appearance-none w-5 h-5 border-2 border-outline-variant/20 rounded-md checked:bg-primary checked:border-primary transition-all" 
                                    />
                                    <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{prog.nama}</p>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">+{prog.fee}% Fee</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bagian 3: Ringkasan & Submit */}
                      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-surface-container-high/40 p-8 sm:p-10 rounded-[2rem] border border-outline-variant/10 shadow-inner">
                        <div className="w-full lg:w-auto">
                          <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-3 ml-1">Kalkulasi Harga Jual Akhir</p>
                          <div className="flex items-baseline gap-4 mb-4">
                            <div className="text-4xl sm:text-5xl font-black text-primary tracking-tighter">{formatRp(finalHargaJual > 0 ? finalHargaJual : hppNum)}</div>
                            <div className="text-xs font-black text-on-surface-variant/30 uppercase tracking-widest">/ Per Unit</div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/50 rounded-2xl border border-outline-variant/10">
                            <div>
                              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Biaya Proses</p>
                              <p className="text-xs font-bold text-on-surface">{formatRp(orderFeeNum)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Promo Aktif</p>
                              <p className="text-xs font-bold text-on-surface">{formatRp(discountAmt + voucherAmt)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Fee Platform</p>
                              <p className="text-xs font-bold text-error">{totalFeePercent.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Profit Bersih</p>
                              <p className="text-xs font-bold text-primary">{formatRp(profitNum)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                          {editingProductId && (
                            <button 
                              type="button" 
                              onClick={handleCancelEditProduct} 
                              className="w-full sm:w-auto px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:bg-error/10 hover:text-error transition-all duration-300"
                            >
                              Batalkan
                            </button>
                          )}
                          <button 
                            type="submit" 
                            className="w-full sm:w-auto btn-primary px-12 py-5 text-base tracking-[0.2em] shadow-primary/20"
                          >
                            <Plus className="w-6 h-6 mr-3" /> {editingProductId ? 'UPDATE DATA' : 'REGISTRASI PRODUK'}
                          </button>
                        </div>
                      </div>
                    </form>
                    </div>
                  </div>
              )}

              {/* SUB-TAB: KATALOG PRODUK */}
              {activeInventorySubTab === 'list' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <div>
                      <h3 className="text-xl font-black text-on-surface tracking-tight">Katalog Produk</h3>
                      <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Total {(products || []).length} Produk Terdaftar</p>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {(products || []).map((product) => (
                        <div key={product.id} className={`card-premium p-6 flex flex-col group transition-all ${editingProductId === product.id ? 'border-primary shadow-premium' : ''}`}>
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">ID: {product.id.toString().slice(-6)} • {product.statusToko}</p>
                              <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{product.name}</h4>
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${product.stock < 10 ? 'bg-error/10 text-error' : 'bg-primary/5 text-primary'}`}>
                              Stok: {product.stock}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Modal (HPP)</p>
                              <p className="text-sm font-bold text-on-surface">{formatRp(product.hpp)}</p>
                            </div>
                            <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
                              <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">Profit Est.</p>
                              <p className="text-sm font-black text-primary">{formatRp(product.profit)}</p>
                            </div>
                          </div>

                          <div className="space-y-3 mb-8 flex-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-black text-on-surface-variant/40 uppercase tracking-widest">Fee Platform ({product.feePercent}%)</span>
                              <span className="font-bold text-error">-{formatRp((product.potonganAdmin || 0) + (product.potonganProgram || 0) + (product.potonganPayment || 0))}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-black text-on-surface-variant/40 uppercase tracking-widest">Biaya Ops / Promo</span>
                              <span className="font-bold text-on-surface-variant">-{formatRp((product.orderFee || 0) + (product.potonganDiskon || 0) + (product.potonganVoucher || 0))}</span>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Harga Jual Etalase</p>
                              <p className="text-xl font-black text-primary tracking-tight">{formatRp(product.price)}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setRestockModal({ isOpen: true, productId: product.id, amount: '' })} 
                                className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-outline-variant/5" 
                                title="Restock"
                              >
                                <RefreshCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEditProduct(product)} 
                                className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-outline-variant/5" 
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)} 
                                className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all border border-outline-variant/5" 
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
              )}

            </div>
          )}

          {/* TAMPILAN MANAJEMEN ASET */}
          {activeTab === 'assets' && (
            <div className="space-y-8 animate-fade-in w-full max-w-[1600px] mx-auto">

              {/* Assets Sub-Navigation */}
              <div className="flex flex-wrap gap-1 p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-full md:w-fit overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveAssetsSubTab('add')}
                  className={`flex items-center px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeAssetsSubTab === 'add' ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/50 hover:text-on-surface'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-2" /> Catat Pengeluaran
                </button>
                <button
                  onClick={() => setActiveAssetsSubTab('history')}
                  className={`flex items-center px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeAssetsSubTab === 'history' ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/50 hover:text-on-surface'
                  }`}
                >
                  <Wallet className="w-4 h-4 mr-2" /> Riwayat Pengeluaran
                </button>
              </div>

              {/* SUB-TAB: CATAT PENGELUARAN */}
              {activeAssetsSubTab === 'add' && (
                <div className="space-y-8">
                  <div className="card-premium p-8 sm:p-10">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-outline-variant/10">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                        {editingAssetId ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-on-surface tracking-tight">
                          {editingAssetId ? 'Modifikasi Pengeluaran' : 'Catat Pengeluaran Baru'}
                        </h3>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Manajemen Arus Kas & Aset</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddAsset} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Kategori</label>
                          <select 
                            className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]" 
                            style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`}}
                            value={newAsset.type} 
                            onChange={(e) => setNewAsset({...newAsset, type: e.target.value, depreciation: ''})}
                          >
                            <option value="OPEX">OPEX (Operasional)</option>
                            <option value="CAPEX">CAPEX (Aset Tetap)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Nama / Keterangan <span className="text-error">*</span></label>
                          <input type="text" placeholder="Cth: Tagihan Listrik / Pembelian Laptop" className="input-premium" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Nominal Transaksi <span className="text-error">*</span></label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">Rp</span>
                            <input type="number" placeholder="0" className="input-premium pl-10" value={newAsset.amount} onChange={(e) => setNewAsset({...newAsset, amount: e.target.value})} required />
                          </div>
                        </div>
                        {newAsset.type === 'CAPEX' && (
                          <div className="animate-fade-in">
                            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Masa Depresiasi (Bulan) <span className="text-error">*</span></label>
                            <input type="number" placeholder="Cth: 12 / 24 / 48" className="input-premium" value={newAsset.depreciation} onChange={(e) => setNewAsset({...newAsset, depreciation: e.target.value})} required={newAsset.type === 'CAPEX'} />
                          </div>
                        )}
                        <div className={newAsset.type === 'CAPEX' ? 'md:col-span-1 lg:col-span-2' : 'md:col-span-2 lg:col-span-2'}>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Catatan Tambahan</label>
                          <input type="text" placeholder="Informasi pendukung (opsional)" className="input-premium" value={newAsset.description} onChange={(e) => setNewAsset({...newAsset, description: e.target.value})} />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        {editingAssetId && (
                          <button 
                            type="button" 
                            onClick={handleCancelEditAsset} 
                            className="flex-1 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:bg-error/10 hover:text-error transition-all duration-300"
                          >
                            Batal
                          </button>
                        )}
                        <button 
                          type="submit" 
                          className="flex-[2] btn-primary py-5 text-base tracking-[0.2em] shadow-primary/20"
                        >
                          <Plus className="w-6 h-6 mr-3" /> {editingAssetId ? 'UPDATE PENGELUARAN' : 'CATAT TRANSAKSI'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* SUB-TAB: RIWAYAT PENGELUARAN */}
              {activeAssetsSubTab === 'history' && (
                <div className="space-y-8">
                  <div className="card-premium p-8">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Tanggal Mulai</label>
                          <input type="date" className="input-premium" value={assetFilter.startDate} onChange={(e) => setAssetFilter({...assetFilter, startDate: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Tanggal Akhir</label>
                          <input type="date" className="input-premium" value={assetFilter.endDate} onChange={(e) => setAssetFilter({...assetFilter, endDate: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Kategori Pengeluaran</label>
                          <select 
                            className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]" 
                            style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`}}
                            value={assetFilter.type} 
                            onChange={(e) => setAssetFilter({...assetFilter, type: e.target.value})}
                          >
                            <option value="ALL">Semua Jenis</option>
                            <option value="OPEX">OPEX (Operasional)</option>
                            <option value="CAPEX">CAPEX (Aset Tetap)</option>
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAssetFilter({ type: 'ALL', startDate: '', endDate: '' })} 
                        className="w-full xl:w-auto px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:text-primary transition-all duration-300"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-premium p-8 bg-gradient-to-br from-amber-50 to-white border-amber-100 group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
                          <TrendingDown className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-amber-800/60 uppercase tracking-[0.2em]">Total OPEX</h4>
                          <p className="text-xs font-bold text-amber-800/40 italic">Periode Terpilih</p>
                        </div>
                      </div>
                      <div className="text-3xl font-black text-amber-900 tracking-tighter mb-2">{formatRp(sumFilteredOpex)}</div>
                      <div className="h-1.5 w-full bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>

                    <div className="card-premium p-8 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-indigo-800/60 uppercase tracking-[0.2em]">Depresiasi CAPEX</h4>
                          <p className="text-xs font-bold text-indigo-800/40 italic">Akumulasi per Bulan</p>
                        </div>
                      </div>
                      <div className="text-3xl font-black text-indigo-900 tracking-tighter mb-2">{formatRp(sumFilteredCapexDepreciation)}</div>
                      <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <div>
                        <h3 className="text-xl font-black text-on-surface tracking-tight">Riwayat Pengeluaran</h3>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Manajemen Inventaris & Aset</p>
                      </div>
                    </div>

                    <div className="card-premium overflow-hidden border border-outline-variant/10 shadow-premium">
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-surface-container-high/50 border-b border-outline-variant/10">
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Tanggal</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Kategori</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Nama Pengeluaran</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Depresiasi</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Nominal</th>
                              <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {filteredAssets.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="py-24 text-center">
                                  <div className="flex flex-col items-center justify-center opacity-30">
                                    <Wallet className="w-12 h-12 mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">Tidak ada data transaksi ditemukan</p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filteredAssets.map((asset) => (
                                <tr key={asset.id} className={`group hover:bg-primary/5 transition-colors ${editingAssetId === asset.id ? 'bg-primary/5' : ''}`}>
                                  <td className="px-6 py-6 text-xs font-bold text-on-surface-variant">{asset.date}</td>
                                  <td className="px-6 py-6">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${asset.type === 'CAPEX' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {asset.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="text-sm font-bold text-on-surface mb-0.5">{asset.name}</div>
                                    <div className="text-[10px] text-on-surface-variant/60 font-medium italic truncate max-w-[200px]">{asset.description || 'Tidak ada catatan'}</div>
                                  </td>
                                  <td className="px-6 py-6">
                                    {asset.type === 'CAPEX' && asset.depreciation ? (
                                      <div className="flex flex-col">
                                        <span className="text-xs font-black text-indigo-600">{formatRp(Math.round(asset.amount / asset.depreciation))} <span className="text-[9px] opacity-40 font-bold">/bln</span></span>
                                        <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">({asset.depreciation} bln)</span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-on-surface-variant/20">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-6">
                                    <span className="text-sm font-black text-error tracking-tight">{formatRp(asset.amount)}</span>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="flex justify-center gap-2">
                                      <button onClick={() => handleEditAsset(asset)} className="w-9 h-9 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-outline-variant/5">
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteAsset(asset.id)} className="w-9 h-9 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all border border-outline-variant/5">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAMPILAN LAPORAN */}
          {activeTab === 'reports' && (
            <div className="space-y-8 animate-fade-in w-full max-w-[1600px] mx-auto">
              
              {/* Filter Section untuk Laporan */}
              <div className="card-premium p-8">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-2xl">
                    <div>
                      <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Rentang Tanggal Mulai</label>
                      <input type="date" className="input-premium" value={reportFilter.startDate} onChange={(e) => setReportFilter({...reportFilter, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Rentang Tanggal Akhir</label>
                      <input type="date" className="input-premium" value={reportFilter.endDate} onChange={(e) => setReportFilter({...reportFilter, endDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-4 w-full xl:w-auto">
                    <button 
                      onClick={() => setReportFilter({ startDate: '', endDate: '' })} 
                      className="flex-1 xl:flex-none px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:text-primary transition-all duration-300"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={handleExportExcel} 
                      className="flex-1 xl:flex-none px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/10 flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" /> Ekspor Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Kartu Ringkasan Keuangan Laba/Rugi (Berdasarkan Filter) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                <div className="card-premium p-6 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Revenue</div>
                  </div>
                  <h4 className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">Total Omzet</h4>
                  <div className="text-xl font-black text-on-surface tracking-tighter mb-2">{formatRp(reportTotalRevenue)}</div>
                  <p className="text-[10px] text-on-surface-variant/40 font-bold">{filteredTransactions.length} Transaksi</p>
                </div>

                <div className="card-premium p-6 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">COGS</div>
                  </div>
                  <h4 className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">Total HPP</h4>
                  <div className="text-xl font-black text-on-surface tracking-tighter mb-2">{formatRp(reportTotalHpp)}</div>
                  <p className="text-[10px] text-on-surface-variant/40 font-bold">Modal Terjual</p>
                </div>

                <div className="card-premium p-6 group border-primary/20 bg-primary/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Gross</div>
                  </div>
                  <h4 className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Laba Kotor</h4>
                  <div className="text-xl font-black text-primary tracking-tighter mb-2">{formatRp(totalLabaKotor)}</div>
                  <p className="text-[10px] text-primary/40 font-bold">Omzet - HPP</p>
                </div>

                <div className="card-premium p-6 group border-error/10 bg-error/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-error rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-error/20">
                      <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-black text-error/60 uppercase tracking-widest">Expense</div>
                  </div>
                  <h4 className="text-[10px] font-black text-error/60 uppercase tracking-widest mb-1">Total OPEX</h4>
                  <div className="text-xl font-black text-error tracking-tighter mb-2">{formatRp(reportTotalOpex)}</div>
                  <p className="text-[10px] text-error/40 font-bold">Operasional Toko</p>
                </div>

                <div className="card-premium p-6 group border-purple-100 bg-purple-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-purple-200">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Amortization</div>
                  </div>
                  <h4 className="text-[10px] font-black text-purple-600/60 uppercase tracking-widest mb-1">CAPEX</h4>
                  <div className="text-xl font-black text-purple-900 tracking-tighter mb-2">{formatRp(reportTotalCapexRounded)}</div>
                  <p className="text-[10px] text-purple-400 font-bold">Penyusutan Aset</p>
                </div>

                <div className={`card-premium p-6 group ${totalLabaBersih >= 0 ? 'bg-primary border-primary shadow-premium shadow-primary/20' : 'bg-error border-error shadow-premium shadow-error/20'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      {totalLabaBersih >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Net</div>
                  </div>
                  <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Laba Bersih</h4>
                  <div className="text-xl font-black text-white tracking-tighter mb-2">{formatRp(totalLabaBersih)}</div>
                  <p className="text-[10px] text-white/40 font-bold">Setelah Semua Biaya</p>
                </div>
              </div>

              {/* Laporan Detail Transaksi */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <h3 className="text-xl font-black text-on-surface tracking-tight">Detail Penjualan</h3>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Rincian Per Transaksi</p>
                  </div>
                </div>
                
                {filteredTransactions.length === 0 ? (
                  <div className="card-premium py-32 flex flex-col items-center justify-center text-center opacity-30">
                    <Receipt className="w-12 h-12 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Tidak ada data transaksi di periode ini</p>
                  </div>
                ) : (
                <div className="card-premium overflow-hidden border border-outline-variant/10 shadow-premium">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-surface-container-high/50 border-b border-outline-variant/10">
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">ID & Tanggal</th>
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Rincian Produk</th>
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Omzet</th>
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">HPP</th>
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Fee Platform</th>
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Profit Bersih</th>
                          <th className="px-6 py-5 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5 bg-white">
                        {filteredTransactions.map((trx) => {
                          const detail = getTrxDetails(trx);
                          return (
                            <tr key={trx.id} className="group hover:bg-primary/5 transition-colors">
                              <td className="px-6 py-6">
                                <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{trx.id}</div>
                                <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 text-on-surface-variant/30" />
                                  {trx.date}
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar pr-2">
                                  {trx.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                      <span className="font-medium text-on-surface-variant truncate max-w-[150px]">{item.product.name}</span>
                                      <span className="font-black text-on-surface ml-4">x{item.qty}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="text-sm font-bold text-on-surface">{formatRp(detail.totalRevenue || trx.total)}</div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="text-sm font-bold text-on-surface-variant/60">{formatRp(detail.totalHpp)}</div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-error">-{formatRp(detail.totalFeeEstimasi)}</span>
                                  <span className="text-[9px] text-on-surface-variant/40 font-medium">B. Proses: {formatRp(detail.totalOrderFee)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="text-base font-black text-primary tracking-tight">{formatRp(detail.labaBersih)}</div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => setPrintModal({ isOpen: true, transaction: trx })}
                                    className="w-9 h-9 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all border border-outline-variant/5"
                                    title="Cetak Ulang"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(trx.id)}
                                    className="w-9 h-9 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-error transition-all border border-outline-variant/5"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}

          {/* TAMPILAN PENGATURAN BIAYA (MASTER DATA) */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-fade-in w-full max-w-[1600px] mx-auto">
              
              {/* Sub-Navigation Master Data */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-surface-container-low p-2 rounded-3xl shadow-premium border border-outline-variant/10">
                <div className="flex p-1 bg-surface-container-high rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                  {[
                    { id: 'master', label: 'Master Biaya', icon: Calculator },
                    isNative ? { id: 'user', label: 'User Management', icon: Users } : null,
                    !isNative ? { id: 'subscription', label: 'Subscription', icon: Calendar } : null,
                    { id: 'about', label: 'About', icon: Info }
                  ].filter(Boolean).map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveSettingsSubTab(tab.id)}
                      className={`flex-1 md:flex-none flex items-center justify-center px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeSettingsSubTab === tab.id ? 'bg-white text-primary shadow-premium' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-2" /> {tab.label}
                    </button>
                  ))}
                </div>
                <div className="hidden md:flex items-center text-[10px] font-black text-on-surface-variant/20 uppercase tracking-[0.2em] px-6">
                  Master Data Engine
                </div>
              </div>

              {/* VIEW: MASTER BIAYA */}
              {activeSettingsSubTab === 'master' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-8">
                      <div className="card-premium p-8">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Global Variables</h3>
                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Standard Fees</p>
                          </div>
                        </div>

                         <div className="space-y-6">
                           <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/5 group hover:border-primary/20 transition-all">
                             <div className="flex items-center justify-between">
                               <div>
                                 <span className="text-xs font-bold text-on-surface tracking-tight">Payment Fee Mall</span>
                                 <p className="text-[10px] text-on-surface-variant/60 italic">Biaya transaksi kartu/spaylater</p>
                               </div>
                               <div className="relative w-28">
                                 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-on-surface-variant/40">%</span>
                                 <input 
                                  type="number" step="0.1" 
                                  className={`input-premium py-2.5 pr-10 text-right ${!isSuperadmin ? 'bg-surface-container-low cursor-not-allowed' : ''}`} 
                                  value={paymentFeeMall} 
                                  onChange={(e) => isSuperadmin && setPaymentFeeMall(parseFloat(e.target.value) || 0)} 
                                  readOnly={!isSuperadmin}
                                 />
                               </div>
                             </div>
                           </div>
                           
                           <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/5 group hover:border-primary/20 transition-all">
                             <div className="flex items-center justify-between">
                               <div>
                                 <span className="text-xs font-bold text-on-surface tracking-tight">Handling Fee</span>
                                 <p className="text-[10px] text-on-surface-variant/60 italic">Biaya proses pesanan internal</p>
                               </div>
                               <div className="relative w-36">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-on-surface-variant/40">Rp</span>
                                 <input 
                                  type="number" 
                                  className={`input-premium py-2.5 pl-10 text-right ${!isSuperadmin ? 'bg-surface-container-low cursor-not-allowed' : ''}`} 
                                  value={orderFee} 
                                  onChange={(e) => isSuperadmin && setOrderFee(parseInt(e.target.value) || 0)} 
                                  readOnly={!isSuperadmin}
                                 />
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
 
                       <div className="card-premium flex flex-col h-[320px]">
                         <div className="p-6 bg-surface-container-high/50 border-b border-outline-variant/10 flex justify-between items-center">
                           <div>
                             <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Extra Services</h3>
                             <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Optional Programs</p>
                           </div>
                           {isSuperadmin && (
                            <button onClick={addProgram} className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                              <Plus className="w-5 h-5" />
                            </button>
                           )}
                         </div>
                         <div className="p-6 overflow-y-auto space-y-4">
                           {programData.map((item, index) => (
                             <div key={item.id} className="flex items-center gap-4 animate-scale-in">
                               <input 
                                type="text" 
                                className={`flex-1 input-premium py-2.5 px-4 text-xs font-bold ${!isSuperadmin ? 'bg-surface-container-low' : ''}`} 
                                placeholder="Nama Program" 
                                value={item.nama} 
                                onChange={(e) => isSuperadmin && updateProgram(index, 'nama', e.target.value)} 
                                readOnly={!isSuperadmin}
                               />
                               <div className="relative w-24 shrink-0">
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-on-surface-variant/40">%</span>
                                 <input 
                                  type="number" step="0.1" 
                                  className={`w-full input-premium py-2.5 pr-8 text-right text-xs ${!isSuperadmin ? 'bg-surface-container-low' : ''}`} 
                                  value={item.fee} 
                                  onChange={(e) => isSuperadmin && updateProgram(index, 'fee', e.target.value)} 
                                  readOnly={!isSuperadmin}
                                 />
                               </div>
                               {isSuperadmin && (
                                <button onClick={() => removeProgram(index)} className="w-10 h-10 bg-error/5 text-error hover:bg-error hover:text-white rounded-xl transition-all flex items-center justify-center shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                               )}
                             </div>
                           ))}
                         </div>
                       </div>

                      {/* Master Data View (Read Only for Customers, Broadcast via Superadmin) */}
                      <div className="card-premium p-8 lg:col-span-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                              <Database className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Master Data Shopee Fees</h3>
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest italic">Daftar tarif yang sedang aktif digunakan untuk perhitungan</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <textarea 
                            className="input-premium font-mono text-[10px] h-64 leading-relaxed bg-surface-container-low" 
                            value={masterDataText} 
                            readOnly={true}
                            placeholder="Data tarif belum tersedia..."
                          />
                          <p className="text-[9px] font-medium text-on-surface-variant/40 text-center italic">
                            *Tarif di atas dikelola secara pusat oleh Superadmin untuk menjamin akurasi perhitungan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

               {/* VIEW: SUBSCRIPTION (SaaS Only) */}
               {!isNative && activeSettingsSubTab === 'subscription' && (
                 <div className="animate-fade-in space-y-8">
                    <div className="card-premium p-10 flex flex-col md:flex-row items-center gap-12">
                       <div className="relative">
                          <div className={`w-32 h-32 rounded-3xl flex items-center justify-center border-2 ${subscriptionStatus.active ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-error/5 border-error/20 text-error'}`}>
                             <ShieldCheck className="w-16 h-16" />
                          </div>
                          {subscriptionStatus.active && (
                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white border-4 border-surface shadow-lg">
                               <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                       </div>
                       <div className="flex-1 text-center md:text-left space-y-4">
                          <div>
                            <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase italic">Status <span className="text-primary">Langganan</span></h3>
                            <p className="text-sm text-on-surface-variant font-medium">Informasi paket layanan aktif Anda saat ini.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Masa Aktif Berakhir</p>
                                <p className="text-sm font-black text-on-surface">
                                  {currentUser.subscriptionEnd ? new Date(currentUser.subscriptionEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                                </p>
                             </div>
                             <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Status Pembayaran</p>
                                <p className={`text-sm font-black uppercase ${subscriptionStatus.active ? 'text-emerald-500' : 'text-error'}`}>
                                  {subscriptionStatus.active ? 'TERBAYAR' : 'NON-AKTIF'}
                                </p>
                             </div>
                          </div>
                          <div className="pt-4">
                             <a href="https://wa.me/your-number" target="_blank" rel="noreferrer" className="btn-primary px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3">
                                <Smartphone className="w-4 h-4" /> Perpanjang Layanan (WhatsApp)
                             </a>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {/* VIEW: USER MANAGEMENT */}
               {isNative && activeSettingsSubTab === 'user' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="card-premium p-8 sm:p-10">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-outline-variant/10">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                        {editingUserId ? <Pencil className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-on-surface tracking-tight">
                          {editingUserId ? 'Modifikasi Akses' : 'Daftarkan Pengguna'}
                        </h3>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Otoritas & Keamanan Sistem</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddUser} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Username <span className="text-error">*</span></label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                            <input 
                              type="text" 
                              className="input-premium pl-10"
                              placeholder="kasir_utama"
                              value={userForm.username}
                              onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Password <span className="text-error">*</span></label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                            <input 
                              type="password" 
                              className="input-premium pl-10"
                              placeholder="••••••••"
                              value={userForm.password}
                              onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2 ml-1">Hak Akses <span className="text-error">*</span></label>
                          <select 
                            className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]" 
                            style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`}}
                            value={userForm.role}
                            onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                            required
                          >
                            <option value="Admin">Administrator (Full Access)</option>
                            <option value="Kasir">Staff Kasir (POS Only)</option>
                            <option value="Manager">Manager (Reports & Insights)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        {editingUserId && (
                          <button 
                            type="button" 
                            onClick={handleCancelEditUser}
                            className="flex-1 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-300"
                          >
                            Batal
                          </button>
                        )}
                        <button 
                          type="submit" 
                          className="flex-[2] btn-primary py-5 text-base tracking-[0.2em] shadow-primary/20"
                        >
                          <UserPlus className="w-6 h-6 mr-3" /> {editingUserId ? 'UPDATE HAK AKSES' : 'TAMBAH PENGGUNA'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <div>
                        <h3 className="text-xl font-black text-on-surface tracking-tight">Katalog Pengguna</h3>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{users.length} Akun Terdaftar</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {users.map((user) => (
                        <div key={user.id} className="card-premium p-6 flex flex-col group transition-all">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg shadow-sm">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-on-surface">{user.username}</h4>
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Dibuat: {user.createdAt || 'N/A'}</p>
                              </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 
                              user.role === 'Manager' ? 'bg-indigo-100 text-indigo-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {user.role}
                            </div>
                          </div>

                          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 mb-8">
                            <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Credentials</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-on-surface-variant tracking-widest">
                                {showPasswordMap[user.id] ? user.password : '••••••••'}
                              </span>
                              <button 
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors"
                              >
                                {showPasswordMap[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-outline-variant/10 flex items-center justify-end gap-2 mt-auto">
                            <button onClick={() => handleEditUser(user)} className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-outline-variant/5">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all border border-outline-variant/5">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsSubTab === 'about' && (
                <div className="animate-fade-in space-y-8">
                  <div className="card-premium p-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                    
                    <div className="relative flex flex-col items-center text-center py-10">
                      <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-premium overflow-hidden border border-outline-variant/10">
                        <img src="app-logo.png" alt="ShopyFee Logo" className="w-full h-full object-cover" />
                      </div>
                      
                      <h2 className="text-3xl font-black text-on-surface tracking-tighter mb-2">ShopyFee</h2>
                      <p className="text-xs font-black text-primary uppercase tracking-[0.4em] mb-12">Premium Business Engine</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl text-left">
                        <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all group">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">Developer</p>
                          <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">CariCuan.app</p>
                        </div>
                        
                        <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all group">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">Versi Aplikasi</p>
                          <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Update Versi 1</p>
                        </div>
                        
                        <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all group">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">Tanggal Rilis</p>
                          <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">25 April 2026</p>
                        </div>
                        
                        <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all group">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">Email Support</p>
                          <a href="mailto:caricuan.app@gmail.com" className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">caricuan.app@gmail.com</a>
                        </div>
                      </div>
                      
                      <div className="mt-12 w-full max-w-2xl">
                        <a 
                          href="https://lynk.id/caricuan.app" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 w-full py-4 bg-surface-container-highest rounded-2xl border border-outline-variant/10 text-xs font-black text-on-surface uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all duration-500 group shadow-sm hover:shadow-premium"
                        >
                          Official Link <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </a>
                        <p className="mt-6 text-[10px] font-medium text-on-surface-variant/30 italic">© 2026 CariCuan.app. All rights reserved.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Restock */}
      {restockModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in">
          <div className="card-premium w-full max-w-sm overflow-hidden border border-outline-variant/10 shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-outline-variant/10 flex items-center gap-4 bg-surface-container-high/50">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                <RefreshCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">Restock Persediaan</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Update Inventaris Produk</p>
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Masukkan jumlah stok tambahan untuk produk: <br/>
                  <strong className="text-primary font-black uppercase tracking-tight text-sm">
                    {products.find(p => p.id === restockModal.productId)?.name}
                  </strong>
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-3 ml-1">Kuantitas Baru</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="input-premium py-5 text-3xl font-black text-center tracking-tighter"
                  value={restockModal.amount}
                  onChange={(e) => setRestockModal({...restockModal, amount: e.target.value})}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-8 bg-surface-container-high/50 border-t border-outline-variant/10 flex gap-4">
              <button 
                onClick={() => setRestockModal({ isOpen: false, productId: null, amount: '' })} 
                className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-300"
              >
                Batal
              </button>
              <button 
                onClick={submitRestock} 
                className="flex-[2] btn-primary py-4 text-xs tracking-widest shadow-primary/20"
              >
                KONFIRMASI STOK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Nota Bluetooth */}
      {printModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in">
          <div className="card-premium w-full max-w-sm overflow-hidden border-2 border-primary/20 shadow-2xl animate-scale-in">
            <div className="p-10 bg-gradient-to-br from-primary/5 via-white to-white flex flex-col items-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 shadow-sm group">
                <Printer className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-black text-on-surface tracking-tighter text-center">Transaksi Selesai!</h3>
              <p className="text-xs text-on-surface-variant/60 text-center mt-3 leading-relaxed">
                ID Transaksi: <span className="font-black text-primary">{printModal.transaction?.id}</span><br/>
                Berhasil dicatat dalam sistem.
              </p>
            </div>
            
            <div className="p-10 space-y-4">
              <button 
                onClick={() => printReceipt(printModal.transaction)} 
                className="w-full btn-primary py-5 text-sm tracking-[0.2em] shadow-primary/20"
              >
                <Printer className="w-5 h-5 mr-3" /> CETAK STRUK
              </button>
              
              <button 
                onClick={() => {
                  setPrintModal({ isOpen: false, transaction: null });
                  if (currentUser?.role === 'Kasir') {
                    setActiveTab('pos');
                  } else {
                    setActiveTab('reports');
                  }
                }} 
                className="w-full px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-surface-container-high text-on-surface-variant hover:text-primary transition-all duration-300"
              >
                KEMBALI KE MENU
              </button>
            </div>
            
            <div className="bg-amber-50/50 p-6 flex items-start border-t border-amber-100/30">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mr-4 shrink-0 shadow-sm">
                <Bluetooth className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-amber-900/60 font-bold leading-relaxed">
                Pastikan Bluetooth aktif dan Printer Thermal VSC terhubung untuk hasil cetak yang optimal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konflik Impor Produk */}
      {importConflicts.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-lg p-6 animate-fade-in">
          <div className="card-premium w-full max-w-lg overflow-hidden border border-error/20 shadow-2xl animate-scale-in">
            <div className="p-8 bg-error/5 border-b border-error/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-error rounded-2xl flex items-center justify-center text-white shadow-lg shadow-error/20">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-on-surface tracking-tight">Konflik Impor</h3>
                  <p className="text-[10px] font-black text-error uppercase tracking-widest">{importConflicts.length} item perlu ditinjau</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {importConflicts.map((conflict, idx) => (
                  <div key={idx} className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10 group">
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Produk Konflik</p>
                    <h4 className="text-sm font-bold text-on-surface mb-6 truncate">{conflict.name}</h4>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleResolveConflict(idx, 'update')} 
                        className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        TIMPA DATA
                      </button>
                      <button 
                        onClick={() => handleResolveConflict(idx, 'skip')} 
                        className="flex-1 bg-surface-container-high text-on-surface-variant hover:bg-on-surface-variant hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        LEWATI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-surface-container-high/50 border-t border-outline-variant/10 flex justify-between items-center">
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Tersisa {importConflicts.length} Konflik</p>
              <button 
                onClick={() => setImportConflicts([])} 
                className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-error text-white hover:bg-error-dark transition-all shadow-lg shadow-error/20"
              >
                BATALKAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-premium border-2 animate-fade-in flex items-center transition-all duration-500 ${
          toast.type === 'error' ? 'bg-error border-white/20 text-white' : 'bg-primary border-white/20 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3" /> : <CheckCircle2 className="w-5 h-5 mr-3" />}
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      {/* Komponen Modal Konfirmasi (Generic) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in">
          <div className="card-premium w-full max-w-sm overflow-hidden border border-outline-variant/10 shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-outline-variant/10 flex items-center gap-4 bg-surface-container-high/50">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${confirmModal.title.toLowerCase().includes('hapus') ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">{confirmModal.title}</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Konfirmasi Tindakan</p>
              </div>
            </div>
            <div className="p-8">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="p-8 bg-surface-container-high/50 border-t border-outline-variant/10 flex gap-4">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} 
                className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all duration-300"
              >
                Batal
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all duration-300 shadow-lg ${
                  confirmModal.title.toLowerCase().includes('hapus') ? 'bg-error hover:bg-error-dark shadow-error/20' : 'btn-primary shadow-primary/20'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Sinkronisasi Modern */}
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-3xl animate-fade-in p-6">
          <div className="flex flex-col items-center max-w-sm w-full text-center">
            {/* Holographic Orb Animation */}
            <div className="relative w-48 h-48 mb-12 group">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-[80px] animate-pulse"></div>
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[60px] animate-pulse delay-700"></div>
              
              <div className="relative w-full h-full rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)]">
                <RefreshCw className="w-20 h-20 text-white/10 animate-spin-slow" />
                
                {/* Orbital Rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border-t-2 border-r-2 border-primary/60 rounded-full animate-spin"></div>
                </div>
                <div className="absolute inset-4 flex items-center justify-center">
                  <div className="w-20 h-20 border-b-2 border-l-2 border-blue-400/50 rounded-full animate-spin-reverse"></div>
                </div>
                <div className="absolute inset-8 flex items-center justify-center">
                  <div className="w-16 h-16 border-t-2 border-emerald-400/40 rounded-full animate-spin"></div>
                </div>

                {/* Inner Core */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_20px_white] animate-ping"></div>
                </div>
              </div>
              
              {/* Floating Particles */}
              <div className="absolute -top-6 left-1/4 w-1.5 h-1.5 bg-primary rounded-full animate-ping opacity-60"></div>
              <div className="absolute top-1/3 -right-6 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-500 opacity-40"></div>
              <div className="absolute -bottom-4 right-1/4 w-2 h-2 bg-primary/40 rounded-full animate-ping delay-1000 opacity-30"></div>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase italic">
              Synchronizing <span className="text-primary">Master Data</span>
            </h3>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] mb-12 leading-relaxed">
              Optimizing business logic & securing neural link.<br/>Please maintain connection.
            </p>

            {/* Premium Loader Bar */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[3px] shadow-inner">
              <div className="h-full bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_auto] animate-shimmer rounded-full transition-all duration-700 ease-in-out" style={{ width: '78%' }}></div>
            </div>
            <div className="flex justify-between items-center w-full mt-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Active Link</span>
              </div>
              <span className="text-[10px] font-mono text-white/50 tracking-tighter font-bold">78% READY</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


