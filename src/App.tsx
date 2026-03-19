import React, { useState, useEffect, useMemo } from 'react';
import { 
  Instagram, 
  MessageCircle, 
  MapPin, 
  Globe, 
  Star, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  X,
  ChevronRight,
  Store,
  Filter,
  LogIn,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Company } from './types';
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Company, 'id'>>({
    name: '',
    category: '',
    instagram: '',
    whatsapp: '',
    location: '',
    site: '',
    image: '',
    rating: 5
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is admin (hardcoded for now as per rules or check Firestore)
        const adminEmail = "georgeoughotmart@gmail.com";
        if (currentUser.email === adminEmail) {
          setIsAdmin(true);
        } else {
          // Check firestore role
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Listener
  useEffect(() => {
    const q = query(collection(db, 'companies'), orderBy('rating', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];
      setCompanies(docs);
    }, (error) => {
      console.error("Firestore Error:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const categories = useMemo(() => {
    const cats = new Set(companies.map(c => c.category));
    return ['Todas', ...Array.from(cats)].sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             c.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todas' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
  }, [companies, searchTerm, selectedCategory]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'companies', editingId), {
          ...formData
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'companies'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setFormData({
        name: '',
        category: '',
        instagram: '',
        whatsapp: '',
        location: '',
        site: '',
        image: '',
        rating: 5
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error("Submit Error:", error);
      alert("Erro ao salvar. Verifique se você tem permissões de administrador.");
    }
  };

  const handleEdit = (company: Company) => {
    if (!isAdmin) return;
    setFormData({
      name: company.name,
      category: company.category,
      instagram: company.instagram,
      whatsapp: company.whatsapp,
      location: company.location,
      site: company.site,
      image: company.image,
      rating: company.rating
    });
    setEditingId(company.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Deseja realmente excluir esta empresa?')) {
      try {
        await deleteDoc(doc(db, 'companies', id));
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0b0b] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Store size={24} className="text-insta-pink" />
            <h1 className="text-xl font-bold tracking-tight insta-text-gradient">Guia PRO</h1>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Categorias</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center justify-between group ${
                selectedCategory === cat 
                ? 'insta-gradient text-white shadow-lg shadow-insta-pink/20' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="capitalize">{cat}</span>
              {selectedCategory === cat && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {isAdmin && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  category: '',
                  instagram: '',
                  whatsapp: '',
                  location: '',
                  site: '',
                  image: '',
                  rating: 5
                });
                setIsFormOpen(true);
              }}
              className="w-full insta-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-insta-pink/20"
            >
              <Plus size={20} />
              Nova Empresa
            </button>
          )}

          {!user ? (
            <button 
              onClick={handleLogin}
              className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogIn size={20} />
              Entrar (Admin)
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-2 py-1">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="User" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.displayName}</p>
                  {isAdmin && (
                    <div className="flex items-center gap-1 text-[10px] text-insta-pink font-bold uppercase">
                      <ShieldCheck size={10} />
                      Admin
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 bg-[#0b0b0b]/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar empresas, serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161616] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-insta-pink transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Filter size={16} />
              <span>{filteredCompanies.length} resultados</span>
            </div>
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <motion.div
                    key={company.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-[#161616] border border-white/5 rounded-2xl p-5 flex gap-6 items-center hover:border-white/10 transition-all hover:bg-[#1c1c1c]"
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={company.image || `https://picsum.photos/seed/${company.name}/200`} 
                        alt={company.name}
                        className="w-24 h-24 rounded-xl object-cover shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -top-2 -right-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <Star size={12} className="text-insta-yellow fill-insta-yellow" />
                        <span className="text-xs font-bold">{company.rating}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-insta-pink transition-colors truncate">
                            {company.name}
                          </h3>
                          <span className="text-xs font-medium text-insta-pink uppercase tracking-wider bg-insta-pink/10 px-2 py-0.5 rounded">
                            {company.category}
                          </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => handleEdit(company)}
                                className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all"
                              >
                                <Edit3 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDelete(company.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-4">
                        {company.instagram && (
                          <a href={company.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-insta-pink transition-colors">
                            <Instagram size={14} />
                            Instagram
                          </a>
                        )}
                        {company.whatsapp && (
                          <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-500 transition-colors">
                            <MessageCircle size={14} />
                            WhatsApp
                          </a>
                        )}
                        {company.location && (
                          <a href={company.location} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-insta-blue transition-colors">
                            <MapPin size={14} />
                            Localização
                          </a>
                        )}
                        {company.site && (
                          <a href={company.site} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-insta-orange transition-colors">
                            <Globe size={14} />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                  <Store size={48} className="mb-4 opacity-20" />
                  <p className="text-lg">Nenhuma empresa encontrada</p>
                  <p className="text-sm">Tente ajustar sua busca ou categoria</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? 'Editar Empresa' : 'Adicionar Nova Empresa'}</h2>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nome da Empresa</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink"
                      placeholder="Ex: Restaurante Central"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Categoria</label>
                    <input 
                      required
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink"
                      placeholder="Ex: Gastronomia"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Instagram (URL)</label>
                    <input 
                      value={formData.instagram}
                      onChange={e => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">WhatsApp</label>
                    <input 
                      value={formData.whatsapp}
                      onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink"
                      placeholder="DDD + Número"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Localização (URL Maps)</label>
                    <input 
                      value={formData.location}
                      onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink"
                      placeholder="Link do Google Maps"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Website</label>
                    <input 
                      value={formData.site}
                      onChange={e => setFormData(prev => ({ ...prev, site: e.target.value }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Imagem</label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-insta-pink/10 file:text-insta-pink hover:file:bg-insta-pink/20 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avaliação</label>
                    <select 
                      value={formData.rating}
                      onChange={e => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full bg-[#1c1c1c] border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:border-insta-pink appearance-none"
                    >
                      {[5,4,3,2,1].map(n => (
                        <option key={n} value={n}>{'★'.repeat(n)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full insta-gradient hover:opacity-90 text-white py-3 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-insta-pink/20"
                  >
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
