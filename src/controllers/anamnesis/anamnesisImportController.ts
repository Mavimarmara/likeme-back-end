import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { anamnesisImportService } from '@/services/anamnesis/anamnesisImportService';

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
    // Template CSV com colunas para importação de anamnese
    // Formato de options: key:value:pt-BR:en-US:es-ES|key2:value2:pt-BR2:en-US2:es-ES2
    const csvContent = `key;type;order;text_pt-BR;text_en-US;text_es-ES;options
health_condition;single_choice;1;Como você avalia sua saúde geral?;How do you rate your overall health?;¿Cómo evalúa su salud general?;excellent:5:Excelente:Excellent:Excelente|good:4:Boa:Good:Buena|regular:3:Regular:Regular:Regular|poor:2:Ruim:Poor:Mala|very_poor:1:Muito ruim:Very poor:Muy mala
stress_level;single_choice;2;Qual seu nível de estresse atualmente?;What is your current stress level?;¿Cuál es su nivel de estrés actual?;low:1:Baixo:Low:Bajo|moderate:2:Moderado:Moderate:Moderado|high:3:Alto:High:Alto|very_high:4:Muito alto:Very high:Muy alto
sleep_quality;single_choice;3;Como você avalia a qualidade do seu sono?;How do you rate your sleep quality?;¿Cómo evalúa la calidad de su sueño?;excellent:5:Excelente:Excellent:Excelente|good:4:Boa:Good:Buena|regular:3:Regular:Regular:Regular|poor:2:Ruim:Poor:Mala|very_poor:1:Muito ruim:Very poor:Muy mala
exercise_frequency;single_choice;4;Com que frequência você pratica exercícios?;How often do you exercise?;¿Con qué frecuencia hace ejercicio?;daily:5:Diariamente:Daily:Diariamente|often:4:Frequentemente:Often:Frecuentemente|sometimes:3:Às vezes:Sometimes:A veces|rarely:2:Raramente:Rarely:Raramente|never:1:Nunca:Never:Nunca
diet_quality;single_choice;5;Como você avalia sua alimentação?;How do you rate your diet?;¿Cómo evalúa su alimentación?;excellent:5:Excelente:Excellent:Excelente|good:4:Boa:Good:Buena|regular:3:Regular:Regular:Regular|poor:2:Ruim:Poor:Mala|very_poor:1:Muito ruim:Very poor:Muy mala
water_intake;single_choice;6;Quantos litros de água você bebe por dia?;How many liters of water do you drink per day?;¿Cuántos litros de agua bebe por día?;less_1L:1:Menos de 1L:Less than 1L:Menos de 1L|1_2L:2:1 a 2L:1 to 2L:1 a 2L|more_2L:3:Mais de 2L:More than 2L:Más de 2L
allergies;text;7;Você possui alguma alergia? Se sim, quais?;Do you have any allergies? If so, which ones?;¿Tiene alguna alergia? Si es así, ¿cuáles?;
medications;text;8;Você toma alguma medicação regularmente?;Do you take any medication regularly?;¿Toma algún medicamento regularmente?;
health_goals;multiple_choice;9;Quais são seus objetivos de saúde?;What are your health goals?;¿Cuáles son sus objetivos de salud?;lose_weight:1:Perder peso:Lose weight:Perder peso|gain_muscle:2:Ganhar massa muscular:Gain muscle:Ganar masa muscular|improve_sleep:3:Melhorar sono:Improve sleep:Mejorar sueño|reduce_stress:4:Reduzir estresse:Reduce stress:Reducir estrés|improve_nutrition:5:Melhorar alimentação:Improve nutrition:Mejorar alimentación`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="likeme-anamnesis-import.csv"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('\uFEFF' + csvContent);
  } catch (error: any) {
    console.error('[AnamnesisImport] Error downloading template:', error);
    sendError(res, 'Error downloading template', 500, error?.message);
  }
};
