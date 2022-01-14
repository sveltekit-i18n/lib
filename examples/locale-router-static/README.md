# Locale-loader-static
This app is built for pages using `@sveltejs/adapter-static`. It includes

## Setup

### `./svelte.config.js`
This config contains `prerender` parameter to build your site's language mutations together with desired error pages.

### `./src/hooks.js`
Takes care about redirects in dev mode and during the build process.

### `./src/routes/[lang]/[...error]/index.svelte`
This file handles errors. In dev mode, throws error (so you are redirected to `./src/routes/__error.svelte` with appropriate error code), while during the build process, includes the error page itself to render.

## Build
After you run `npm run build` command, this setup outputs your site with all defined language mutations in separate folders including translated error pages.

For example:
```
build/
├─ _app/
│  └– ...
├─ cs/
│  ├─ 401/
│  │  └– index.html
│  ├─ 403/
│  │  └– index.html
│  ├─ 404/
│  │  └– index.html
│  ├─ 500/
│  │  └– index.html
│  ├─ about/
│  │  └– index.html
│  └– index.html
├─ de/
│  └– ...
├─ en/
│  └– ...
└– ...
```

## Publish

Assuming you are about to publish your static site to Apache web server. In this case you will need to setup redirections from the root path. The easiest way is add `.htaccess` (or `index.php`) file to your `static` directory before build, so it's included in your `build` folder later.

Your `.htaccess` could look like this:
```ini
  RewriteEngine On
  RewriteBase /
  # DirectorySlash Off

  # Prevent dot directories (hidden directories like .git) to be exposed to the public
  # Except for the .well-known directory used by LetsEncrypt a.o
  # RewriteRule "/\.|^\.(?!well-known/)" - [F]

  # Rewrite www.example.com -> example.com -- used with SEO Strict URLs plugin
  # RewriteCond %{HTTP_HOST} .
  # RewriteCond %{HTTP_HOST} ^www.(.*)$ [NC]
  # RewriteRule ^(.*)$ https://%1/$1 [R=301,L]


  # Rewrite secure requests properly to prevent SSL cert warnings, e.g. prevent 
  # https://www.example.com when your cert only allows https://secure.example.com
  # RewriteCond %{SERVER_PORT} !^443
  # RewriteRule (.*) https://%{SERVER_NAME}/$1 [R=301,L]

  # Remove trailing slashes
  # NOTE: Use with `DirectorySlash Off`.
  # RewriteCond %{REQUEST_FILENAME} !-f
  # RewriteRule ^(.*[^/])$ /$1/ [L]

  # Server files if exist
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^(.*)$ - [L]

  ##############################################
  # Skip redirection if locale already present #
  ##############################################
  RewriteRule ^cs(\/.*)?$ - [L]
  RewriteRule ^de(\/.*)?$ - [L]
  RewriteRule ^en(\/.*)?$ - [L]

  ##############################
  # Set custom locales if fits #
  ##############################
  RewriteCond %{HTTP:Accept-Language} ^cs [NC]
  RewriteRule ^ /cs%{REQUEST_URI} [R=301,L]

  RewriteCond %{HTTP:Accept-Language} ^de [NC]
  RewriteRule ^ /de%{REQUEST_URI} [R=301,L]

  ###############################################
  # Set default locale if no custom locale fits #
  ###############################################
  RewriteRule ^ /en%{REQUEST_URI} [R=301,L]

  ######################################
  # Set error pages for custom locales #
  ######################################
  <If "%{REQUEST_URI} =~ /^\x2Fcs(\x2F.*)?$/">
    ErrorDocument 401 /cs/401/index.html
    ErrorDocument 403 /cs/403/index.html
    ErrorDocument 404 /cs/404/index.html
    ErrorDocument 500 /cs/500/index.html
  </If>
  <ElseIf "%{REQUEST_URI} =~ /^\x2Fde(\x2F.*)?$/">
    ErrorDocument 401 /de/401/index.html
    ErrorDocument 403 /de/403/index.html
    ErrorDocument 404 /de/404/index.html
    ErrorDocument 500 /de/500/index.html
  </ElseIf>

  ##################################
  # Set default locale error pages #
  ##################################
  <Else>
    ErrorDocument 401 /en/401/index.html
    ErrorDocument 403 /en/403/index.html
    ErrorDocument 404 /en/404/index.html
    ErrorDocument 500 /en/500/index.html
  </Else>
```

For other web servers, you will need to setup redirections (or reverse proxy) by yourself.