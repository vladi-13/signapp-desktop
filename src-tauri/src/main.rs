#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::process::{Command, Stdio, Child};
use std::sync::Mutex;

struct BackendProc(Mutex<Option<Child>>);

fn spawn_backend() -> Option<Child> {
  // Intenta ejecutar un binario "backend(.exe)" si está en la misma carpeta.
  let candidate = if cfg!(target_os = "windows") { "backend.exe" } else { "backend" };
  match Command::new(candidate)
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn() {
      Ok(c) => Some(c),
      Err(_) => None, // Si no existe, seguimos en modo demo sin backend
    }
}

fn main() {
  tauri::Builder::default()
    .manage(BackendProc(Mutex::new(None)))
    .setup(|app| {
      // (Opcional) intenta levantar el backend al abrir la app
      if let Some(child) = spawn_backend() {
        let state = app.state::<BackendProc>();
        *state.0.lock().unwrap() = Some(child);
      }
      Ok(())
    })
    .on_window_event(|app, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        let state = app.app_handle().state::<BackendProc>();
        let child_opt: Option<Child> = {
          let mut guard = state.0.lock().unwrap();
          guard.take()
        };
        if let Some(mut child) = child_opt {
          let _ = child.kill();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
