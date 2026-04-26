import re

with open("src/App.jsx", "r") as f:
    content = f.read()

# 1. Update Lucide Icons
lucide_pattern = r"import \{\s+([\s\S]*?)\s+\} from 'lucide-react';"
match = re.search(lucide_pattern, content)
if match:
    icons = match.group(1).split(',')
    icons = [i.strip() for i in icons if i.strip()]
    new_icons = ["User", "UserPlus", "Users", "Lock", "Eye", "EyeOff"]
    for icon in new_icons:
        if icon not in icons:
            icons.append(icon)
    icons_str = ",\n  ".join(icons)
    content = re.sub(lucide_pattern, f"import {{\n  {icons_str}\n}} from 'lucide-react';", content)

# 2. Add User States
state_insertion = r"const \[activeTab, setActiveTab\] = useState\('dashboard'\);"
user_states = """const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('biaya');
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'Admin' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({});"""
content = content.replace(state_insertion, user_states)

# 3. Update loadData to fetch users
load_data_insertion = r"setTransactions\(trxSnap\.docs\.map\(d => d\.data\(\)\)\.sort\(\(a,b\) => b\.timestamp - a\.timestamp\)\);"
user_fetch = """setTransactions(trxSnap.docs.map(d => d.data()).sort((a,b) => b.timestamp - a.timestamp));

        // Load Users
        const userSnap = await getDocs(collection(db, 'users'));
        if (userSnap.empty) {
            const initialUser = { id: 'usr-1', username: 'admin', password: 'password123', role: 'Admin', createdAt: Date.now() };
            await setDoc(doc(db, 'users', initialUser.id), initialUser);
            setUsers([initialUser]);
        } else {
            setUsers(userSnap.docs.map(d => d.data()).sort((a,b) => b.createdAt - a.createdAt));
        }"""
content = content.replace(load_data_insertion, user_fetch)

# 4. Add User Handlers
handler_insertion = r"const handleDeleteTransaction = \(id\) => \{"
user_handlers = """const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password) return showToast('Username dan Password wajib diisi!', 'error');

    try {
      if (editingUserId) {
        const updatedUser = { ...users.find(u => u.id === editingUserId), ...userForm };
        setUsers(users.map(u => u.id === editingUserId ? updatedUser : u));
        await updateDoc(doc(db, 'users', editingUserId), userForm);
        showToast('User berhasil diperbarui!', 'success');
        setEditingUserId(null);
      } else {
        const newId = `usr-${Date.now()}`;
        const newUser = { id: newId, ...userForm, createdAt: Date.now() };
        setUsers([newUser, ...users]);
        await setDoc(doc(db, 'users', newId), newUser);
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
          await deleteDoc(doc(db, 'users', id));
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

  const handleDeleteTransaction = (id) => {"""
content = content.replace(handler_insertion, user_handlers)

# 5. Update Settings UI
settings_tab_old = r"\{activeTab === 'settings' && \([\s\S]*?\}\)"
settings_tab_new = """{activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              
              {/* Sub-Navigation Master Data */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-auto">
                  <button 
                    onClick={() => setActiveSettingsSubTab('biaya')}
                    className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeSettingsSubTab === 'biaya' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Calculator className="w-4 h-4 mr-2" /> Pengaturan Biaya
                  </button>
                  <button 
                    onClick={() => setActiveSettingsSubTab('user')}
                    className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeSettingsSubTab === 'user' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Users className="w-4 h-4 mr-2" /> Pengaturan User
                  </button>
                </div>
                <div className="hidden md:flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest px-4">
                  Master Data Management
                </div>
              </div>

              {/* VIEW: PENGATURAN BIAYA */}
              {activeSettingsSubTab === 'biaya' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start">
                    <Info className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800">
                      <strong>Master Data Biaya</strong>: Ubah data di bawah ini untuk memperbarui opsi biaya pada menu Tambah Produk.
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

              {/* VIEW: PENGATURAN USER */}
              {activeSettingsSubTab === 'user' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                      <UserPlus className="w-5 h-5 mr-2 text-blue-600" /> {editingUserId ? 'Edit Akses Pengguna' : 'Daftarkan Pengguna Baru'}
                    </h3>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Username</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            placeholder="Cth: kasir_shopee"
                            value={userForm.username}
                            onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            placeholder="********"
                            value={userForm.password}
                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Role / Hak Akses</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                          value={userForm.role}
                          onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                        >
                          <option value="Admin">Admin (Full Access)</option>
                          <option value="Kasir">Kasir (POS Only)</option>
                          <option value="Manager">Manager (Reports Only)</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        {editingUserId && (
                          <button 
                            type="button" 
                            onClick={handleCancelEditUser}
                            className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition text-sm"
                          >
                            Batal
                          </button>
                        )}
                        <button 
                          type="submit" 
                          className="flex-[2] bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 text-sm flex items-center justify-center"
                        >
                          {editingUserId ? 'Simpan Perubahan' : 'Tambah User'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-bold text-gray-700 flex items-center"><Users className="w-5 h-5 mr-2 text-blue-500"/> Daftar Pengguna Terdaftar</h3>
                      <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">{users.length} User</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/30">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Password</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Dibuat Pada</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-bold text-gray-700">{user.username}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-mono text-gray-500">
                                    {showPasswordMap[user.id] ? user.password : '••••••••'}
                                  </span>
                                  <button 
                                    onClick={() => togglePasswordVisibility(user.id)}
                                    className="text-gray-400 hover:text-blue-500 transition-colors"
                                  >
                                    {showPasswordMap[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 
                                  user.role === 'Manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-400">
                                {new Date(user.createdAt).toLocaleDateString('id-ID')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleEditUser(user)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Edit User">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition" title="Hapus User">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}"""
content = re.sub(settings_tab_old, settings_tab_new, content, flags=re.DOTALL)

with open("src/App.jsx", "w") as f:
    f.write(content)

