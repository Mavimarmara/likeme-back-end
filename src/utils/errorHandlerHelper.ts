/**
 * Helper para tratamento consistente de erros Prisma
 */
export class PrismaErrorHandler {
  static isTableNotFoundError(error: any): boolean {
    return error?.code === 'P2001' || 
           error?.message?.includes('does not exist') || 
           error?.code === '42P01';
  }

  static isNotFoundError(error: any): boolean {
    return error?.code === 'P2025';
  }

  static getTableNotFoundMessage(): string {
    return 'Database tables not initialized. Please run Prisma migrations.';
  }

  static getNotFoundMessage(): string {
    return 'Resource not found';
  }
}
