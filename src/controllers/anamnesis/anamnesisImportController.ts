import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { anamnesisImportService } from '@/services/anamnesis/anamnesisImportService';
import { clearMaxScoresCache } from '@/services/anamnesis/anamnesisService';

export const importAnamnesisFromCSV = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      sendError(res, 'File must be CSV type', 400);
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    console.log(`[AnamnesisImport] Starting import by user ${userId}`);
    console.log(`[AnamnesisImport] File: ${req.file.originalname} (${req.file.size} bytes)`);

    const result = await anamnesisImportService.importFromCSV(req.file.buffer);

    // Limpar cache de max scores para que o próximo GET /scores recalcule com as novas perguntas
    clearMaxScoresCache();

    console.log(`[AnamnesisImport] Import completed:`);
    console.log(`  - Total rows: ${result.totalRows}`);
    console.log(`  - Success: ${result.successCount}`);
    console.log(`  - Errors: ${result.errorCount}`);
    console.log(`  - Questions created: ${result.createdQuestions.length}`);
    console.log(`  - Questions updated: ${result.updatedQuestions.length}`);

    const statusCode = result.success ? 201 : 207;
    const message = result.success
      ? 'Anamnesis questions imported successfully'
      : 'Import completed with some errors';

    sendSuccess(
      res,
      {
        summary: {
          totalRows: result.totalRows,
          successCount: result.successCount,
          errorCount: result.errorCount,
          questionsCreated: result.createdQuestions.length,
          questionsUpdated: result.updatedQuestions.length,
        },
        created: result.createdQuestions.map(q => ({
          id: q.id,
          key: q.key,
          type: q.type,
          order: q.order,
        })),
        updated: result.updatedQuestions.map(q => ({
          id: q.id,
          key: q.key,
          type: q.type,
          order: q.order,
        })),
        errors: result.errors,
      },
      message,
      statusCode
    );
  } catch (error: any) {
    console.error('[AnamnesisImport] Error importing anamnesis:', error);
    sendError(
      res,
      'Error processing anamnesis import',
      500,
      error?.message
    );
  }
};

export const downloadImportTemplate = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Template alinhado ao arquivo "Perguntas Anamnese - Marker_ Movimento.csv"
    // Colunas: domain (marker), section, order, type, text, options
    // key é gerada automaticamente: section_domain_order (ex: habits_movimento_1)
    const csvContent = `domain;section;order;type;text;options
MOVIMENTO;Hábitos;1;single_choice;Exercícios que ajudam a alongar, fortalecer e equilibrar o corpo como Yoga, Pilates, Tai Chi ou alongamento.;menos_15_min:0:Menos de 15 min. por semana|de_15_a_30:2:De 15 a 30 min. por semana|de_31_a_60:4:De 31 a 60 min. por semana|de_1_a_2h:6:De 1 a 2 horas por semana|de_2_a_5h:8:De 2 a 5 horas por semana|mais_5h:10:Mais de 5 horas por semana
MOVIMENTO;Hábitos;2;single_choice;Caminhada leve (inclusive como locomoção), natação ou bike em ritmo leve, hidroginástica suave, fazer faxina/arrumação.;menos_15_min:0:Menos de 15 min. por semana|de_15_a_30:2:De 15 a 30 min. por semana|de_31_a_60:4:De 31 a 60 min. por semana|de_1_a_2h:6:De 1 a 2 horas por semana|de_2_a_5h:8:De 2 a 5 horas por semana|mais_5h:10:Mais de 5 horas por semana
MOVIMENTO;Hábitos;3;single_choice;Exercícios moderados, como: caminhar em ritmo intenso, corrida leve/trote, pedalada em ritmo confortável, musculação leve a moderada, treinos funcionais moderados, yoga mais dinâmica ou flows contínuos, pilates, esportes praticados de forma recreativa, surfe, atividades do dia a dia que exigem movimento constante (como cortar a grama ou faxina pesada na casa).;menos_15_min:0:Menos de 15 min. por semana|de_15_a_30:3:De 15 a 30 min. por semana|de_31_a_60:6:De 31 a 60 min. por semana|de_1_a_2h:10:De 1 a 2 horas por semana|de_2_a_5h:10:De 2 a 5 horas por semana|mais_5h:8:Mais de 5 horas por semana
MOVIMENTO;Hábitos;4;single_choice;Exercícios intensos, como: subir ladeiras ou escadas, correr rápido, praticar esportes como futebol, basquete ou vôlei de praia, artes marciais ou lutas como judô, muay thai, boxe, pedalar em ritmo intenso, treinos em circuito ou funcionais, musculação, cross-fit ou atividades que envolvam carregar peso.;menos_15_min:0:Menos de 15 min. por semana|de_15_a_30:4:De 15 a 30 min. por semana|de_31_a_60:8:De 31 a 60 min. por semana|de_1_a_2h:12:De 1 a 2 horas por semana|de_2_a_4h:8:De 2 a 4 horas por semana|de_4_a_7h:6:De 4 a 7 horas por semana|mais_7h:4:Mais de 7 horas por semana`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="likeme-anamnesis-import.csv"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('\uFEFF' + csvContent);
  } catch (error: any) {
    console.error('[AnamnesisImport] Error downloading template:', error);
    sendError(res, 'Error downloading template', 500, error?.message);
  }
};
