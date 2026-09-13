---
layout: post
title: Tu casa, tus reglas
subtitle: Cómo quité del cloud a mi purificador de aire Xiaomi (y por qué)
tags: [home-assistant, esphome, iot, privacidad, cacharreo]
comments: true
---

![La placa del purificador fuera de la carcasa durante el proceso de flasheo]({{ '/assets/img/posts/purificador-xiaomi-esphome/board-with-screen.jpg' | relative_url }})

¡Oh! Alguien abriendo un blog en pleno 2026... Sí, lo sé, no es lo más habitual, ahora la gente escribe en Medium, LinkedIn, etc... ¿pero un blog? 👀 Cuando ahora todo el mundo lee usando IA... Bueno que el blog esté en git y los posts sean Markdown algo tiene que ver 😉

La verdad es que ni es el primer blog que empiezo y puede que tampoco sea el último pero me apetecía tener un espacio donde compartir mis notas de Obsidian de una forma menos técnica y con algo de humor.

Voy a empezar una serie de posts sobre algo que llevo tiempo haciendo poco a poco: automatizar mi casa con [Home Assistant](https://www.home-assistant.io/) y, de paso, ir quitando los dispositivos que usan wifi del cloud del fabricante.

Uno de mis primeros pacientes ha sido mi purificador de aire, un **Xiaomi Mi Air Purifier 3C**. El siguiente será una cámara Sonoff, así que esto va para largo.

## Por qué me ha dado por esto

Bueno pues desde que mi padre me contagió el virus de la curiosidad tecnológica, gracias al que hoy me gano el pan, y años después el grandioso hobby de la domótica, no he parado de cacharrear. Y como en mi camino me he nutrido de incontable información escrita por otros me gustaría devolver algo y que en el futuro a alguien le pueda resultar útil.

Pero... ¿y por qué quitar los dispositivos del cloud?

Por un lado está lo de la privacidad: no tengo ni idea de qué telemetría manda un purificador de aire a Pekín cada pocos segundos, y prefiero no tener que confiar en que a Xiaomi le importe tan poco mi salón como a mí. Por otro, está la fiabilidad: un dispositivo que vive en mi casa, en mi WiFi, no debería dejar de funcionar porque a alguien en otro continente se le caiga un servidor o decida que ese modelo ya no merece mantenimiento. Y luego, para qué engañarnos, está el motivo real: me gusta trastear. Abrir el bicho, ver qué chip lleva dentro y ponerle firmware propio es simplemente divertido.

Pero más allá de eso hay una idea que es la que de verdad me mueve: **cuando compras un dispositivo, debería ser tuyo**. No es un alquiler perpetuo condicionado a que el fabricante mantenga una app, un servidor y unas ganas de seguir dándole soporte. Si lo pagué, tengo que poder abrirlo, reflashearlo y hacer con él lo que me dé la gana, incluida la opción de decirle adiós a su nube para siempre. Eso no es una rareza de friki paranoico, debería ser lo normal.

## El sospechoso: un purificador con acento chino

El Mi Air Purifier 3C es un aparato correcto: filtra bien, no hace mucho ruido y tiene un sensor de PM2.5 decente. El problema no es el hardware, es todo lo que hay alrededor: una app que tarda un rato en encender el ventilador porque el comando hace un viaje de ida y vuelta por servidores de Xiaomi antes de llegar a un dispositivo que está a dos metros de tu móvil, y la sensación de que si mañana Xiaomi decide dejar de darle soporte a este modelo, me quedo con un tótem de plástico blanco muy elegante que no filtra nada.

Así que, siguiendo el trabajo del proyecto [esphome-miot](https://github.com/dhewg/esphome-miot) y su [wiki para este modelo](https://github.com/dhewg/esphome-miot/wiki/Xiaomi-Mi-Air-Purifier-3C), le sustituí el firmware original por [ESPHome](https://esphome.io/). Todas mis notas del proceso, con su configuración, están en mi repo [esphome-miot](https://github.com/JaviMore/esphome-miot) — es un fork del proyecto original, adaptado a mi dispositivo concreto y con el código fijado en mi propio repositorio en vez de descargado en caliente en cada compilación, para no depender de que un repo de GitHub de un tercero siga ahí mañana con el mismo contenido, pudiendo llegar a sufrir un ataque de supply chain. Además he traducido el nombre de los sensores al castellano 😎

![El purificador Xiaomi Mi Air Purifier 3C, antes de la intervención]({{ '/assets/img/posts/purificador-xiaomi-esphome/device.jpg' | relative_url }})

## El momento GPIO0: cirugía sin bisturí

Para meterle firmware nuevo hace falta forzar al ESP32 que lleva dentro a entrar en modo bootloader, y eso se consigue poniendo a masa el pin `GPIO0` justo en el momento del reset. El problema es que en esta placa `GPIO0` no está expuesto en ningún conector accesible: hay que ir a buscarlo directamente al pin del chip.

Así que ahí estaba yo, con el purificador desmontado sobre la mesa, sujetando a pulso un cable puenteando `GPIO0` a `GND` sobre un chip del tamaño de una uña, mientras con la otra mano hacía un power-cycle para forzar el reset. Sin pinzas, sin soldar nada, solo el cable, el pulso y la fe. Si se me escapaba un milímetro, el ESP32 arrancaba tan campante en modo normal y a repetir la maniobra desde el principio.

Es cierto, mi montaje se desvió ligeramente de lo que decía la wiki: conecté el otro extremo del puente a la masa del programador USB en vez de a un punto de `GND` separado en el propio chip. Funciona igual —son la misma masa—, pero para mí era más cómodo que puntear tocando dos pines en el chip.

![Placa del purificador conectada al programador UART-USB en la mesa de trabajo, con el puente improvisado de GPIO0]({{ '/assets/img/posts/purificador-xiaomi-esphome/board-wiring-bench.jpg' | relative_url }})

La confirmación de que lo habías clavado no era muy sofisticada: si `esptool` se conectaba y te decía qué chip era en vez de escupir un timeout, habías ganado. La primera vez que pasó sentí más satisfacción que con muchos despliegues en producción que he hecho en mi vida profesional, y eso que aquí lo único que estaba en juego era mi propio purificador de aire.

## El susto: bucle de arranque en modo seguro

Tras flashear, el primer arranque no fue el final feliz que esperaba: ESPHome cargaba y a los pocos segundos entraba en un bucle de reinicios que acababa en modo seguro, con el log quejándose de diez intentos de arranque fallidos. Nada especialmente informativo sobre la causa real, que es la gracia (la desgracia) de las protecciones automáticas: te salvan de quedarte con un ladrillo, pero también te ocultan justo el dato que necesitas para entender qué ha pasado.

La sospecha, bastante razonable, es que estaba probando la placa aislada del resto del purificador, sin el enlace UART interno que la conecta con el microcontrolador original del propio aparato — y el componente `miot` necesita ese enlace vivo nada más arrancar para hacer su primer heartbeat. Sin él, se cae. Una vez reensamblado con el resto de la electrónica del purificador, arrancó sin drama.

## El resultado: un purificador que ya no depende de nadie

Con el dispositivo flasheado y montado de vuelta, Home Assistant lo descubre solo por su API nativa de ESPHome, sin pasar por ningún servidor externo.

![Panel de ESPHome Device Builder mostrando el purificador ya en línea, detectado por Home Assistant]({{ '/assets/img/posts/purificador-xiaomi-esphome/ha-esphome-device.png' | relative_url }})

El ventilador, la vida útil del filtro, la velocidad del motor, el sensor de PM2.5, el bloqueo infantil, el brillo de la pantalla y los sonidos de notificación aparecen como entidades normales de Home Assistant, con sus nombres en castellano porque para eso es mi casa y mi configuración.

![Entidades del purificador en Home Assistant: ventilador, filtro, sensores y controles, todo en castellano]({{ '/assets/img/posts/purificador-xiaomi-esphome/ha-purifier-entities.png' | relative_url }})

Ahora el purificador responde al instante, porque el comando ya no le da la vuelta al planeta antes de llegar a un aparato que tengo en el salón. Y si mañana Xiaomi decide que este modelo ha dejado de existir para ellos, me da exactamente igual, porque para mí sigue siendo mío y sigue haciendo lo que le pida por OTA sin volver a tocar un cable.

## El siguiente de la lista

Este purificador era el candidato fácil: dependía de la nube de Xiaomi y ya tenía una comunidad entera dedicada a liberarlo. El siguiente en caer va a ser una cámara Sonoff, que promete ser un poco más entretenida (léase: más oportunidades de que algo salga mal).

Si te apetece ver los detalles técnicos completos de este —configuración, comandos de esptool, el YAML entero de ESPHome— están todos en el repo [esphome-miot](https://github.com/JaviMore/esphome-miot).