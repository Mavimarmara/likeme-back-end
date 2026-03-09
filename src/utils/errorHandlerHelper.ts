export class PrismaErrorHandler {
  static isTableNotFoundError(error: unknown): boolean {
    const err = error as { code?: string; message?: string };
    return err?.code === 'P2001' || 
           err?.message?.includes('does not exist') || 
           err?.code === '42P01';
  }

  static isNotFoundError(error: unknown): boolean {
    return (error as { code?: string })?.code === 'P2025';
  }

  static getTableNotFoundMessage(): string {
    return 'Database tables not initialized. Please run Prisma migrations.';
  }

  static getNotFoundMessage(): string {
    return 'Resource not found';
  }
}
