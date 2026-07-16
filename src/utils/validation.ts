export class ValidacaoErro extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidacaoErro';
  }
}

/**
 * Valida se um valor de texto não é nulo, indefinido ou vazio.
 */
export function validarTexto(valor: any, mensagemErro: string): string {
  if (valor === null || valor === undefined) {
    throw new ValidacaoErro(mensagemErro);
  }
  const str = String(valor).trim();
  if (str.length === 0) {
    throw new ValidacaoErro(mensagemErro);
  }
  return str;
}

/**
 * Valida se um valor numérico é um número válido e não-negativo.
 */
export function validarNumero(valor: any, mensagemErro: string): number {
  if (valor === null || valor === undefined) {
    throw new ValidacaoErro(mensagemErro);
  }
  const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  if (isNaN(num) || num < 0) {
    throw new ValidacaoErro(mensagemErro);
  }
  return num;
}
