/// <reference types="astro/client" />

interface User {
  id: string;
  email: string | undefined;
}

declare namespace App {
  interface Locals {
    user?: User;
  }
}
