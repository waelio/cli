import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(here, "locals");

export type LocaleDict = Record<string, unknown>;

const cache = new Map<string, LocaleDict>();

export function availableLocales(): string[] {
    return readdirSync(LOCALES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

export function loadLocale(lang: string): LocaleDict {
    const cached = cache.get(lang);
    if (cached) return cached;
    const path = join(LOCALES_DIR, lang, `${lang}.json`);
    const data = JSON.parse(readFileSync(path, "utf-8")) as LocaleDict;
    cache.set(lang, data);
    return data;
}

export function detectLocale(): string {
    const env = process.env.WAELIO_LOCALE ?? process.env.LANG ?? "en";
    const code = env.split(".")[0]!.split("_")[0]!.toLowerCase();
    return availableLocales().includes(code) ? code : "en";
}

export function t(key: string, lang: string = detectLocale()): string {
    const dict = loadLocale(lang);
    const value = key.split(".").reduce<unknown>(
        (acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined),
        dict,
    );
    return typeof value === "string" ? value : key;
}
