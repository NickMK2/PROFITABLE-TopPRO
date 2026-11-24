# Umbral

Asistente de rentabilidad para choferes de apps de transporte de pasajeros (DiDi, Uber, Cabify,
Bolt, Yango). **Solo Android.**

Umbral lee el texto de las notificaciones entrantes, lo convierte a una métrica común y te dice
**ACEPTAR** o **ESPERAR** según cuánto te falte para la meta del día, cómo esté la demanda y cuánto
tiempo quede. Vos siempre tocás el botón de aceptar.

## Qué hace y qué no hace

**Hace:**
- Lee notificaciones de otras apps mediante un `NotificationListenerService` propio.
- Extrae tarifa, distancia, tiempo y vencimiento con un parser configurable.
- Calcula ganancia neta por hora: descuenta comisión y costo por km.
- Calcula un umbral dinámico y lo explica en pantalla.
- Registra cada oferta (aceptada o rechazada) y ajusta la demanda observada.

**No hace:**
- No auto-acepta carreras. Las apps de transporte prohíben esa automatización y puede costar la
  cuenta; además, un bot de accesibilidad se rompe con cada cambio de interfaz.
- No funciona en Expo Go: el permiso de lectura de notificaciones requiere un APK con código nativo.
- No soporta iOS (no hay API pública para leer notificaciones de terceros).

## Cómo se calcula la recomendación

Para cada oferta:

```
comisión        = tarifa × comisión_de_la_app
costo variable  = km × costo_por_km
ganancia        = tarifa − comisión − costo variable
$/h neto        = ganancia / (minutos_totales / 60)
```

Los minutos y kilómetros incluyen el traslado hasta recoger al pasajero.

El umbral del momento combina tres señales:

```
ritmo requerido = (meta − ganado) / (horas_restantes ×utilización)
factor demanda  = 1 + ((ofertas/h − referencia) / referencia) × 0,2   [0,85 … 1,25]
factor urgencia = ganado / (meta × fracción_del_día_transcurrido)      [0,7 … 1,3]
factor meta     = ritmo requerido / reserva                            [0,8 … 1,35]

umbral = reserva × factor meta × factor urgencia × factor demanda
```

- Si **vas detrás**, el factor de urgencia baja el umbral: aceptás carreras menos rentables para no
  quedarte parado y seguir sumando hacia la meta.
- Si **hay pocas ofertas**, el factor de demanda baja el umbral. Si hay muchas, sube: podés esperar.
- En el **último tramo con poco progreso** entra el modo *supervivencia*: se acepta cualquier viaje
  que cubra costos, aunque quede lejos de la meta ideal.
- El umbral nunca baja del piso duro configurado, y nunca sube más de 1,8× la reserva.

## Requisitos

- Node LTS (22 o superior).
- Java 17 (JDK) para compilar Android.
- Android Studio con SDK de Android instalado.
- Un celular Android con depuración USB o un emulador.

## Instalación

```bash
npm install
npm run prebuild
npm run build:android
```

`npm run prebuild` genera la carpeta `android/` con el módulo nativo incluido (autolinking del
paquete local `packages/rn-umbral-notifications`). `npm run build:android` compila e instala el APK
en el dispositivo conectado.

Si las versiones de Expo/RN quedan desactualizadas, ajustalas con:

```bash
npx expo install --fix
```

## Primer uso

1. Instalá el APK y abrí Umbral.
2. Entrá a **ajustes** → **Activar acceso a notificaciones** y concedé el permiso del sistema.
3. Cargá tu **meta neta del día**, horario de inicio/fin, reserva $/h, piso duro y costo por km.
4. En **hoy** podés tocar **Simular oferta** para probar sin esperar una notificación real.
5. Cuando llegue una oferta, la app te lleva a **oferta** con la recomendación. Podés corregir los
   datos leídos, aceptar o rechazar.

## Pruebas

```bash
npm test
```

Cubre el cálculo de métricas, la estrategia (ritmo, demanda, urgencia, supervivencia) y el parser de
notificaciones en español.

## Estructura

```
src/
  domain/        lógica pura: tipos, métricas, estrategia, decisión, config
  ingest/        parseo de números y de texto de notificaciones
  state/         estado del día + persistencia local (AsyncStorage)
  ui/            pantallas Hoy / Oferta / Ajustes
packages/
  rn-umbral-notifications/   módulo nativo Android (NotificationListenerService)
src/__tests__/   pruebas de la lógica
```

## Si una app cambia el formato de sus notificaciones

Agregá o ajustá las expresiones regulares en `src/ingest/notificationParser.ts` y un caso de prueba
en `src/__tests__/parser.test.ts`. Los campos que no se puedan leer aparecen marcados en la pantalla
**oferta** para que los completes a mano.

## Estado

MVP funcional. La lógica de negocio es la parte principal y es independiente de la UI, así que se
puede probar y ajustar sin compilar la app.
