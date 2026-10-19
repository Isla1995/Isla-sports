# Isla Sports — versión 3 (archivos reales de la interfaz)

Este ZIP sí contiene los archivos de la interfaz: `index.html`, `style.css`, `app.js`, `config.js` y esta guía. No es una base de datos; la base de datos vive en tu proyecto Supabase.

## Importante antes de publicar
- La interfaz usa Supabase Auth y las tablas existentes `profiles` y `matches`.
- Para pronósticos, espera una tabla `picks` con columnas: `id`, `user_id`, `match_id`, `selection`, `stake_points`, `odds_at_pick`, `created_at`.
- La app no debe considerarse lista para invitar usuarios hasta probar RLS/permisos con una cuenta normal y confirmar que los puntos no se pueden manipular.
- Este starter guarda pronósticos, pero todavía NO descuenta ni acredita puntos automáticamente ni liquida resultados. Eso requiere una función segura en Supabase (RPC) y políticas bien configuradas.
- Solo puntos ficticios; no dinero real ni premios.

## Configuración
1. Abre `config.js` y reemplaza `PEGA_AQUI_TU_SUPABASE_PROJECT_URL` y `PEGA_AQUI_TU_SUPABASE_PUBLISHABLE_O_ANON_KEY` con la Project URL y la clave publicable/anon de Supabase.
2. No pongas la contraseña de la base de datos ni una clave `service_role` en estos archivos.
3. Publica los archivos como sitio estático HTTPS. Para GitHub Pages, sube los archivos sueltos a la raíz del repositorio y activa Settings → Pages → Deploy from a branch → main → /(root).
4. En Supabase Auth, configura la URL pública del sitio como Site URL y añade la misma URL en Redirect URLs.
5. Prueba primero registro, confirmación por email, inicio de sesión, lectura de perfil, publicación de partido como admin y acceso bloqueado como jugador normal.

## Si sale un error
El mensaje de la interfaz mostrará si el problema está en la configuración, columnas o permisos RLS. No compartas claves secretas ni contraseña de base de datos.
