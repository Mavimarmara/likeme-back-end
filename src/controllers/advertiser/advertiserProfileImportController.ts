import { Response } from 'express';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';

type AdvertiserProfileCsvRow = {
  providerName: string;
  categories: string;
  positioning: string;
  bio: string;
  story: string;
  timeline: string;
  differentiators: string;
  mainImage: string;
};

type ImportError = {
  row: number;
  data: Partial<AdvertiserProfileCsvRow>;
  error: string;
};

type ImportResult = {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  profilesUpserted: number;
  advertisersWithProfiles: number;
};

const getField = (row: any, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

export const importAdvertiserProfilesFromCSV = async (
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

    console.log('[AdvertiserProfileImport] Starting import');
    console.log(`[AdvertiserProfileImport] File: ${req.file.originalname} (${req.file.size} bytes)`);

    const buffer = req.file.buffer;

    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      profilesUpserted: 0,
      advertisersWithProfiles: 0,
    };

    const delimiter = ';';
    const stream = Readable.from(buffer);

    const parser = stream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        skip_records_with_empty_values: false,
        trim: true,
        bom: true,
        relaxColumnCount: true,
        relax_quotes: true,
        delimiter,
        quote: '"',
        escape: '"',
        record_delimiter: ['\n', '\r\n', '\r'],
      })
    );

    let rowIndex = 0;
    const advertisersTouched = new Set<string>();

    for await (const row of parser) {
      rowIndex++;

      const providerName = getField(row, ['Nome do Provider', 'Provider', 'Nome do provider']);
      const categories = getField(row, ['Categoria', 'Categorias']);
      const positioning = getField(row, [
        'Frase de posicionamento (achei que valia explicar o que é a principal feature da comunidade aqui)',
        'Frase de posicionamento',
      ]);
      const bio = getField(row, ['Bio']);
      const story = getField(row, ['Minha história']);
      const timeline = getField(row, ['Linha do tempo profissional']);
      const differentiators = getField(row, ['O que me torna diferente']);
      const mainImage = getField(row, ['Imagem principal']);

      const data: AdvertiserProfileCsvRow = {
        providerName,
        categories,
        positioning,
        bio,
        story,
        timeline,
        differentiators,
        mainImage,
      };

      const isCompletelyEmpty = Object.values(data).every(
        (v) => !v || String(v).trim() === ''
      );
      if (isCompletelyEmpty) {
        continue;
      }

      result.totalRows++;

      try {
        if (!providerName) {
          throw new Error('Nome do Provider é obrigatório');
        }

        const advertiser = await prisma.advertiser.findFirst({
          where: {
            deletedAt: null,
            name: {
              equals: providerName,
              mode: 'insensitive',
            },
          },
        });

        if (!advertiser) {
          throw new Error(
            `Advertiser não encontrado para o provider "${providerName}". Crie o advertiser primeiro no admin.`
          );
        }

        const profilesToUpsert: Array<{
          key: string;
          title: string | null;
          value: string;
          sortOrder: number;
        }> = [];

        if (categories) {
          profilesToUpsert.push({
            key: 'profile.categories',
            title: 'Categorias',
            value: categories,
            sortOrder: 0,
          });
        }

        if (positioning) {
          profilesToUpsert.push({
            key: 'profile.positioning',
            title: 'Frase de posicionamento',
            value: positioning,
            sortOrder: 10,
          });
        }

        if (bio) {
          profilesToUpsert.push({
            key: 'profile.bio',
            title: 'Bio',
            value: bio,
            sortOrder: 20,
          });
        }

        if (story) {
          profilesToUpsert.push({
            key: 'profile.story',
            title: 'Minha história',
            value: story,
            sortOrder: 30,
          });
        }

        if (timeline) {
          profilesToUpsert.push({
            key: 'profile.timeline',
            title: 'Linha do tempo profissional',
            value: timeline,
            sortOrder: 40,
          });
        }

        if (differentiators) {
          profilesToUpsert.push({
            key: 'profile.differentiators',
            title: 'O que me torna diferente',
            value: differentiators,
            sortOrder: 50,
          });
        }

        if (mainImage) {
          profilesToUpsert.push({
            key: 'profile.mainImage',
            title: 'Imagem principal',
            value: mainImage,
            sortOrder: 5,
          });
        }

        if (profilesToUpsert.length === 0) {
          throw new Error(
            'Nenhuma coluna de perfil preenchida (categorias, frase de posicionamento, bio, história, linha do tempo, diferenciais ou imagem principal)'
          );
        }

        let upsertedCountForAdvertiser = 0;

        for (const profile of profilesToUpsert) {
          await prisma.advertiserProfile.upsert({
            where: {
              advertiserId_key_locale: {
                advertiserId: advertiser.id,
                key: profile.key,
                locale: 'pt-BR',
              },
            },
            update: {
              value: profile.value,
              title: profile.title,
              sortOrder: profile.sortOrder,
              isVisible: true,
            },
            create: {
              advertiserId: advertiser.id,
              key: profile.key,
              locale: 'pt-BR',
              title: profile.title,
              value: profile.value,
              sortOrder: profile.sortOrder,
              isVisible: true,
            },
          });
          upsertedCountForAdvertiser++;
        }

        result.successCount++;
        result.profilesUpserted += upsertedCountForAdvertiser;
        advertisersTouched.add(advertiser.id);
      } catch (error: any) {
        result.errorCount++;
        result.errors.push({
          row: rowIndex,
          data,
          error: error.message || 'Unknown error',
        });
      }
    }

    result.advertisersWithProfiles = advertisersTouched.size;
    result.success = result.errorCount === 0 && result.totalRows > 0;

    const statusCode = result.success ? 201 : 207;
    const message =
      result.totalRows === 0
        ? 'Nenhuma linha de perfil encontrada. Verifique o formato do CSV (delimitador ; e cabeçalhos na primeira linha).'
        : result.success
          ? 'Perfis de providers importados com sucesso'
          : 'Importação de perfis concluída com alguns erros';

    sendSuccess(
      res,
      {
        summary: {
          totalRows: result.totalRows,
          successCount: result.successCount,
          errorCount: result.errorCount,
          advertisersWithProfiles: result.advertisersWithProfiles,
          profilesUpserted: result.profilesUpserted,
        },
        errors: result.errors,
      },
      message,
      statusCode
    );
  } catch (error: any) {
    console.error('[AdvertiserProfileImport] Error importing profiles:', error);
    sendError(
      res,
      'Error processing advertiser profile import',
      500,
      error?.message
    );
  }
};

export const downloadAdvertiserProfileTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const header =
      'Nome do Provider;Categoria;Frase de posicionamento (achei que valia explicar o que é a principal feature da comunidade aqui);Bio;Minha história;Linha do tempo profissional;O que me torna diferente;Imagem principal';

    const example =
      'Diogo Lara;Stress, Sleep, Self-esteem, Connection, Spirituality, Purpose & vision, Activity;Embarque num processo contínuo de Cura, Conexão e Crescimento, com encontros quinzenais ao vivo com Dr. Diogo Lara e atividades estruturadas para aumentar a capacidade emocional, desbloquear padrões limitantes e elevar o nível de consciência.;"Bio de exemplo do provider, com foco em credenciais, abordagem e proposta de valor.";"História pessoal e trajetória do provider.";Linha do tempo profissional resumida, com formações e experiências-chave.;O que diferencia este provider de outros (estilo, abordagem, experiências).;https://exemplo.com/imagem-principal.png';

    const csvContent = `${header}\n${example}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="likeme-provider-profile-template.csv"'
    );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('\uFEFF' + csvContent);
  } catch (error: any) {
    console.error('[AdvertiserProfileImport] Error downloading template:', error);
    sendError(res, 'Error downloading provider profile template', 500, error?.message);
  }
};

