import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { CategoryHighlights } from './components/home/CategoryHighlights';
import { EventCatalog } from './components/events/EventCatalog';
import { EventCard } from './components/events/EventCard';
import { EventDetailModal } from './components/events/EventDetailModal';
import { MyRegistrations } from './components/registrations/MyRegistrations';
import { DigitalTicketModal } from './components/registrations/DigitalTicketModal';
import { CancelConfirmModal } from './components/registrations/CancelConfirmModal';
import { TelegramLinkingModal } from './components/telegram/TelegramLinkingModal';
import { SupportAssistant } from './components/support/SupportAssistant';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileView } from './components/profile/UserProfileView';
import { N8nConfigModal } from './components/common/N8nConfigModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { n8nApi } from './services/n8nClient';
import { EventCategory, EventItem, Registration, UserProfile } from './types';
import {
  Calendar,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  MessageSquare
} from 'lucide-react';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'inicio' | 'catalogo' | 'inscripciones' | 'perfil'>('inicio');

  // Application Data States
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [user, setUser] = useState<UserProfile>(n8nApi.getProfile());
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Search & Filter cross-navigation state
  const [catalogCategory, setCatalogCategory] = useState<string>('Todas');
  const [catalogQuery, setCatalogQuery] = useState<string>('');

  // Modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);
  const [selectedRegForTicket, setSelectedRegForTicket] = useState<Registration | null>(null);
  const [selectedRegForCancel, setSelectedRegForCancel] = useState<Registration | null>(null);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [n8nModalOpen, setN8nModalOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load initial data
  const loadData = async () => {
    setLoadingEvents(true);
    try {
      const eventsRes = await n8nApi.getEvents();
      if (eventsRes.data) setEvents(eventsRes.data);

      const regRes = await n8nApi.getUserRegistrations(user.email);
      if (regRes.data) setRegistrations(regRes.data);

      const profile = n8nApi.getProfile();
      setUser(profile);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category counts
  const categoryCounts = events.reduce((acc, evt) => {
    acc[evt.category] = (acc[evt.category] || 0) + 1;
    return acc;
  }, {} as Record<EventCategory, number>);

  const userRegisteredEventIds = registrations
    .filter((r) => r.status !== 'CANCELADA')
    .map((r) => r.eventId);

  // Handlers
  const handleHeroSearch = (query: string, category: string) => {
    setCatalogQuery(query);
    setCatalogCategory(category);
    setCurrentTab('catalogo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (category: EventCategory) => {
    setCatalogCategory(category);
    setCatalogQuery('');
    setCurrentTab('catalogo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegisterToEvent = async (event: EventItem, notes?: string) => {
    const res = await n8nApi.registerToEvent({
      eventId: event.id,
      userName: user.name,
      userEmail: user.email,
      notes
    });

    if (res.success && res.data) {
      addToast(
        'success',
        res.data.status === 'LISTA_ESPERA' ? 'Anotado en Lista de Espera' : '¡Inscripción Confirmada!',
        res.message || `Tu pase para ${event.title} ha sido generado.`
      );
      // Reload events & registrations
      await loadData();
      setSelectedEventForDetail(null);
    } else {
      addToast('error', 'No se pudo completar la inscripción', res.error);
    }
  };

  const handleConfirmCancel = async (registrationId: string, reason: string) => {
    const res = await n8nApi.cancelRegistration({
      registrationId,
      reason
    });

    if (res.success) {
      addToast('info', 'Inscripción Cancelada', 'Tu cupo ha sido liberado para la lista de espera.');
      await loadData();
    } else {
      addToast('error', 'Error al cancelar', res.error);
    }
  };

  const handleRequestTelegramCode = async () => {
    const res = await n8nApi.requestTelegramLinkCode(user.email);
    if (res.success && res.data) {
      setUser((prev) => ({
        ...prev,
        telegramCode: res.data?.code,
        telegramCodeExpiresAt: res.data?.expiresAt
      }));
      addToast('info', 'Código Renovado', `Usa /vincular ${res.data.code} en Telegram.`);
      return res.data.code;
    }
    return 'EP-89241';
  };

  const handleSimulateTelegramLink = async (telegramUsername?: string) => {
    const res = await n8nApi.simulateTelegramConfirmation(telegramUsername);
    if (res.success && res.data) {
      setUser(res.data);
      addToast(
        'success',
        'Telegram Vinculado',
        `Recibirás pases y avisos de eventos en @${res.data.telegramUsername}.`
      );
    }
  };

  const handleUnlinkTelegram = () => {
    const updated = n8nApi.updateProfile({
      telegramLinked: false,
      telegramUsername: undefined
    });
    setUser(updated);
    addToast('info', 'Telegram Desvinculado', 'Has desvinculado tu cuenta del bot de Telegram.');
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    const newProfile = n8nApi.updateProfile(updated);
    setUser(newProfile);
    addToast('success', 'Perfil Actualizado', 'Los datos se guardaron correctamente en la memoria local.');
  };

  const handleLogin = async (email: string, password?: string) => {
    const res = await n8nApi.login({ email, password });
    if (res.success && res.data) {
      setUser(res.data);
      setIsLoggedIn(true);
      addToast('success', 'Bienvenido de nuevo', `Sesión iniciada como ${res.data.name}`);
      return true;
    }
    addToast('error', 'Fallo al iniciar sesión', res.error);
    return false;
  };

  const handleRegisterUser = async (name: string, email: string, password?: string) => {
    const res = await n8nApi.registerUser({ name, email, password });
    if (res.success && res.data) {
      setUser(res.data);
      setIsLoggedIn(true);
      addToast('success', 'Cuenta Creada', `Bienvenido a EventPass, ${name}.`);
      return true;
    }
    addToast('error', 'Error en el registro', res.error);
    return false;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    addToast('info', 'Sesión Finalizada', 'Has cerrado sesión exitosamente.');
  };

  const handleResetDemoData = () => {
    n8nApi.resetDemoData();
    loadData();
    addToast('info', 'Datos Restablecidos', 'Se han restablecido los 6 eventos y registros iniciales.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        isLoggedIn={isLoggedIn}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenTelegram={() => setTelegramModalOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenN8nModal={() => setN8nModalOpen(true)}
      />

      {/* Main Dynamic View */}
      <main className="flex-1">
        {currentTab === 'inicio' && (
          <div className="space-y-0">
            {/* Hero Section */}
            <Hero
              onSearch={handleHeroSearch}
              onExploreCatalog={() => {
                setCurrentTab('catalogo');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Category Highlights */}
            <CategoryHighlights
              onSelectCategory={handleSelectCategory}
              categoryCounts={categoryCounts}
            />

            {/* Featured Events Showcase */}
            <section className="py-14 border-b border-slate-900 bg-slate-950">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span>Selección Especial</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Eventos Destacados
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Explora eventos con cupos activos, conferencias internacionales y experiencias
                      exclusivas.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentTab('catalogo');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 self-start sm:self-auto"
                  >
                    <span>Ver catálogo completo ({events.length})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.slice(0, 3).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={(evt) => setSelectedEventForDetail(evt)}
                      onQuickRegister={(evt) => setSelectedEventForDetail(evt)}
                      isRegistered={userRegisteredEventIds.includes(event.id)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Architecture Banner / n8n & Telegram Information Strip */}
            <section className="py-14 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 border-b border-slate-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="p-8 rounded-3xl border border-indigo-500/20 bg-slate-900/80 shadow-2xl relative overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Arquitectura Desacoplada & Enterprise Ready</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Orquestación con n8n, Google Sheets y Telegram Bot
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        EventPass está concebido para operar con cero dependencia de bases de datos
                        pesadas en el navegador: toda la persistencia se gestiona vía HTTP con webhooks
                        de n8n conectados a Google Sheets, confirmaciones vía Gmail y emisión de
                        pases mediante el comando <code>/vincular</code> en Telegram.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          onClick={() => setN8nModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md"
                        >
                          Explorar los 10 Workflows
                        </button>
                        <button
                          onClick={() => setTelegramModalOpen(true)}
                          className="px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40 text-xs font-semibold flex items-center gap-2 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Cómo funciona /vincular</span>
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                      <h3 className="font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
                        Flujo de Datos Garantizado
                      </h3>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Frontend puro en React + Vite + TS</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Sin conexión directa React a Google Sheets</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Sin Firestore ni bases propietarias</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Totalmente compatible con Vercel</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {currentTab === 'catalogo' && (
          <EventCatalog
            events={events}
            onSelectEvent={(evt) => setSelectedEventForDetail(evt)}
            onQuickRegister={(evt) => setSelectedEventForDetail(evt)}
            userRegisteredEventIds={userRegisteredEventIds}
            initialCategory={catalogCategory}
            initialQuery={catalogQuery}
          />
        )}

        {currentTab === 'inscripciones' && (
          <MyRegistrations
            registrations={registrations}
            onViewTicket={(reg) => setSelectedRegForTicket(reg)}
            onRequestCancel={(reg) => setSelectedRegForCancel(reg)}
            onExploreEvents={() => {
              setCurrentTab('catalogo');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenTelegram={() => setTelegramModalOpen(true)}
            isTelegramLinked={user.telegramLinked}
          />
        )}

        {currentTab === 'perfil' && (
          <UserProfileView
            user={user}
            onUpdateProfile={handleUpdateProfile}
            onOpenTelegram={() => setTelegramModalOpen(true)}
            onOpenN8nModal={() => setN8nModalOpen(true)}
            onResetDemo={handleResetDemoData}
          />
        )}
      </main>

      {/* Floating Support Button */}
      {!supportOpen && (
        <button
          onClick={() => setSupportOpen(true)}
          aria-label="Abrir Asistente de Soporte IA"
          className="fixed bottom-6 left-6 z-40 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-2xl shadow-indigo-600/30 flex items-center gap-2.5 transition-all hover:scale-105 group"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold hidden sm:inline">Asistente EventPass</span>
        </button>
      )}

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTelegram={() => setTelegramModalOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenN8nModal={() => setN8nModalOpen(true)}
      />

      {/* Modals & Overlays */}
      <EventDetailModal
        event={selectedEventForDetail}
        onClose={() => setSelectedEventForDetail(null)}
        onRegister={handleRegisterToEvent}
        isRegistered={
          selectedEventForDetail ? userRegisteredEventIds.includes(selectedEventForDetail.id) : false
        }
        onViewRegistration={(eventId) => {
          setSelectedEventForDetail(null);
          setCurrentTab('inscripciones');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        isLoggedIn={isLoggedIn}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <DigitalTicketModal
        registration={selectedRegForTicket}
        onClose={() => setSelectedRegForTicket(null)}
      />

      <CancelConfirmModal
        registration={selectedRegForCancel}
        onClose={() => setSelectedRegForCancel(null)}
        onConfirmCancel={handleConfirmCancel}
      />

      <TelegramLinkingModal
        user={user}
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        onRequestNewCode={handleRequestTelegramCode}
        onSimulateLink={handleSimulateTelegramLink}
        onUnlink={handleUnlinkTelegram}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegisterUser}
      />

      <N8nConfigModal
        isOpen={n8nModalOpen}
        onClose={() => setN8nModalOpen(false)}
        onResetDemoData={handleResetDemoData}
      />

      <SupportAssistant
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        onOpenTelegram={() => {
          setSupportOpen(false);
          setTelegramModalOpen(true);
        }}
        onExploreCatalog={() => {
          setSupportOpen(false);
          setCurrentTab('catalogo');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
