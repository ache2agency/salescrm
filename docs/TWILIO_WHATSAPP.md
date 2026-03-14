# Configuración de WhatsApp con Twilio

Si al enviar desde el panel CONVERSACIONES aparece **"Twilio could not find a Channel with the specified From address"**, el número con el que intentas enviar no está configurado como canal de WhatsApp en tu cuenta Twilio.

## Pasos para corregirlo

### 1. Obtener el número correcto (Sandbox de WhatsApp)

1. Entra a [Twilio Console](https://console.twilio.com).
2. Menú **Messaging** → **Try it out** → **Send a WhatsApp message** (o **WhatsApp** en el menú lateral).
3. Ahí verás el **número del sandbox** (ej. `+1 415 523 8886`).
4. Cópialo **sin espacios**, con el `+`: `+14155238886`.

### 2. Configurar `.env.local`

En la raíz del proyecto, en `.env.local`, define:

```env
TWILIO_WHATSAPP_NUMBER=+14155238886
```

- **Solo el número**, sin prefijo `whatsapp:` (el código lo agrega).
- Formato E.164: código de país + número (ej. México `+52`, USA `+1`).
- Si usas **WhatsApp Sandbox**, el número es el que muestra Twilio en "Send a WhatsApp message".
- Si más adelante usas un **número propio** de WhatsApp Business, sustituye por ese número.

### 3. Reiniciar el servidor

Después de cambiar `.env.local`, reinicia el servidor de desarrollo:

```bash
# Ctrl+C para detener, luego:
npm run dev
```

### 4. Sandbox: el número debe poder recibir

En **WhatsApp Sandbox** de Twilio, solo puedes enviar mensajes a números que **ya hayan escrito** al número del sandbox (han “entrado” al sandbox). Si envías a un número que nunca ha escrito al bot:

- Twilio puede aceptar el envío (200 OK).
- El mensaje **no se entrega** en WhatsApp.

Para recibir en tu propio WhatsApp:

1. En tu teléfono, abre WhatsApp.
2. Inicia un chat con el **número del sandbox** (el de `TWILIO_WHATSAPP_NUMBER`).
3. Envía el mensaje que Twilio te indique (ej. `join <código>`).
4. A partir de ahí ese número ya puede recibir mensajes desde el CRM.

### 5. Probar de nuevo

En el CRM → **CONVERSACIONES** → selecciona un chat → escribe un mensaje → **Enviar**. El mensaje se verá en el chat (burbuja azul). Si no llega al WhatsApp, comprueba que ese contacto haya escrito antes al número del sandbox.

---

## Variables necesarias

| Variable | Descripción |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | SID de tu cuenta (Twilio Console → Dashboard) |
| `TWILIO_AUTH_TOKEN` | Token de autenticación (misma página) |
| `TWILIO_WHATSAPP_NUMBER` | Número del sandbox o de WhatsApp Business (ej. `+14155238886`) |

## En producción (Vercel)

Añade las mismas variables en **Vercel** → tu proyecto → **Settings** → **Environment Variables**, para que el envío desde el CRM en producción también funcione.
