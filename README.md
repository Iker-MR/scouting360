# Scouting360

API REST para crear y consultar perfiles de futbolistas y de ojeadores. Cada usuario elige un rol, jugador u ojeador, y gestiona su propio perfil. Cualquier visitante puede consultar los perfiles de jugador, buscarlos y filtrarlos.

## Funcionalidades

- Registro e inicio de sesión con JWT.
- Token de refresco en cookie `httpOnly`, con rotación y lista negra al cerrar sesión.
- Un perfil por usuario, y solo su propietario puede modificarlo.
- Roles excluyentes: un usuario es jugador u ojeador, nunca ambos.
- Ojeadores con verificación manual desde el panel de administración.
- Perfil público recortado: nombre de pila con la inicial del apellido y edad en lugar de la fecha de nacimiento. El propietario ve su perfil completo.
- Perfiles con datos descriptivos. Las estadísticas deportivas llegarán más adelante, basadas en análisis de vídeo.
- Búsqueda por zona y club, y filtros por posición, pierna, disponibilidad y zona.

## Decisiones técnicas

- **Duplicados en peticiones simultáneas:** la restricción única de la base de datos decide si un perfil ya existe. La API captura el `IntegrityError` y responde con un 400, porque una comprobación previa con `exists()` podría fallar si llegan dos peticiones a la vez.
- **Roles excluyentes:** una restricción única no puede abarcar dos tablas, así que al crear un perfil la API bloquea la fila del usuario (`select_for_update`) antes de comprobar si ya tiene el otro rol.
- **Privacidad del perfil público:** el perfil público no muestra datos que permitan contactar al jugador fuera de la plataforma. Por eso no hay biografía de texto libre y la búsqueda no usa el nombre, ya que confirmaría el apellido oculto.
- **Cookie `httpOnly`:** el JavaScript del navegador no puede leer el token de refresco, lo que reduce su exposición ante un ataque XSS.
- **Secretos fuera del código:** la clave de Django se lee de una variable de entorno, y `.env.example` sirve de plantilla.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register/` | Crear una cuenta |
| `POST` | `/api/auth/token/` | Iniciar sesión |
| `POST` | `/api/auth/token/refresh/` | Renovar el token de acceso |
| `POST` | `/api/auth/logout/` | Cerrar sesión e invalidar el token de refresco |
| `GET` | `/api/auth/me/` | Usuario actual y sus perfiles (`jugador_id`, `ojeador_id`) |
| `GET` | `/api/jugadores/` | Listar, buscar y filtrar jugadores |
| `POST` | `/api/jugadores/` | Crear el perfil propio |
| `GET` | `/api/jugadores/{id}/` | Ver un perfil |
| `PUT` / `PATCH` / `DELETE` | `/api/jugadores/{id}/` | Editar o borrar el perfil propio |
| `POST` | `/api/ojeadores/` | Crear el perfil de ojeador propio |
| `GET` | `/api/ojeadores/{id}/` | Ver un perfil de ojeador (requiere sesión) |
| `PUT` / `PATCH` | `/api/ojeadores/{id}/` | Editar el perfil de ojeador propio |

## Tecnologías

Python · Django · Django REST Framework · SimpleJWT · django-filter · SQLite

## Ejecutar en local

```bash
git clone https://github.com/Iker-MR/scouting360.git
cd scouting360
python -m venv venv
source venv/bin/activate      # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # Rellena DJANGO_SECRET_KEY
python manage.py migrate
python manage.py runserver
```

## Tests

El backend incluye 77 tests de autenticación, registro, roles, privacidad, modelos, serializadores y vistas.

```bash
python manage.py test
```

## Estado

Backend en desarrollo. La configuración actual es de desarrollo local (`DEBUG = True` y SQLite).
