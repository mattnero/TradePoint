import { emptyDecoder, readDecoder } from "./inputs";

export const decoder = $state(emptyDecoder());

export function currentReading() {
  return readDecoder(decoder);
}
