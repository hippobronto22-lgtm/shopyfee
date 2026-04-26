import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Users, UserPlus, Calendar, ShieldCheck, ShieldAlert, Key, Plus, Trash2, Search, Smartphone, RefreshCcw, Download, Upload, Database, Zap, Layers, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SuperadminPanel({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [globalFees, setGlobalFees] = useState({ paymentFeeMall: 1.8, orderFee: 1250 });
  const [globalPrograms, setGlobalPrograms] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    businessName: '',
    password: '',
    subscriptionEnd: '',
    isActive: true,
    role: 'Admin'
  });
  const [activeCustomerTab, setActiveCustomerTab] = useState('semua');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch Customers
      const q = query(collection(db, 'users'), where('role', '==', 'Admin'));
      const snapshot = await getDocs(q);
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Global Variables
      const globalVarDoc = await getDocs(query(collection(db, 'settings_general'), where('ownerId', '==', 'GLOBAL')));
      const gVars = {};
      globalVarDoc.forEach(d => gVars[d.id] = d.data().value);
      if (gVars.paymentFeeMall) setGlobalFees({ paymentFeeMall: gVars.paymentFeeMall, orderFee: gVars.orderFee || 1250 });

      // Fetch Global Programs
      const globalProgDoc = await getDocs(query(collection(db, 'settings_program'), where('ownerId', '==', 'GLOBAL')));
      setGlobalPrograms(globalProgDoc.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateMasterDataTemplate = () => {
    const template = [
      { statusToko: 'Non-Star', kategori: 'Aksesoris Fashion', subKategori: 'Aksesoris Rambut', jenisProduk: 'Bando & Bandana', fee: 9.0 },
      { statusToko: 'Star/Star+', kategori: 'Elektronik', subKategori: 'Audio', jenisProduk: 'Speaker', fee: 5.5 },
      { statusToko: 'Shopee Mall', kategori: 'Kesehatan', subKategori: 'Masker', jenisProduk: 'Masker Medis', fee: 7.0 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData");
    XLSX.writeFile(wb, "Template_Master_Data_Shopee.xlsx");
    showToast('Template berhasil diunduh!', 'success');
  };

  const handleImportGlobalMasterData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

          if (data.length === 0) throw new Error('File Excel kosong');

          // Hapus data global lama (opsional, tapi lebih bersih)
          // Kita gunakan ID 'GLOBAL' sebagai penanda data pusat
          const globalCollection = collection(db, 'settings_shopee');
          const q = query(globalCollection, where('ownerId', '==', 'GLOBAL'));
          const oldDocs = await getDocs(q);
          
          const batchDelete = writeBatch(db);
          oldDocs.forEach(d => batchDelete.delete(d.ref));
          await batchDelete.commit();

          // Upload data baru dalam batch 500
          const chunks = [];
          for (let i = 0; i < data.length; i += 500) {
            chunks.push(data.slice(i, i + 500));
          }

          for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(item => {
              const newRef = doc(globalCollection);
              batch.set(newRef, { ...item, ownerId: 'GLOBAL', updatedAt: Date.now() });
            });
            await batch.commit();
          }

          showToast(`Berhasil menyiarkan ${data.length} data tarif terbaru ke seluruh customer!`, 'success');
        } catch (err) {
          console.error(err);
          showToast(`Gagal: ${err.message}`, 'error');
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
  const handleUpdateGlobalVars = async () => {
    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      const genColl = collection(db, 'settings_general');
      
      batch.set(doc(genColl, 'paymentFeeMall'), { value: globalFees.paymentFeeMall, ownerId: 'GLOBAL' });
      batch.set(doc(genColl, 'orderFee'), { value: globalFees.orderFee, ownerId: 'GLOBAL' });
      
      await batch.commit();
      showToast('Variabel Global berhasil diperbarui!', 'success');
    } catch (err) {
      showToast('Gagal update variabel global', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGlobalPrograms = async () => {
    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      const progColl = collection(db, 'settings_program');
      
      // Hapus yang lama dulu
      const oldDocs = await getDocs(query(progColl, where('ownerId', '==', 'GLOBAL')));
      oldDocs.forEach(d => batch.delete(d.ref));
      
      // Tambah yang baru
      globalPrograms.forEach(p => {
        const newRef = doc(progColl);
        batch.set(newRef, { nama: p.nama, fee: p.fee, ownerId: 'GLOBAL' });
      });
      
      await batch.commit();
      showToast('Program Layanan Global berhasil diperbarui!', 'success');
    } catch (err) {
      showToast('Gagal update program global', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.email || !newCustomer.password) return;
    
    // Simpan config untuk secondary app
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    let secondaryApp;
    try {
      setIsLoading(true);
      // 1. Inisialisasi Secondary App untuk mendaftarkan user baru tanpa Logout
      secondaryApp = initializeApp(firebaseConfig, "SecondaryAccountCreator");
      const secondaryAuth = getAuth(secondaryApp);
      
      // 2. Buat User di Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newCustomer.email, newCustomer.password);
      const uid = userCredential.user.uid;
      
      // 3. Langsung Logout dari secondary instance agar tidak konflik
      await signOut(secondaryAuth);
      
      // 4. Simpan Profil ke Firestore menggunakan UID asli
      const expiryDate = new Date(newCustomer.subscriptionEnd).getTime();
      const userData = {
        ...newCustomer,
        id: uid,
        subscriptionEnd: expiryDate,
        createdAt: Date.now()
      };
      
      // Password tetap disimpan di Firestore agar bisa ditampilkan di tabel Superadmin
      // (Berdasarkan request user)
      
      await setDoc(doc(db, 'users', uid), userData);
      
      showToast('Customer & Akun Auth berhasil dibuat!', 'success');
      setShowAddModal(false);
      setNewCustomer({ email: '', businessName: '', password: '', subscriptionEnd: '', isActive: true, role: 'Admin' });
      fetchData();
    } catch (err) {
      console.error(err);
      let errorMsg = `Gagal: ${err.message}`;
      if (err.code === 'auth/email-already-in-use') errorMsg = 'Email sudah terdaftar di sistem!';
      showToast(errorMsg, 'error');
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
      setIsLoading(false);
    }
  };

  const toggleStatus = async (customer) => {
    try {
      const docRef = doc(db, 'users', customer.id);
      await updateDoc(docRef, { isActive: !customer.isActive });
      showToast(`Status ${customer.businessName} diperbarui`, 'success');
      fetchData();
    } catch (err) {
      showToast('Gagal memperbarui status', 'error');
    }
  };

  const extendSubscription = async (customer, months) => {
    try {
      const currentEnd = customer.subscriptionEnd || Date.now();
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + months);
      
      const docRef = doc(db, 'users', customer.id);
      await updateDoc(docRef, { subscriptionEnd: newEnd.getTime() });
      showToast(`Masa aktif ${customer.businessName} diperpanjang`, 'success');
      fetchData();
    } catch (err) {
      showToast('Gagal memperpanjang paket', 'error');
    }
  };

  const handleQuickAddDate = (currentState, setStateFunc, amount, unit) => {
    let baseDate = currentState.subscriptionEnd ? new Date(currentState.subscriptionEnd) : new Date();
    if (isNaN(baseDate.getTime())) baseDate = new Date();
    
    if (unit === 'week') {
      baseDate.setDate(baseDate.getDate() + (amount * 7));
    } else if (unit === 'month') {
      baseDate.setMonth(baseDate.getMonth() + amount);
    } else if (unit === 'year') {
      baseDate.setFullYear(baseDate.getFullYear() + amount);
    }
    
    setStateFunc({...currentState, subscriptionEnd: baseDate.toISOString().split('T')[0]});
  };


  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      setIsLoading(true);
      const docRef = doc(db, 'users', editingCustomer.id);
      await updateDoc(docRef, {
        businessName: editingCustomer.businessName,
        role: editingCustomer.role,
        subscriptionEnd: new Date(editingCustomer.subscriptionEnd).getTime()
      });
      showToast('Data customer berhasil diperbarui!', 'success');
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchData();
    } catch (err) {
      showToast('Gagal memperbarui data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus customer ini? Mereka tidak akan dapat mengakses aplikasi lagi.')) return;
    try {
      setIsLoading(true);
      // Menggunakan soft-delete untuk menghindari masalah izin Firebase Rules
      const docRef = doc(db, 'users', id);
      await updateDoc(docRef, { isDeleted: true, isActive: false });
      showToast('Customer berhasil dihapus dari sistem', 'success');
      fetchData();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (c.isDeleted) return false;
    
    const matchesSearch = c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeCustomerTab === 'hampir_habis') {
      const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
      return c.subscriptionEnd <= sevenDaysFromNow;
    }
    
    return true; // 'semua'
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-[1600px] mx-auto pb-12">
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary-dark transition-all shadow-premium"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Tambah Customer
          </button>
        </div>

              {/* Customer Management Section */}
      <div className="card-premium overflow-hidden mb-12">
        <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <button 
              onClick={() => setActiveCustomerTab('semua')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCustomerTab === 'semua' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-black/5'}`}
            >
              Semua Customer
            </button>
            <button 
              onClick={() => setActiveCustomerTab('hampir_habis')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeCustomerTab === 'hampir_habis' ? 'bg-error text-white shadow-sm' : 'text-on-surface-variant hover:bg-black/5'}`}
            >
              Masa Aktif Hampir Habis <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{customers.filter(c => c.subscriptionEnd <= Date.now() + (7 * 24 * 60 * 60 * 1000)).length}</span>
            </button>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
              <input 
                type="text"
                placeholder="Cari email atau nama bisnis..."
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-2.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-4 py-2.5 rounded-xl transition-all shrink-0 border border-primary/10">
              <RefreshCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Customer / Bisnis</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Masa Aktif</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-sm font-medium text-on-surface-variant/30 italic">Tidak ada customer ditemukan</td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const isExpired = customer.subscriptionEnd < Date.now();
                  return (
                    <tr key={customer.id} className="hover:bg-surface-container-high/30 transition-all group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black shrink-0">
                            {customer.businessName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-on-surface">{customer.businessName || 'Unnamed Business'}</p>
                            <p className="text-xs text-on-surface-variant/60">{customer.email}</p>
                            {customer.password && (
                              <p className="text-[9px] font-bold text-on-surface-variant/40 mt-0.5 font-mono">
                                Pass: {customer.password}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${isExpired ? 'text-error' : 'text-primary'}`} />
                          <span className={`text-sm font-bold ${isExpired ? 'text-error' : 'text-on-surface'}`}>
                            {formatDate(customer.subscriptionEnd)}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${customer.isActive && !isExpired ? 'bg-emerald-500/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${customer.isActive && !isExpired ? 'bg-emerald-500' : 'bg-error'}`}></div>
                          {customer.isActive && !isExpired ? 'Active' : (isExpired ? 'Expired' : 'Suspended')}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingCustomer({...customer, subscriptionEnd: new Date(customer.subscriptionEnd).toISOString().split('T')[0]});
                              setShowEditModal(true);
                            }}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                            title="Edit Data"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            title="Hapus Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleStatus(customer)}
                            className={`p-2 rounded-lg transition-all ${customer.isActive ? 'bg-error/10 text-error hover:bg-error hover:text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                            title={customer.isActive ? 'Suspend Access' : 'Activate Access'}
                          >
                            {customer.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Global Variables */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Global Variables</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase">Payment & Handling Fees</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <span className="text-xs font-bold">Payment Fee Mall (%)</span>
                <input 
                  type="number" step="0.1" 
                  className="w-24 input-premium py-2 text-right" 
                  value={globalFees.paymentFeeMall} 
                  onChange={(e) => setGlobalFees({...globalFees, paymentFeeMall: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <span className="text-xs font-bold">Handling Fee (Rp)</span>
                <input 
                  type="number" 
                  className="w-32 input-premium py-2 text-right" 
                  value={globalFees.orderFee} 
                  onChange={(e) => setGlobalFees({...globalFees, orderFee: parseInt(e.target.value) || 0})}
                />
              </div>
              <button 
                onClick={handleUpdateGlobalVars}
                className="w-full py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all"
              >
                Simpan Variabel Global
              </button>
            </div>
          </div>

          {/* Global Extra Services */}
          <div className="card-premium p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Extra Services</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase">Optional Programs</p>
                </div>
              </div>
              <button 
                onClick={() => setGlobalPrograms([...globalPrograms, { id: Date.now(), nama: '', fee: 0 }])}
                className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {globalPrograms.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    type="text" placeholder="Nama Program" 
                    className="flex-1 input-premium py-2 text-xs" 
                    value={p.nama} 
                    onChange={(e) => {
                      const newP = [...globalPrograms];
                      newP[idx].nama = e.target.value;
                      setGlobalPrograms(newP);
                    }}
                  />
                  <input 
                    type="number" step="0.1" 
                    className="w-20 input-premium py-2 text-xs text-right" 
                    value={p.fee} 
                    onChange={(e) => {
                      const newP = [...globalPrograms];
                      newP[idx].fee = parseFloat(e.target.value) || 0;
                      setGlobalPrograms(newP);
                    }}
                  />
                  <button 
                    onClick={() => setGlobalPrograms(globalPrograms.filter((_, i) => i !== idx))}
                    className="text-error hover:bg-error/10 p-2 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleUpdateGlobalPrograms}
              className="w-full mt-4 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all"
            >
              Simpan Program Global
            </button>
          </div>
        </div>

        {/* Global Master Section */}
        <div className="card-premium p-8 mb-12 bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-on-surface uppercase tracking-tight">Global Master Broadcast</h3>
                <p className="text-xs font-medium text-on-surface-variant/60 leading-relaxed max-w-md">
                  Update tarif Shopee di sini untuk merubah perhitungan di <b>seluruh akun customer</b> secara serentak.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <button
                onClick={generateMasterDataTemplate}
                className="flex-1 lg:flex-none flex items-center justify-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all border border-outline-variant/10 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" /> Download Template
              </button>
              
              <label className="flex-1 lg:flex-none flex items-center justify-center px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary-dark transition-all shadow-premium cursor-pointer mb-0">
                <Upload className="w-4 h-4 mr-2" /> Siarkan Tarif Baru (Excel)
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportGlobalMasterData} />
              </label>
            </div>
          </div>
        </div>

      {/* Modal Tambah Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="card-premium w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-8 border-b border-outline-variant/10 bg-surface-container-high/30">
              <h3 className="text-xl font-black text-on-surface tracking-tight uppercase italic">Register <span className="text-primary">Customer</span></h3>
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">New SaaS Account</p>
            </div>
            <form onSubmit={handleAddCustomer} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" required
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="customer@email.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Business Name</label>
                  <input 
                    type="text" required
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Nama Toko / Bisnis"
                    value={newCustomer.businessName}
                    onChange={(e) => setNewCustomer({...newCustomer, businessName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Temporary Password</label>
                  <input 
                    type="text" required
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Min. 8 characters"
                    value={newCustomer.password}
                    onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Subscription End Date</label>
                  <input 
                    type="date" required
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={newCustomer.subscriptionEnd}
                    onChange={(e) => setNewCustomer({...newCustomer, subscriptionEnd: e.target.value})}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => handleQuickAddDate(newCustomer, setNewCustomer, 1, 'week')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+1 Mgg</button>
                    <button type="button" onClick={() => handleQuickAddDate(newCustomer, setNewCustomer, 1, 'month')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+1 Bln</button>
                    <button type="button" onClick={() => handleQuickAddDate(newCustomer, setNewCustomer, 6, 'month')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+6 Bln</button>
                    <button type="button" onClick={() => handleQuickAddDate(newCustomer, setNewCustomer, 1, 'year')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+1 Thn</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-[2] btn-primary py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Daftarkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Customer */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="card-premium w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-8 border-b border-outline-variant/10 bg-surface-container-high/30">
              <h3 className="text-xl font-black text-on-surface tracking-tight uppercase italic">Edit <span className="text-primary">Customer</span></h3>
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Perbarui Data Akun</p>
            </div>
            <form onSubmit={handleUpdateCustomer} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium text-on-surface-variant/50 cursor-not-allowed"
                    value={editingCustomer.email}
                    disabled
                  />
                  <p className="text-[8px] text-on-surface-variant/50 px-1 mt-1">Email tidak dapat diubah</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Business Name</label>
                  <input 
                    type="text" required
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Nama Toko / Bisnis"
                    value={editingCustomer.businessName}
                    onChange={(e) => setEditingCustomer({...editingCustomer, businessName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Subscription End Date</label>
                  <input 
                    type="date" required
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={editingCustomer.subscriptionEnd}
                    onChange={(e) => setEditingCustomer({...editingCustomer, subscriptionEnd: e.target.value})}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => handleQuickAddDate(editingCustomer, setEditingCustomer, 1, 'week')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+1 Mgg</button>
                    <button type="button" onClick={() => handleQuickAddDate(editingCustomer, setEditingCustomer, 1, 'month')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+1 Bln</button>
                    <button type="button" onClick={() => handleQuickAddDate(editingCustomer, setEditingCustomer, 6, 'month')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+6 Bln</button>
                    <button type="button" onClick={() => handleQuickAddDate(editingCustomer, setEditingCustomer, 1, 'year')} className="flex-1 px-2 py-2 bg-primary/10 text-primary text-[9px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all">+1 Thn</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditingCustomer(null); }}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-[2] btn-primary py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex justify-center items-center"
                >
                  {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
