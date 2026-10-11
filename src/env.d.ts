/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Quien ha entrado (papel e iglesia, leídos de la base de datos), o null si nadie. */
    actor: import('./servidor/cuentas').Actor | null;
  }
}
