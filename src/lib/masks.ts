/** Utilidades de máscara reutilizáveis para formulários. */

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** `(11) 99999-9999` (celular) ou `(11) 9999-9999` (fixo). */
export function maskPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** `dd/mm/aaaa`. */
export function maskDateBR(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** `000.000.000-00`. */
export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += `.${d.slice(3, 6)}`;
  if (d.length > 6) out += `.${d.slice(6, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 11)}`;
  return out;
}

/** Valida os dígitos verificadores do CPF (espelha `utils/cpf.ts` do backend). */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

/** `00.000.000/0001-00`. */
export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

/** Dígitos → moeda BR sem símbolo: `"123456"` → `"1.234,56"`. */
export function maskCurrencyBRL(value: string): string {
  const digits = onlyDigits(value).slice(0, 13);
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const decPart = padded.slice(-2);
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decPart}`;
}

/** `"1.234,56"` → `1234.56`; vazio → `0`. */
export function parseCurrencyBRL(value: string): number {
  const digits = onlyDigits(value);
  return digits ? Number(digits) / 100 : 0;
}

/** Inteiro com separador de milhar: `"1234"` → `"1.234"`. */
export function maskInteger(value: string): string {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, '').slice(0, 12);
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `"1.234"` → `1234`; vazio → `0`. */
export function parseInteger(value: string): number {
  const digits = onlyDigits(value);
  return digits ? Number(digits) : 0;
}

/** `dd/mm/aaaa` → `aaaa-mm-dd`, ou `null` se incompleta/inválida. */
export function brDateToISO(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);

  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!valid || year < 1900 || date > new Date()) return null;
  return `${yyyy}-${mm}-${dd}`;
}
