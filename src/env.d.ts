/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    cfContext?: any;
    user?: {
      userId: string;
      id?: string;
      name: string;
      email: string;
    } | null;
  }
}
