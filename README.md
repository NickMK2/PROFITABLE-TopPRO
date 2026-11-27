# TopPRO

Asistente de rentabilidad para choferes y repartidores en moto (DiDi Moto, Uber, Rappi, Glovo,
Cabify, Yango, PedidosYa y genérico). **Solo Android.**

TopPRO lee el texto de las notificaciones entrantes, lo convierte a una métrica común y te dice
**ACEPTAR** o **ESPERAR** según cuánto te falte para la meta del día, cómo esté la demanda y cuánto
tiempo quede. Vos siempre tocás el botón de aceptar.

## Qué hace y qué no hace

**Hace:**
- Lee notificaciones de otras apps mediante un `NotificationListenerService` propio.
- Extrae tarifa, distancia, tiempo y vencimiento con un parser configurable.
- Calcula ganancia neta por hora: descuenta comisión y costo por km.
- Calcula un umbral dinámico y lo explica en pantalla.
- Registra cada oferta (aceptada o rechazada) y ajusta la demanda observada.
- Descarga un **catálogo versionado** de apps de Colombia/moto con modalidad, requisitos, pagos,
  comisión y link a términos oficiales; lo guarda en caché para funcionar sin internet.
- Registra opcionalmente **clientes frecuentes y rutas predecibles** (origen, destino, días, horas y
  coordenadas opcionales) para ordenar a quién conviene buscar primero.
- Muestra **señales públicas y agregadas** (salud, transporte, educación) con fuente, fecha y
  franjas horarias para elegir zonas sin depender de un cliente concreto.
- **Sugiere rutas y las valida en 7 días**: registrás viajes, tarifa, km muertos y tiempo, y la app
  indica si fue favorable, sin resultados o si faltan datos.
- Redacta correos, teléfonos, placas y números largos del texto de notificación antes de guardarlo.

**No hace:**
- No auto-acepta carreras. Las apps de transporte prohíben esa automatización y puede costar la
  cuenta; además, un bot de accesibilidad se rompe con cada cambio de interfaz.
- No funciona en Expo Go: el permiso de lectura de notificaciones requiere un APK con código nativo.
- No soporta iOS (no hay API pública para leer notificaciones de terceros).
- No lee contactos, correos, GPS, DiDi, PicUp ni bases de datos de terceros para "descubrir"
  clientes: los datos se cargan a mano, con consentimiento, y quedan en el dispositivo.
- No sube datos de clientes a GitHub ni a ningún servidor.

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

- Node 22 (o superior).
- Java 17 (JDK) para compilar Android.
- Android SDK: `platform-tools`, `platforms;android-35` y `build-tools;35.0.0`.
  No hace falta Android Studio; alcanzan las *Command-line Tools* de Google.
- Para instalar el APK en un celular: depuración USB activada.

## En una PC Windows nueva (todo en un paso)

```powershell
git clone https://github.com/NickMK2/TopPRO.git
cd TopPRO
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-windows.ps1
```

Ese script instala Node 22, JDK 17 y el SDK de Android (si faltan), corre `npm install`,
genera la carpeta nativa con `expo prebuild` y compila el APK. Al finalizar, el APK está en
`android\app\build\outputs\apk\debug\app-debug.apk`.

Si todo ya está instalado y solo querés recompilar:

```powershell
.\scripts\setup-android-sdk.ps1
npm install
npm run prebuild
```

`npm run prebuild` genera la carpeta `android/` con el módulo nativo incluido (autolinking del
paquete local `packages/rn-umbral-notifications`). El código Kotlin de ese módulo está versionado en
el repo; la carpeta `android/` de la raíz es generada y no se sube.

## Generar el APK

En PowerShell, desde la carpeta del proyecto:

```powershell
.\scripts\build-apk.ps1
```

El script configura `JAVA_HOME` y `ANDROID_HOME` y corre Gradle. El APK queda en:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

Para instalarlo en el celular:

```powershell
adb install -r "android\app\build\outputs\apk\debug\app-debug.apk"
```

También podés usar `npm run android` (`expo run:android`) si querés compilar e instalar en un
dispositivo conectado en un solo paso.

Si las versiones de Expo/RN quedan desactualizadas, ajustalas con:

```bash
npx expo install --fix
```

## Primer uso

