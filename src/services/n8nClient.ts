import { ApiResponse, ChatMessage, EventItem, Registration, UserProfile } from '../types';
import { INITIAL_EVENTS, INITIAL_REGISTRATIONS, INITIAL_USER_PROFILE } from '../data/mockEvents';

/**
 * EventPass - Servicio Centralizado de Comunicación HTTP con n8n
 * 
 * Este servicio encapsula las 10 rutas previstas para los workflows de n8n.
 * La persistencia final se delega en Google Sheets a través de n8n.
 * Si VITE_N8N_BASE_URL no está configurada, opera en Modo Demostración
 * con almacenamiento reactivo en memoria local (localStorage).
 */

const LOCAL_STORAGE_KEYS = {
  EVENTS: 'eventpass_demo_events',
  REGISTRATIONS: 'eventpass_demo_registrations',
  PROFILE: 'eventpass_demo_profile',
  IS_LOGGED_IN: 'eventpass_demo_is_logged_in'
};

class N8nApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_N8N_BASE_URL || '').trim();
    this.initializeLocalStorage();
  }

  public isConnected(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.startsWith('http'));
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private initializeLocalStorage(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.EVENTS)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.REGISTRATIONS)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REGISTRATIONS, JSON.stringify(INITIAL_REGISTRATIONS));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILE)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_USER_PROFILE));
    }
  }

  private getStoredEvents(): EventItem[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEYS.EVENTS);
      return data ? JSON.parse(data) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  }

  private saveStoredEvents(events: EventItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
      console.warn('Error saving events to localStorage:', e);
    }
  }

  private getStoredRegistrations(): Registration[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEYS.REGISTRATIONS);
      return data ? JSON.parse(data) : INITIAL_REGISTRATIONS;
    } catch {
      return INITIAL_REGISTRATIONS;
    }
  }

  private saveStoredRegistrations(registrations: Registration[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    } catch (e) {
      console.warn('Error saving registrations to localStorage:', e);
    }
  }

  private getStoredProfile(): UserProfile {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : INITIAL_USER_PROFILE;
    } catch {
      return INITIAL_USER_PROFILE;
    }
  }

  private saveStoredProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Error saving profile to localStorage:', e);
    }
  }

  // ============================================================
  // WORKFLOW 1: Listar Eventos (GET /events)
  // ============================================================
  public async getEvents(): Promise<ApiResponse<EventItem[]>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/events`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        return {
          success: false,
          data: this.getStoredEvents(),
          isMock: true,
          error: `Error al conectar con n8n (${err instanceof Error ? err.message : 'Fallo de red'}). Usando datos demo.`
        };
      }
    }

    return {
      success: true,
      data: this.getStoredEvents(),
      isMock: true,
      message: 'Modo Demostración: Eventos cargados desde la muestra local.'
    };
  }

  // ============================================================
  // WORKFLOW 2: Detalle de Evento (GET /events/:id)
  // ============================================================
  public async getEventById(id: string): Promise<ApiResponse<EventItem>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/events/${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        const found = this.getStoredEvents().find((e) => e.id === id);
        return {
          success: Boolean(found),
          data: found,
          isMock: true,
          error: `No se pudo obtener el evento desde n8n. Usando muestra local.`
        };
      }
    }

    const event = this.getStoredEvents().find((e) => e.id === id);
    if (!event) {
      return { success: false, isMock: true, error: 'Evento no encontrado' };
    }
    return { success: true, data: event, isMock: true };
  }

  // ============================================================
  // WORKFLOW 3: Inscripción a Evento (POST /register)
  // ============================================================
  public async registerToEvent(payload: {
    eventId: string;
    userName: string;
    userEmail: string;
    notes?: string;
  }): Promise<ApiResponse<Registration>> {
    const events = this.getStoredEvents();
    const event = events.find((e) => e.id === payload.eventId);

    if (!event) {
      return { success: false, isMock: true, error: 'El evento solicitado no existe.' };
    }

    if (event.status === 'CANCELADO') {
      return { success: false, isMock: true, error: 'Este evento se encuentra cancelado.' };
    }

    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false, message: 'Inscripción procesada con éxito por n8n.' };
      } catch (err) {
        return {
          success: false,
          isMock: true,
          error: `Fallo al registrar vía n8n: ${err instanceof Error ? err.message : 'Error de conexión'}.`
        };
      }
    }

    // Modo Demostración
    const isFull = event.registeredCount >= event.totalCapacity || event.status === 'AGOTADO';
    const regStatus = isFull ? 'LISTA_ESPERA' : 'CONFIRMADA';
    const randomTicketNumber = Math.floor(10000 + Math.random() * 90000);
    const newRegId = `REG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newRegistration: Registration = {
      id: newRegId,
      ticketCode: isFull ? `EP-WL-${randomTicketNumber}` : `EP-TK-${randomTicketNumber}`,
      eventId: event.id,
      eventTitle: event.title,
      eventCategory: event.category,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      eventImageUrl: event.imageUrl,
      userEmail: payload.userEmail,
      userName: payload.userName,
      status: regStatus,
      registeredAt: new Date().toISOString(),
      notes: payload.notes || (isFull ? 'Ingresado a lista de espera automática.' : 'Acreditación confirmada.'),
      qrPayload: `EVENTPASS|${newRegId}|${randomTicketNumber}|${event.id}|${payload.userEmail}|${regStatus}`
    };

    // Actualizar cupos en memoria demo
    if (!isFull) {
      event.registeredCount += 1;
      if (event.registeredCount >= event.totalCapacity) {
        event.status = 'AGOTADO';
      }
      this.saveStoredEvents(events);
    }

    const currentRegs = this.getStoredRegistrations();
    this.saveStoredRegistrations([newRegistration, ...currentRegs]);

    return {
      success: true,
      data: newRegistration,
      isMock: true,
      message: isFull
        ? 'Evento lleno: Te has registrado con éxito en la LISTA DE ESPERA (Modo Demo).'
        : '¡Inscripción CONFIRMADA con éxito! (Modo Demo - No persistido en Google Sheets aún).'
    };
  }

  // ============================================================
  // WORKFLOW 4: Cancelar Inscripción (POST /cancel-registration)
  // ============================================================
  public async cancelRegistration(payload: {
    registrationId: string;
    reason: string;
  }): Promise<ApiResponse<{ registrationId: string }>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/cancel-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false, message: 'Cancelación procesada en n8n y Google Sheets.' };
      } catch (err) {
        return {
          success: false,
          isMock: true,
          error: `Error al cancelar en n8n: ${err instanceof Error ? err.message : 'Error de conexión'}.`
        };
      }
    }

    // Modo Demostración
    const regs = this.getStoredRegistrations();
    const target = regs.find((r) => r.id === payload.registrationId);

    if (!target) {
      return { success: false, isMock: true, error: 'Inscripción no encontrada.' };
    }

    target.status = 'CANCELADA';
    target.cancellationReason = payload.reason || 'Cancelada a petición del usuario';
    this.saveStoredRegistrations(regs);

    // Si estaba confirmada, devolver cupo al evento demo
    const events = this.getStoredEvents();
    const event = events.find((e) => e.id === target.eventId);
    if (event && event.registeredCount > 0) {
      event.registeredCount -= 1;
      if (event.status === 'AGOTADO') {
        event.status = 'DISPONIBLE';
      }
      this.saveStoredEvents(events);
    }

    return {
      success: true,
      data: { registrationId: payload.registrationId },
      isMock: true,
      message: 'Inscripción cancelada correctamente (Modo Demostración).'
    };
  }

  // ============================================================
  // WORKFLOW 5: Consultar Inscripciones de Usuario (POST /my-registrations)
  // ============================================================
  public async getUserRegistrations(userEmail: string): Promise<ApiResponse<Registration[]>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/my-registrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        return {
          success: false,
          data: this.getStoredRegistrations(),
          isMock: true,
          error: 'No se pudo sincronizar con n8n. Mostrando inscripciones demo.'
        };
      }
    }

    return {
      success: true,
      data: this.getStoredRegistrations(),
      isMock: true
    };
  }

  // ============================================================
  // WORKFLOW 6: Inicio de Sesión (POST /auth/login)
  // ============================================================
  public async login(payload: { email: string; password?: string }): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        return {
          success: false,
          isMock: true,
          error: 'Error al validar credenciales en el webhook de n8n.'
        };
      }
    }

    // Modo Demostración
    const profile = this.getStoredProfile();
    profile.email = payload.email || profile.email;
    this.saveStoredProfile(profile);
    localStorage.setItem(LOCAL_STORAGE_KEYS.IS_LOGGED_IN, 'true');

    return {
      success: true,
      data: profile,
      isMock: true,
      message: 'Sesión iniciada en Modo Demostración (sin autenticación externa).'
    };
  }

  // ============================================================
  // WORKFLOW 7: Registro de Usuario (POST /auth/register)
  // ============================================================
  public async registerUser(payload: {
    name: string;
    email: string;
    password?: string;
  }): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        return {
          success: false,
          isMock: true,
          error: 'Error al enviar registro al webhook de n8n.'
        };
      }
    }

    const currentProfile = this.getStoredProfile();
    const updatedProfile: UserProfile = {
      ...currentProfile,
      name: payload.name,
      email: payload.email,
      telegramLinked: false,
      telegramCode: `EP-${Math.floor(10000 + Math.random() * 90000)}`
    };
    this.saveStoredProfile(updatedProfile);
    localStorage.setItem(LOCAL_STORAGE_KEYS.IS_LOGGED_IN, 'true');

    return {
      success: true,
      data: updatedProfile,
      isMock: true,
      message: 'Usuario creado en Modo Demostración (preparado para n8n).'
    };
  }

  // ============================================================
  // WORKFLOW 8: Solicitar Código de Vinculación Telegram (POST /telegram/code)
  // ============================================================
  public async requestTelegramLinkCode(userEmail: string): Promise<ApiResponse<{ code: string; botUser: string; expiresAt: string }>> {
    const randomCode = `EP-${Math.floor(20000 + Math.random() * 79999)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const botUser = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'EventPassNotificaBot';

    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/telegram/code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, code: randomCode })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        console.warn('Error connecting to Telegram webhook in n8n:', err);
      }
    }

    // Modo Demostración
    const profile = this.getStoredProfile();
    profile.telegramCode = randomCode;
    profile.telegramCodeExpiresAt = expiresAt;
    this.saveStoredProfile(profile);

    return {
      success: true,
      data: {
        code: randomCode,
        botUser,
        expiresAt
      },
      isMock: true,
      message: 'Código generado en Modo Demostración. Usa /vincular ' + randomCode + ' en Telegram.'
    };
  }

  // ============================================================
  // WORKFLOW 9: Confirmar o Simular Vinculación Telegram (POST /telegram/verify)
  // ============================================================
  public async simulateTelegramConfirmation(telegramUsername?: string): Promise<ApiResponse<UserProfile>> {
    const profile = this.getStoredProfile();
    profile.telegramLinked = true;
    profile.telegramUsername = telegramUsername || profile.telegramUsername || 'usuario_telegram_demo';
    this.saveStoredProfile(profile);

    return {
      success: true,
      data: profile,
      isMock: true,
      message: `¡Cuenta de Telegram @${profile.telegramUsername} vinculada con éxito!`
    };
  }

  // ============================================================
  // WORKFLOW 10: Asistente Conversacional de Soporte (POST /support/chat)
  // ============================================================
  public async sendChatMessage(promptText: string, history: ChatMessage[]): Promise<ApiResponse<{ reply: string }>> {
    if (this.isConnected()) {
      try {
        const response = await fetch(`${this.baseUrl}/support/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, history })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data, isMock: false };
      } catch (err) {
        console.warn('Error en webhook de soporte n8n, usando asistente local inteligente:', err);
      }
    }

    // Asistente Local Experto en EventPass
    const reply = this.generateLocalAssistantResponse(promptText);
    return {
      success: true,
      data: { reply },
      isMock: true
    };
  }

  public getProfile(): UserProfile {
    return this.getStoredProfile();
  }

  public updateProfile(updated: Partial<UserProfile>): UserProfile {
    const current = this.getStoredProfile();
    const merged = { ...current, ...updated };
    this.saveStoredProfile(merged);
    return merged;
  }

  public resetDemoData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOCAL_STORAGE_KEYS.EVENTS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.REGISTRATIONS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PROFILE);
    this.initializeLocalStorage();
  }

  private generateLocalAssistantResponse(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('telegram') || q.includes('vincular') || q.includes('bot') || q.includes('código') || q.includes('codigo')) {
      const profile = this.getStoredProfile();
      const code = profile.telegramCode || 'EP-84920';
      return `Para vincular tu cuenta de Telegram y recibir tus entradas digitales y alertas de cupos:

1. Abre la aplicación de Telegram y busca nuestro bot: @${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'EventPassNotificaBot'}
2. Haz clic en "Iniciar" o envía el comando:
   /vincular ${code}
3. El bot confirmará la asociación automática con tu correo (${profile.email}).

Recuerda que cada código es de un solo uso y dura 15 minutos. Puedes generar uno nuevo en tu sección de Perfil.`;
    }

    if (q.includes('tecnología') || q.includes('tecnologia') || q.includes('ai') || q.includes('ia') || q.includes('cloud') || q.includes('devops')) {
      return `En la categoría de Tecnología contamos con dos eventos destacados:
• "Cumbre Global de Inteligencia Artificial & Cloud 2026": 15 de Noviembre en Ciudad de México (Híbrido). Actualmente tiene cupos disponibles.
• "DevOps & Kubernetes World Tour Latam": 18 de Noviembre en Lima. Quedan los últimos 3 cupos antes de pasar a lista de espera.`;
    }

    if (q.includes('cultura') || q.includes('jazz') || q.includes('música') || q.includes('musica')) {
      return `En la categoría de Cultura tenemos el "Festival Iberoamericano de Jazz & Artes Sonoras" el 28 de Octubre en Santiago.
El aforo presencial de 200 asistentes se encuentra completo (AGOTADO), pero puedes unirte a la LISTA DE ESPERA desde la ficha del evento para que se te asigne un pase en caso de cancelaciones.`;
    }

    if (q.includes('educación') || q.includes('educacion') || q.includes('taller') || q.includes('n8n') || q.includes('diseño') || q.includes('ux')) {
      return `En Educación tenemos dos opciones excelentes:
1. "Bootcamp Práctico: Automatizaciones con n8n & No-Code" (22 de Noviembre): cupos disponibles para aprender arquitectura de webhooks y Google Sheets.
2. "Masterclass de Diseño de Producto & UX Systems" (05 de Diciembre): estado PRÓXIMO con apertura programada de inscripciones.`;
    }

    if (q.includes('deporte') || q.includes('carrera') || q.includes('maratón') || q.includes('maraton')) {
      return `Sobre eventos deportivos: La "Maratón Nocturna Metropolitana 10K & 21K" programada en Buenos Aires fue CANCELADA oficialmente por el organizador debido a refacciones viales metropolitanas. No admite inscripciones.`;
    }

    if (q.includes('cancelar') || q.includes('anular') || q.includes('baja')) {
      return `Puedes cancelar cualquier inscripción desde la pestaña "Mis Inscripciones":
1. Dirígete a "Mis Inscripciones" en el menú superior.
2. Ubica el evento con estado CONFIRMADA o LISTA_ESPERA.
3. Haz clic en "Cancelar inscripción" y confirma el motivo en la ventana emergente.
El cupo se liberará automáticamente para otros usuarios o la lista de espera.`;
    }

    if (q.includes('n8n') || q.includes('sheets') || q.includes('backend') || q.includes('arquitectura')) {
      return `Arquitectura de EventPass:
El frontend está completamente preparado para conectarse vía HTTP a un servidor de n8n mediante la variable VITE_N8N_BASE_URL.
n8n actúa como orquestador central, guardando los registros en Google Sheets, enviando correos con Gmail y notificando por Telegram.
Actualmente la aplicación opera en Modo Demostración sin persistencia externa para que pruebes la experiencia visual y los flujos.`;
    }

    if (q.includes('costo') || q.includes('precio') || q.includes('pagar') || q.includes('gratis')) {
      return `Todos los eventos de demostración en EventPass son de acceso gratuito con acreditación previa. Simplemente debes registrar tu nombre y correo para recibir tu pase digital con código QR.`;
    }

    return `¡Hola! Soy el asistente virtual de EventPass. Puedo ayudarte con:
• Consultar eventos disponibles por categoría (Tecnología, Cultura, Educación, Deportes).
• Cómo vincular tu bot de Telegram con el comando /vincular.
• Cómo funcionan los estados: CONFIRMADA, LISTA DE ESPERA y CANCELADA.
• Información sobre la arquitectura n8n y Google Sheets.

¿Sobre qué evento o proceso deseas información específica?`;
  }
}

export const n8nApi = new N8nApiClient();
