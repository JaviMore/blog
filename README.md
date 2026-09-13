# trasteando

Blog personal alojado en GitHub Pages, con un tema propio (sin remote theme) construido en Jekyll puro: layouts e includes a medida, un design system en `assets/css/main.css` y animaciones en `assets/js/main.js`.

## 🚀 Inicio Rápido

### Prerequisitos

- Ruby 2.7 o superior
- Bundler

### Instalación Local

1. Clona este repositorio:
```bash
git clone https://github.com/tuusuario/blog.git
cd blog
```

2. Instala las dependencias:
```bash
bundle install
```

3. Ejecuta el servidor local:
```bash
bundle exec jekyll serve
```

4. Abre tu navegador en `http://localhost:4000`

## 📝 Crear un Nuevo Post

1. Crea un archivo en el directorio `_posts/` con el formato `YYYY-MM-DD-titulo-del-post.md`

2. Añade el front matter al inicio del archivo:
```yaml
---
layout: post
title: Título de tu post
subtitle: Subtítulo opcional
tags: [tag1, tag2]
comments: true
---
```

3. Escribe tu contenido en Markdown

## 🎨 Personalización

Edita el archivo `_config.yml` para personalizar:

- **title**: Título de tu blog
- **description**: Descripción del blog
- **author**: Tu nombre
- **url**: URL de tu sitio (ej: `https://tuusuario.github.io`)
- **baseurl**: Si tu blog está en un subdirectorio (ej: `/blog`)
- **social-network-links**: Tus redes sociales

## 📂 Estructura del Proyecto

```
blog/
├── _config.yml           # Configuración del sitio
├── _posts/               # Posts del blog
├── _layouts/             # Plantillas (home, page, post, postlist, default)
├── _includes/            # Cabecera, nav, footer, tarjeta de post, fecha en ES
├── assets/css/main.css   # Design system (tokens, componentes, animaciones)
├── assets/js/main.js     # Tema, menú móvil, scroll reveal, copiar código
├── assets/img/           # Logo, favicons
├── index.html            # Página principal
├── blog/index.html       # Listado de posts (paginado)
├── aboutme.md            # Página "Sobre mí"
├── 404.html              # Página de error
├── Gemfile               # Dependencias de Ruby
└── README.md             # Este archivo
```

## 🌐 Desplegar en GitHub Pages

1. Crea un repositorio en GitHub llamado `tuusuario.github.io` (o cualquier nombre)

2. Sube tu código:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

3. Ve a Settings → Pages en tu repositorio

4. Selecciona la rama `main` como fuente

5. Tu blog estará disponible en `https://tuusuario.github.io`

## 📚 Recursos

- [Beautiful Jekyll Documentation](https://beautifuljekyll.com/)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/es/pages)

## 📄 Licencia

Este proyecto usa el tema Beautiful Jekyll bajo la licencia MIT.
