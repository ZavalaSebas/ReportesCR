
# Reportes CR 🚨🇨🇷

**Reportes CR** es una aplicación web que permite a los usuarios de Costa Rica reportar y confirmar fallas en servicios públicos y privados como electricidad, agua, internet y más.  
Inspirada en plataformas como *DownDetector*, pero enfocada en servicios locales y comunitarios.

---

## 🚀 Funcionalidades (MVP)
- Inicio de sesión con Google (Firebase Auth).
- Mapa interactivo con reportes geolocalizados (Leaflet).
- Formulario para crear reportes de cortes de luz, agua, internet, etc.
- Lista de reportes recientes con confirmaciones en tiempo real (Firestore).
- UI responsiva y minimalista con Tailwind CSS.

---

## 🛠️ Tecnologías
- [React](https://react.dev/)  
- [Tailwind CSS](https://tailwindcss.com/)  
- [Leaflet](https://leafletjs.com/)  
- [Firebase (Auth & Firestore)](https://firebase.google.com/)  
- [Vite](https://vitejs.dev/)  

---

## 📦 Instalación y ejecución

1. Clona este repositorio:
```bash
git clone https://github.com/ZavalaSebas/ReportesCR.git
cd ReportesCR
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno (ya incluidas en `.env.local`):
```bash
# Firebase Configuration (ya configurado)
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-auth-domain
# ... otras variables
```

4. Ejecuta la aplicación:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173/`

---

## 🔧 Solución de Problemas Comunes

### Error de permisos de Firestore
Si ves errores como "Missing or insufficient permissions":
```bash
firebase deploy --only firestore:rules
```

### Error de geolocalización
- Asegúrate de permitir el acceso a la ubicación en tu navegador
- La aplicación usa San José como ubicación por defecto si falla la geolocalización

### Errores de CORS con Firebase Auth
- Estos son normales en desarrollo y no afectan la funcionalidad
- Se resuelven automáticamente en producción

### Bloqueador de contenido
- Algunos adblockers pueden bloquear recursos de Firebase
- Considera desactivar el bloqueador para este sitio si experimentas problemas

---

## 🚀 Despliegue

Para desplegar en Firebase Hosting:

```bash
npm run build
firebase deploy
```

---

## 📂 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── MapView.jsx     # Mapa interactivo
│   ├── ReportForm.jsx  # Formulario de reportes
│   └── ReportList.jsx  # Lista de reportes
├── firebase.js         # Configuración de Firebase
├── App.jsx            # Componente principal
└── main.jsx           # Punto de entrada
```

---

## 🤝 Contribuciones
¡Las contribuciones son bienvenidas! Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia
Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.
