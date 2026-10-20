# EventPass 🎟️

Plataforma moderna, elegante y profesional para el descubrimiento de eventos y la gestión ágil de inscripciones con acreditación digital, integración para orquestación con **n8n**, persistencia en **Google Sheets** y notificaciones en tiempo real vía **Telegram Bot**.

---

## 🌟 Características Principales

1. **Página de Inicio de Alto Impacto**:
   - Hero banner cinematográfico con buscador por texto y categoría.
   - Accesos directos a las categorías principales (*Tecnología, Educación, Cultura, Deportes*).
   - Escaparate de eventos destacados con cupos en tiempo real.

2. **Catálogo de Eventos Completo**:
   - Búsqueda reactiva por palabra clave, tema o ciudad.
   - Filtros por categoría y estado de aforo (*Disponibles, Lista de espera, Próximos, Cancelados*).
   - Visualización gráfica de capacidad y cupos restantes por evento.

3. **Página de Detalle de Evento**:
   - Ficha técnica completa: imagen de alta resolución, fechas, horarios, ponentes, sede, aforo y requisitos.
   - Flujo de inscripción inmediato o solicitud para lista de espera cuando el evento está lleno.
   - Cronograma detallado por bloques de tiempo.

4. **Gestión de Inscripciones ("Mis Inscripciones")**:
   - Pestañas por estado: `CONFIRMADA`, `LISTA_ESPERA` y `CANCELADA`.
   - **Pase Digital con Código QR**: visualización del boleto digital con código único (`EP-TK-XXXXX`) listo para imprimir o guardar.
   - **Cancelación con confirmación previa**: diálogo estricto para liberar el cupo hacia la lista de espera con selección de motivo.

5. **Vinculación con Bot de Telegram**:
   - Guía visual interactiva paso a paso para vincular la cuenta mediante el comando `/vincular CODIGO`.
   - Generación de códigos únicos temporales con botón de copiado rápido.
   - Botón de simulación para verificar el comportamiento en modo demostración.

6. **Asistente Conversacional de Soporte**:
   - Ventana de chat flotante con respuestas inmediatas sobre categorías, fechas, cancelaciones y comandos de Telegram.
   - Preguntas rápidas sugeridas para resolver dudas comunes.

7. **Panel de Perfil de Usuario**:
   - Consulta y actualización de datos de contacto (nombre, correo, teléfono, ciudad, organización).
   - Gestión de preferencias de notificación (Correo electrónico y Telegram).

---

## 📐 Arquitectura del Sistema

El frontend sigue un principio estricto de **desacoplamiento total**:

- **Sin conexión directa a Google Sheets**: El cliente en React nunca interactúa de manera directa con las APIs de Google ni almacena credenciales en el navegador.
- **Sin base de datos propietaria alternativa**: No se utiliza Firebase ni Firestore. La persistencia definitiva se gestiona a través de los webhooks de n8n hacia Google Sheets.
- **Servicio Centralizado HTTP**: Todas las peticiones se concentran en `src/services/n8nClient.ts`, que consume la variable de entorno `VITE_N8N_BASE_URL`.
- **Modo Demostración Integrado**: Si la variable `VITE_N8N_BASE_URL` no está definida, la aplicación opera de forma transparente en memoria local (`localStorage`), permitiendo probar todas las pantallas y flujos de usuario sin interrupciones.

### Los 10 Workflows de EventPass en n8n

| # | Endpoint / Webhook | Método | Propósito |
|---|--------------------|--------|-----------|
| 01 | `/events` | `GET` | Listar catálogo de eventos activos desde Google Sheets |
| 02 | `/events/:id` | `GET` | Obtener ficha detallada y aforo actualizado del evento |
| 03 | `/register` | `POST` | Validar aforo, registrar fila en Sheets y generar pase |
| 04 | `/cancel-registration`| `POST` | Marcar baja en Sheets y reasignar vacante a lista de espera |
| 05 | `/my-registrations` | `POST` | Consultar acreditaciones del usuario por correo |
| 06 | `/auth/login` | `POST` | Validar credenciales de acceso |
| 07 | `/auth/register` | `POST` | Registrar nuevo usuario con código inicial de Telegram |
| 08 | `/telegram/code` | `POST` | Generar código de vinculación temporal de 6 caracteres |
| 09 | `/telegram/verify` | `POST` | Procesar el comando `/vincular` enviado al bot |
| 10 | `/support/chat` | `POST` | Asistente inteligente para resolución de preguntas frecuentes |

---

## 🚀 Instrucciones de Ejecución Local

### Prerrequisitos
- Node.js versión 18 o superior.
- npm o pnpm.

### 1. Clonar o descargar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd eventpass
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno (Opcional)
Copia el archivo `.env.example` como `.env`:
```bash
cp .env.example .env
```
Si cuentas con una instancia de n8n con los webhooks activos, define su URL base:
```env
VITE_N8N_BASE_URL="https://tu-instancia-n8n.com/webhook"
VITE_TELEGRAM_BOT_USERNAME="EventPassNotificaBot"
```
*Si dejas la variable vacía, el frontend funcionará inmediatamente en **Modo Demostración** con datos simulados.*

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 5. Compilar para producción
```bash
npm run build
```

---

## ☁️ Despliegue en Vercel

El proyecto está estructurado como una Single Page Application (SPA) estándar compatible con Vercel:

1. Importa el repositorio en tu panel de **Vercel**.
2. **Framework Preset**: `Vite`.
3. **Build Command**: `npm run build`.
4. **Output Directory**: `dist`.
5. En la sección de **Environment Variables**, puedes agregar:
   - `VITE_N8N_BASE_URL`: URL del webhook base de tu n8n.
   - `VITE_TELEGRAM_BOT_USERNAME`: Nombre del bot de Telegram creado en BotFather.

---

## 📋 Datos de Demostración Incluidos

El prototipo incluye 6 eventos ficticios con estados variados:
1. **Cumbre Global de IA & Cloud 2026** *(Tecnología)*: Disponible con cupos activos.
2. **Festival Iberoamericano de Jazz & Artes Sonoras** *(Cultura)*: Aforo completo (`AGOTADO`) con opción a lista de espera.
3. **Masterclass de Diseño de Producto & UX Systems** *(Educación)*: Próxima apertura de registros (`PROXIMO`).
4. **Maratón Nocturna Metropolitana 10K & 21K** *(Deportes)*: Evento cancelado oficialmente (`CANCELADO`) con motivo público.
5. **DevOps & Kubernetes World Tour Latam** *(Tecnología)*: Últimos 3 cupos disponibles.
6. **Bootcamp Práctico: Automatizaciones con n8n & No-Code** *(Educación)*: Disponible con cupos libres.

Usuario demo preconfigurado:
- **Correo**: `sofia.valenzuela@ejemplo.com`
- **Nombre**: Sofía Valenzuela
- **Telegram**: `@sofia_techie` (Vinculado en demo)
