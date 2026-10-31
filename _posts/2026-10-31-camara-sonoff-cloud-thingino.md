---
layout: post
title: La cámara que hablaba demasiado
subtitle: Cómo liberé del cloud a mi cámara Sonoff CAM-S2, de la ingeniería inversa al firmware libre
tags: [home-assistant, iot, privacidad, cacharreo, ingenieria-inversa, sonoff]
comments: true
---

![La cámara Sonoff CAM-S2, la protagonista de esta historia]({{ '/assets/img/posts/camara-sonoff-cloud-thingino/sonoff-cam-s2.webp' | relative_url }})

En el [post anterior](/2026/09/12/tu-casa-tus-reglas-purificador-xiaomi/) prometí que el siguiente en caer sería una cámara Sonoff y que prometía ser "un poco más entretenida". Spoiler: me quedé muy corto. Esto ha sido un viaje de varios días, dos emuladores de Android peleándose entre ellos, un certificado que no se dejaba espiar y un giro de guion final que no veía venir.

El paciente de hoy es una **Sonoff CAM-S2**, una cámara IP de esas baratitas que funcionan de maravilla... mientras le dejes mandar todo a la nube del fabricante.

## El punto de partida: el vídeo ya era mío, los ajustes no

Con esta cámara partía de una situación a medias. El **vídeo** ya lo tenía resuelto: la CAM-S2 habla RTSP/ONVIF en local, así que la integré en [Home Assistant](https://www.home-assistant.io/) directamente, sin pasar por ningún servidor de Sonoff. Eso funcionaba y seguía funcionando.

El problema eran los **ajustes**. Todo lo demás —el LED de actividad, la visión nocturna, las zonas de detección de movimiento, el volumen del altavoz...— solo se podía tocar desde la app de eWeLink. Y la app de eWeLink, como buena app de fabricante, no hace nada sin pasar antes por el cloud. Quería, como mínimo, entender esa parte lo bastante bien como para controlarla yo solito.

El primer intento fue el fácil: la integración comunitaria [SonoffLAN](https://github.com/AlexxIT/SonoffLAN), que habla el protocolo local de eWeLink. Resultado: para este modelo concreto, prácticamente nada —expone el vídeo y poco más—. Revisando los issues del proyecto, confirmé que nadie había mapeado todavía los parámetros de esta cámara. No había de dónde copiar. Tocaba hacerlo a mano.

## Plan A: espiar a la app (o cómo montar un laboratorio de MITM)

Si no hay documentación, se captura. La idea era hacer un **MITM** (man-in-the-middle) entre la app de eWeLink y los servidores de Sonoff, con [mitmproxy](https://mitmproxy.org/), para ver exactamente qué le manda la app a la nube cada vez que toco un ajuste. Como no quería meter mi móvil de verdad en el ajo, lo haría todo en un emulador de Android. Fácil, ¿no?

No. Para nada.

Lo que empezó como "monto un emulador y capturo cuatro peticiones" se convirtió en una partida de ajedrez contra Google en la que cada movimiento abría un problema nuevo:

- **La app de eWeLink no tiene build para x86.** Solo trae librerías nativas para ARM (`arm64-v8a`). Y aquí viene la primera pared de verdad: **el emulador de Android moderno (QEMU2) no puede ejecutar imágenes arm64 sobre un host x86_64**, sin más. No es un problema de configuración, es que esa combinación sencillamente no existe.
- **Descubrimiento accidental:** mientras probaba una imagen con Play Store solo para ver si había versión x86, resulta que Play Store instaló tranquilamente la versión ARM de la app... porque *esa* imagen concreta trae de serie la capa de traducción de instrucciones ARM→x86 que otras no tienen. Perfecto: uso esa imagen como "extractora" para sacar los APK ya traducidos (`adb pull` sobre lo que me dice `pm path`) y me los llevo a otro sitio.
- **Segunda pared:** las imágenes con Play Store son builds "de producción" y **no permiten `adb root`**. Y yo necesitaba root sí o sí para meter el certificado de mitmproxy en el almacén de confianza del sistema. Solución: una segunda máquina virtual con imagen `google_apis` (sin Play Store, pero con root) y una API lo bastante nueva como para que la traducción ARM también estuviera presente. Ahí sí: traducción **y** root a la vez.
- **Tercera pared, la más tonta y la más lista a la vez: Play Integrity.** Con el MITM ya funcionando, el login de la app fallaba con un genérico "inténtalo de nuevo". La captura delató al culpable: una llamada a `android.googleapis.com/auth/devicekey` devolviendo un `400`. Traducido: Google detectaba el dispositivo como trucado (rooteado + CA ajena) y bloqueaba la autenticación.

Esa última me tuvo entretenido hasta que caí en el truco: **Play Integrity solo comprueba en el momento del login, no todo el rato**. Así que la jugada es puramente de secuencia temporal: hago login con el root, el proxy y el certificado temporalmente desactivados (el dispositivo parece "limpio" y pasa la validación) y, una vez autenticado, vuelvo a activar root + certificado + proxy encima de esa misma sesión ya iniciada. La sesión persiste, y a partir de ahí el tráfico está interceptado **y** autenticado. No hay que derrotar la comprobación, solo llegar tarde a ella.

## El botín: todo el protocolo, pero con una pega enorme

Con el laboratorio por fin en pie, llegó la recompensa. Pero el tráfico no estaba donde yo esperaba. Los comandos de la cámara no viajan como peticiones HTTP normales, sino dentro de un **WebSocket persistente** a `wss://eu-pconnect15.coolkit.cc/api/ws`.

A partir de ahí fue cuestión de ir tocando ajustes en la app y ver qué aparecía por el cable. El primero que cayó fue el LED de actividad:

```json
{ "params": { "sledOnline": "on" } }
```

Y detrás de él, barriendo la app ajuste por ajuste, el resto: `infraredSetting` (visión nocturna: 0 = auto, 1 = encendida, 2 = apagada, confirmado capturando un ciclo completo), `screenFlip`, el volumen de altavoz y micro, la máscara de privacidad, la configuración completa de detección de movimiento (movimiento genérico vs. solo personas, sensibilidad, horario, zona...), el grabado en la tarjeta SD e incluso el formateo de la misma. Dejé todo el mapa documentado en mis notas de Obsidian, con un JSON de ejemplo por parámetro, por si algún día sirve para una PR a SonoffLAN —parece que nadie más lo había documentado para este modelo—.

Hasta escribí un pequeño cliente en Python de unas 80 líneas que se autentica y manda esos mismos comandos sin abrir la app para nada. Victoria, ¿no?

Pues a medias. Porque aquí está la pega que lo cambia todo: **tanto la app como la propia cámara mantienen cada una su WebSocket abierto contra ese mismo servidor de Sonoff**, que hace de relé entre ambas por el `deviceid`. Esa es la razón por la que la cámara funciona detrás del router sin abrir puertos... y exactamente la razón por la que el control depende al 100% de la nube. Mi script de Python controlaba la cámara, sí, pero **seguía pasando por los servidores de Sonoff**. Había mapeado la jaula al milímetro, pero la cámara seguía dentro.

## Plan B: espiar a la cámara (y el muro del certificado)

Si quería cortar la nube de verdad, no bastaba con entender a la app: tenía que ir a por el otro extremo del relé, **la propia cámara**. La idea era bonita: si consiguiera interceptar la conexión saliente de la cámara igual que hice con la app, podría capturar su handshake de autenticación y, con eso, levantar yo un **servidor WebSocket casero** que suplantara por completo al relé de Sonoff. Un par de reglas de DNS en el router apuntando los dominios de `coolkit.cc` a una caja en mi LAN, y la cámara hablaría toda la vida con un servidor que nunca sale de casa, creyéndose que sigue siendo la nube.

El primer paso era repetir la jugada del MITM, pero ahora contra la cámara. Y ahí me topé con el muro que no supe rodear: **la cámara valida el certificado**. A diferencia de la app, no le vale cualquier CA de confianza del sistema; comprueba que el certificado sea el que ella espera. Para colar mi certificado de mitmproxy tendría que modificar su almacén de confianza, y ese almacén vive **dentro del firmware de la cámara**. Es decir: no podía tocarlo sin antes extraer y modificar el firmware del cacharro.

Lo cual me dejaba en un sitio incómodo. Sacar el firmware de una cámara así es otro mundo: dump por UART o por SPI, soldador en mano, con un riesgo real de convertir la cámara en un pisapapeles. Un proyecto entero en sí mismo, mucho más grande que todo lo anterior.

## El giro de guion: resulta que ya existe un firmware libre

Y aquí está la parte buena de ponerte a investigar cómo demonios se le saca el firmware a una cámara: que en algún momento tecleas el modelo exacto junto con la palabra "firmware" y el universo te devuelve algo que no esperabas.

Mientras buscaba cómo volcar el firmware de la CAM-S2, me topé con [**thingino**](https://thingino.com/), un proyecto de firmware libre de código abierto para cámaras IP basadas en los SoC de Ingenic —justo el tipo de chip que lleva esta Sonoff por dentro—. Y no solo eso: thingino **ya soportaba mi modelo exacto**, con su [página de la cámara](https://thingino.com/cameras/42) y una [guía de instalación en el wiki](https://github.com/themactep/thingino-firmware/wiki/Camera:-Sonoff-Cam%E2%80%90S2-and-B1P) específica para la Sonoff CAM-S2.

Dejadme que insista en lo absurdo del momento: yo llevaba días haciendo ingeniería inversa de un protocolo propietario, peleándome con Play Integrity y planteándome soldar cables en una placa del tamaño de una tarjeta de crédito para quitarle la dependencia del cloud... y resulta que había gente que ya había hecho el trabajo de verdad difícil: un firmware alternativo, abierto, pensado desde el principio para ser **local**. No había que engañar a la nube de Sonoff. Había que echarla directamente.

thingino le da a la cámara justo lo que yo quería: streaming local, control por MQTT/HTTP, sin un solo paquete saliendo hacia los servidores del fabricante. En lugar de montar un servidor que imitara a la nube para que la cámara siguiera engañada, simplemente le quité la nube de la ecuación.

![thingino, firmware libre y de código abierto para cámaras con SoC Ingenic]({{ '/assets/img/posts/camara-sonoff-cloud-thingino/thingino-logo.svg' | relative_url }})

## El resultado: una cámara que ya no habla con nadie que yo no quiera

Con thingino flasheado, la CAM-S2 pasó de ser un dispositivo que mantenía una conexión permanente abierta contra un servidor en vete-a-saber-dónde, a ser un cacharro que vive enteramente en mi red. El vídeo ya era local; ahora los ajustes también lo son, y sin un intermediario en la nube que haga de relé para nada.

¿Y todo el trabajo de ingeniería inversa del protocolo de eWeLink? No lo doy por perdido en absoluto. Entender exactamente cómo funcionaba la jaula es, para mí, la mitad de la gracia de esto —y ese mapa del protocolo sigue siendo útil para cualquiera que tenga esta cámara y, por el motivo que sea, no quiera o no pueda cambiarle el firmware—. A veces el camino largo te enseña por qué el atajo era el bueno.

Queda en pie la misma idea que me mueve con todo esto: **cuando compras un dispositivo, debería ser tuyo**. Una cámara que vigila mi casa es, precisamente, el último sitio donde quiero una dependencia de un servidor ajeno que no controlo. Ahora no la hay.

## Lo que viene

Tengo todas las notas técnicas completas de este viaje en Obsidian —el montaje de los dos emuladores paso a paso, la tabla entera de parámetros del protocolo con sus JSON de ejemplo, y los detalles del proceso con thingino— y las iré pasando por aquí poco a poco, que para eso va esto de la serie.

Y la lista de sospechosos con acento de fabricante sigue abierta. 😏
