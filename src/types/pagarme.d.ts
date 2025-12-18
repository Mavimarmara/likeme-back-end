/**
 * Type definitions for pagarme module
 */
declare module 'pagarme' {
  interface PagarmeClient {
    transactions: {
      create(data: any): Promise<any>;
      find(params: { id: string }): Promise<any>;
      capture(params: { id: string; amount?: number }): Promise<any>;
      refund(params: { id: string; amount?: number }): Promise<any>;
    };
  }

  interface PagarmeConnectOptions {
    api_key: string;
  }

  interface Pagarme {
    client: {
      connect(options: PagarmeConnectOptions): Promise<PagarmeClient>;
    };
  }

  const pagarme: Pagarme;
  export default pagarme;
}
