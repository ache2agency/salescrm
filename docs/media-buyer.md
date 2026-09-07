# Media Buyer — Meta Ads de Windsor

## Cuenta de anuncios correcta

```
act_415474617591867
```

Vive en el Business Manager **"haroldharden"** (business_id `1068500953304210`),
compartida como socio hacia el BM "Instituto Windsor". Es la cuenta **activa y sana**
por la que corren todas las campañas actuales de Windsor (licenciaturas, cursos de
inglés, bachillerato, etc).

**No usar** `act_10151556938110123` — es la cuenta vieja "Windsor" dentro del BM
"Instituto Windsor", está **restringida por Meta** ("You can't run ads"), $0 gastado,
y la apelación quedó pospuesta a propósito para septiembre 2026. Si algo se ve raro
en el Ads Manager por navegador, es probable que se esté mirando esta cuenta vieja
por error.

## Token de acceso

```
windsor/windsorcrm/tokenMeta.txt
```

Archivo de una sola línea con un access token de larga duración de la Graph API de
Meta, con permisos sobre `act_415474617591867`.

## Cómo consultar (Graph API v21.0, vía curl — no navegador)

Insights por campaña (ajustar `date_preset` según el rango que se necesite:
`last_7d`, `last_30d`, etc.):

```bash
TOKEN=$(cat windsor/windsorcrm/tokenMeta.txt)
curl -s -G "https://graph.facebook.com/v21.0/act_415474617591867/insights" \
  --data-urlencode "level=campaign" \
  --data-urlencode "date_preset=last_30d" \
  --data-urlencode "fields=campaign_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type" \
  --data-urlencode "access_token=$TOKEN"
```

Lista de campañas con estado y presupuesto:

```bash
curl -s -G "https://graph.facebook.com/v21.0/act_415474617591867/campaigns" \
  --data-urlencode "fields=name,effective_status,daily_budget" \
  --data-urlencode "access_token=$TOKEN"
```

De los `actions` devueltos por insights, la métrica clave para medir conversión de
estas campañas (todas apuntan a WhatsApp/Messenger) es:

- `onsite_conversion.total_messaging_connection` → conversaciones iniciadas
- El costo por conversación sale de `cost_per_action_type` con el mismo action_type

## Por qué usar API y no navegador

Ver preferencia general del usuario: siempre que haya API disponible (Meta Ads,
Drive, etc), usarla en vez de automatizar el navegador — es más confiable y no
depende de sesión/UI.

## Snapshot de referencia (2026-09-06, últimos 30 días)

Gasto total: **$22,966.55 MXN** en 8 campañas con gasto, 6 activas al momento:

| Campaña | Estado | Gasto | Conversaciones | Costo/conv. |
|---|---|---|---|---|
| Licenciatura en Psicología | Activa | $5,983.67 | 252 | $23.74 |
| Licenciatura en Inglés | Activa | $5,754.52 | 170 | $33.85 |
| Licenciatura en Adm. | Activa | $3,477.43 | 69 | $50.40 |
| Bachillerato | Activa | $2,995.17 | 103 | $29.08 |
| Cursos inglés adultos | Activa | $1,739.69 | 125 | $13.92 |
| Cursos inglés niños | Activa | $1,644.29 | 150 | $10.96 |
| Licenciatura en Mercadotecnia | Pausada | $1,371.01 | 36 | $38.08 |

Rango sano de costo por conversación para esta cuenta: **$8–$50**. Fuera de ese
rango, investigar.

Otras ~10 campañas (Verano, Psicoterapeuta, versiones viejas de Inglés/Psicología)
están pausadas sin gasto activo — son histórico, no requieren atención.