1. Instalá el APK y abrí TopPRO.
2. Entrá a **ajustes** → **Activar acceso a notificaciones** y concedé el permiso del sistema.
3. Cargá tu **meta neta del día**, horario de inicio/fin, reserva $/h, piso duro y costo por km.
4. Entrá a **apps** para ver el catálogo de Colombia/moto: modalidad, requisitos, comisión y
   términos oficiales. Si hay una comisión sugerida, podés aplicarla a esa fuente desde el botón
   **Aplicar**.
5. En **clientes** cargás, solo si la persona autoriza, su alias, ruta, días/horas y preferencias.
6. En **rutas** cargás tu zona y el destino del pasajero actual; la app ordena los clientes
   recurrentes por ventana horaria, cercanía y coincidencia de destino, y abajo muestra las señales
   públicas vigentes para esa zona.
7. En **hoy** podés tocar **Simular oferta** para probar sin esperar una notificación real.
8. Cuando llegue una oferta, la app te lleva a **oferta** con la recomendación. Podés corregir los
   datos leídos, aceptar o rechazar.

## Catálogo remoto de apps (Colombia / moto)

El archivo `catalog/apps-colombia-moto.v1.json` es la **única fuente de datos** del catálogo. Se
incluye dentro del APK como copia inicial y además se publica en:

```
https://raw.githubusercontent.com/NickMK2/TopPRO/main/catalog/apps-colombia-moto.v1.json
```

Al abrir la pestaña **apps**, TopPRO descarga ese JSON desde GitHub, lo valida y lo guarda en
`AsyncStorage` (`toppro.catalog.v1`). Si no hay internet, usa la caché; si no hay caché, usa la copia
incluida. El botón **Actualizar catálogo** fuerza una nueva descarga.

Cada entrada tiene: nombre, `sourceId` (la fuente del parser), tipo de trabajo, vehículo,
disponibilidad, comisión (o `null` si la app no publica un porcentaje verificable), nota de comisión,
pagos, requisitos, observaciones, links oficiales y fecha de verificación.

**Importante:** las comisiones de transporte de pasajeros no son cifras oficiales fijas: DiDi,
Uber, Cabify y Yango no publican un porcentaje único por ciudad/servicio. Los valores iniciales de
Ajustes son orientativos y el catálogo lo indica. Rappi es la excepción: sus términos definen la
ganancia como domicilio + propina (propina 100 % del repartidor), por eso la sugerencia es 0 %.
Cuando una app no publica datos para Colombia, la entrada figura como **disponibilidad a verificar**.

Para actualizar el catálogo: editá el JSON, subí el cambio a `main` y tocá **Actualizar** en la app.
No hace falta recompilar. Si agregás una app nueva con `sourceId` nuevo, sumalo también a
`ALL_SOURCES` en `src/domain/settings.ts`, a `SOURCE_PATTERNS` en
`src/ingest/notificationParser.ts` y a los valores por defecto, y recompilá.

## Clientes frecuentes y rutas predecibles (solo en el dispositivo)

La pestaña **clientes** es un registro *opt-in*: cada alta requiere marcar que la persona autorizó
guardar esos datos en tu celular. El consentimiento dura 12 meses, se puede renovar y cada registro
se puede borrar con confirmación. Campos: alias, teléfono/correo opcionales, zonas, preferencias,
origen, destino, días de la semana, hora de recogida, hora de regreso y coordenadas opcionales
(`lat,lon`). Se guarda en `AsyncStorage` (`toppro.customers.v1`), sin cifrar y sin salir del equipo.

La pestaña **rutas** usa ese registro para mostrar patrones:

- calcula la próxima recogida según día y hora;
- prioriza las que caen dentro de las próximas 2 horas;
- calcula distancia en línea recta si cargaste tus coordenadas y las del origen;
- si cargás la zona/destino del pasajero actual, marca qué cliente tiene el origen cerca de ese
  destino, para encadenar un viaje en vez de dar vueltas vacío;
