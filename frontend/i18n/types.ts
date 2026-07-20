export type MessageShape<T> = { [K in keyof T]: string };

export type TranslationValues = Record<string, string | number>;