- sin coordenadas, la coincidencia es por texto de zona (por ejemplo, "Chapinero" vs "casa en
  Chapinero").

Esto **no extrae** clientes de DiDi, PicUp ni de tus contactos. Usarlo para captar clientes fuera de
las plataformas puede violar sus términos; el módulo sirve para recordar y mejorar la atención dentro
de la relación que ya tenés. Si la persona dejó de necesitar el servicio o compró su vehículo,
borrala del registro.

## Señales públicas para decidir zona y franja

`catalog/public-flows-colombia.v1.json` complementa el catálogo de apps. No contiene personas:
resume patrones **públicos y agregados** con fuente, fecha de verificación y nivel de confianza
(`oficial`, `orientativo` o `verificar`). La app lo descarga desde:

```
https://raw.githubusercontent.com/NickMK2/TopPRO/main/catalog/public-flows-colombia.v1.json
```

Igual que el catálogo de apps, guarda caché en `AsyncStorage` (`toppro.flows.v1`) y sirve la copia
incluida si no hay internet. En la pestaña **rutas**, cada señal se muestra con:

- estado **AHORA / PRÓXIMO / MÁS TARDE / DINÁMICO** según la hora local;
- zona y coincidencia con la que cargaste como "Mi zona donde estoy";
- una frase de qué significa y otra de cómo usarla;
- franjas publicadas y botón para abrir la fuente.

Ejemplos incluidos con fuente oficial: horario de atención de la Secretaría Distrital de Salud,
horario del call center de citas médicas de la red pública (lunes a sábado, 06:00–20:00),
publicación diaria de puntos de vacunación en canales oficiales y estadísticas de validación por
portales del SITP. Las señales de campus universitarios y horarios de visitas de IPS están marcadas
como **a verificar**: no las trates como ciertas sin confirmar en la fuente local.

Esto no reemplaza tu criterio ni promete demanda: solo reduce las vueltas a ciegas al mostrarte
dónde y cuándo se concentra la actividad pública.

## Probar y validar una ruta durante 7 días

La pestaña **pruebas** cierra el ciclo: toma las mejores rutas de clientes con consentimiento y las
señales públicas mejor ubicadas, y te ofrece hasta 4 sugerencias con un botón **Probar 7 días**.
Cada prueba queda guardada en el celular (`toppro.route-trials.v1`) con:

- **día registrado**: fecha, viajes aceptados, tarifa total, km sin pasajero, minutos y nota
  opcional (si repetís la fecha, se reemplaza);
- **resumen**: días, viajes, tarifa, km muertos, neto estimado y neto por hora;
- **veredicto**: `favorable`, `sin-resultados` o `insuficiente`.

La regla es explicable y ajustable: se considera **favorable** con al menos 3 días registrados,
5 viajes y un neto estimado por hora ≥ el mínimo `$/h` que configuraste en Ajustes. El neto descuenta
la comisión promedio de tus fuentes activas y el costo por km. Si llega el día 7 sin alcanzar ese
valor, el veredicto es **sin resultados**; antes de eso, **insuficiente**. Podés validar cuando
quieras, borrar una prueba y repetirla después.

Esto no decide por vos: TopPRO solo sugiere y mide. El botón **Aceptar** sigue siendo tuyo en la app
de trabajo.

## Pruebas

```bash
npm test
```

Cubre el cálculo de métricas, la estrategia (ritmo, demanda, urgencia, supervivencia), el parser de
notificaciones en español, la validación de ambos catálogos, la redacción de datos personales, el
consentimiento de clientes, el plan de rutas con señales públicas y el ciclo de pruebas de 7 días
con sus tres veredictos.

## Estructura

```
src/
  domain/        lógica pura: tipos, métricas, estrategia, decisión, config, catálogos, clientes, rutas
  ingest/        parseo de números, notificaciones y redacción de datos personales
  state/         estado del día, catálogos, clientes y persistencia local (AsyncStorage)
  ui/            pantallas Hoy / Oferta / Apps / Rutas / Pruebas / Clientes / Ajustes
catalog/         JSON versionado de apps y de señales públicas (fuente única + copia incluida)
packages/
  rn-umbral-notifications/   módulo nativo Android (NotificationListenerService)
src/__tests__/   pruebas de la lógica
```

## Si una app cambia el formato de sus notificaciones

Agregá o ajustá las expresiones regulares en `src/ingest/notificationParser.ts` y un caso de prueba
en `src/__tests__/parser.test.ts`. Los campos que no se puedan leer aparecen marcados en la pantalla
**oferta** para que los completes a mano. Para datos de modalidad/requisitos/comisión, editá el JSON
de `catalog/` (ver sección anterior).

## Estado

MVP funcional. La lógica de negocio es la parte principal y es independiente de la UI, así que se
puede probar y ajustar sin compilar la app.

