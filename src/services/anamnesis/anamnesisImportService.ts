import { parse } from 'csv-parse';
import { Readable } from 'stream';
import prisma from '@/config/database';
import type { AnamnesisQuestionConcept, QuestionType } from '@prisma/client';

export interface CSVAnamnesisRow {
  domain: string;   // Marker (ex: MOVIMENTO)
  section: string;  // Seção (ex: Hábitos, Mecânica)
  key: string;
  type: string;
  order: string;
  text_ptBR: string;
  text_enUS: string;
  text_esES: string;
  options: string;  // formato: "key:valor:Label pt-BR" ou "key:valor:pt-BR:en-US:es-ES". Separador entre opções: |
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    data: Partial<CSVAnamnesisRow>;
    error: string;
  }>;
  createdQuestions: AnamnesisQuestionConcept[];
  updatedQuestions: AnamnesisQuestionConcept[];
}

export class AnamnesisImportService {
  async importFromCSV(fileBuffer: Buffer): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdQuestions: [],
      updatedQuestions: [],
    };

    try {
      const delimiter = ';';
      console.log(`[AnamnesisImport] Using semicolon (;) as delimiter`);

      const stream = Readable.from(fileBuffer);

      const parser = stream.pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          skip_records_with_empty_values: false,
          trim: true,
          bom: true,
          relaxColumnCount: true,
          relax_quotes: true,
          delimiter: delimiter,
          quote: '"',
          escape: '"',
          record_delimiter: ['\n', '\r\n', '\r'],
        })
      );

      let rowIndex = 0;

      for await (const row of parser) {
        rowIndex++;

        if (rowIndex <= 3) {
          console.log(`[AnamnesisImport] Row ${rowIndex} keys:`, Object.keys(row));
        }

        if (this.isHeaderOrEmptyRow(row)) {
          console.log(`[AnamnesisImport] Skipping row ${rowIndex} - header or empty`);
          continue;
        }

        result.totalRows++;

        try {
          const csvRow = this.mapRowToCSVAnamnesis(row);
          const { question, isUpdate } = await this.processRow(csvRow);

          if (isUpdate) {
            result.updatedQuestions.push(question);
          } else {
            result.createdQuestions.push(question);
          }
          result.successCount++;
        } catch (error: any) {
          console.error(`[AnamnesisImport] Error processing row ${rowIndex}:`, error);
          result.errorCount++;
          result.errors.push({
            row: rowIndex,
            data: row,
            error: error.message || 'Unknown error',
          });
        }
      }

      result.success = result.errorCount === 0;
    } catch (error: any) {
      console.error('[AnamnesisImport] Error processing CSV:', error);
      throw new Error(`Error processing CSV file: ${error.message}`);
    }

    return result;
  }

  private isHeaderOrEmptyRow(row: any): boolean {
    const values = Object.values(row);
    const allEmpty = values.every(v => !v || String(v).trim() === '');

    if (allEmpty) return true;

    const key = row['key'] || row['Key'] || row['KEY'];
    if (!key || String(key).trim() === '') return true;

    return false;
  }

  private mapRowToCSVAnamnesis(row: any): CSVAnamnesisRow {
    const getField = (keys: string[]): string => {
      for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null) {
          return String(value).trim();
        }
      }
      return '';
    };

    return {
      domain: getField(['domain', 'Domain', 'marker', 'Marker']),
      section: getField(['section', 'Section', 'seção', 'Seção']),
      key: getField(['key', 'Key', 'KEY']),
      type: getField(['type', 'Type', 'TYPE', 'answerType', 'answer_type']),
      order: getField(['order', 'Order', 'ORDER']),
      text_ptBR: getField(['text_pt-BR', 'text_ptBR', 'pt-BR', 'ptBR', 'portugues', 'texto']),
      text_enUS: getField(['text_en-US', 'text_enUS', 'en-US', 'enUS', 'english']),
      text_esES: getField(['text_es-ES', 'text_esES', 'es-ES', 'esES', 'espanhol']),
      options: getField(['options', 'Options', 'OPTIONS', 'opções', 'Opções']),
    };
  }

  private parseQuestionType(typeStr: string): QuestionType {
    const normalized = typeStr.toLowerCase().trim().replace(/[-\s]/g, '_');
    
    switch (normalized) {
      case 'single_choice':
      case 'singlechoice':
      case 'single':
        return 'single_choice';
      case 'multiple_choice':
      case 'multiplechoice':
      case 'multiple':
        return 'multiple_choice';
      case 'text':
      case 'string':
        return 'text';
      case 'number':
      case 'numeric':
        return 'number';
      default:
        return 'single_choice';
    }
  }

  private parseOptions(optionsStr: string): Array<{
    key: string;
    value: string;
    texts: { locale: string; value: string }[];
  }> {
    if (!optionsStr || optionsStr.trim() === '') return [];

    // formato: "key:valor:Label pt-BR" (label pode conter ":") ou "key:valor:pt-BR:en-US:es-ES"
    const options: Array<{
      key: string;
      value: string;
      texts: { locale: string; value: string }[];
    }> = [];

    const parts = optionsStr.split('|');
    
    for (const part of parts) {
      const segments = part.split(':');
      if (segments.length < 2) continue;

      const key = segments[0].trim();
      const value = (segments[1] ?? '').trim() || '0';

      // 3 segmentos = key:valor:Label (um único rótulo pt-BR)
      // 4 segmentos = key:valor:pt-BR:en-US
      // 5+ segmentos = key:valor:pt-BR:en-US:es-ES
      const texts: { locale: string; value: string }[] = [];
      if (segments.length === 3) {
        const label = segments[2].trim();
        if (label) texts.push({ locale: 'pt-BR', value: label });
      } else if (segments.length >= 4) {
        const ptBR = segments[2]?.trim();
        const enUS = segments[3]?.trim();
        const esES = segments[4]?.trim();
        if (ptBR) texts.push({ locale: 'pt-BR', value: ptBR });
        if (enUS) texts.push({ locale: 'en-US', value: enUS });
        if (esES) texts.push({ locale: 'es-ES', value: esES });
      }

      if (texts.length === 0) {
        texts.push({ locale: 'pt-BR', value: key });
      }

      options.push({ key, value, texts });
    }

    return options;
  }

  private async processRow(
    csvRow: CSVAnamnesisRow
  ): Promise<{ question: AnamnesisQuestionConcept; isUpdate: boolean }> {
    if (!csvRow.key || csvRow.key.trim() === '') {
      throw new Error('Question key is required');
    }

    const key = csvRow.key.trim();
    const type = this.parseQuestionType(csvRow.type);
    const order = parseInt(csvRow.order, 10) || 0;

    // Verificar se já existe
    const existingQuestion = await prisma.anamnesisQuestionConcept.findUnique({
      where: { key },
    });

    let question: AnamnesisQuestionConcept;
    let isUpdate = false;

    if (existingQuestion) {
      // Atualizar pergunta existente
      question = await prisma.anamnesisQuestionConcept.update({
        where: { id: existingQuestion.id },
        data: { type, order },
      });
      isUpdate = true;

      // Deletar textos e opções antigas para recriar
      await prisma.anamnesisQuestionText.deleteMany({
        where: { questionConceptId: existingQuestion.id },
      });

      // Deletar opções (cascata deleta os textos das opções)
      await prisma.anamnesisAnswerOption.deleteMany({
        where: { questionConceptId: existingQuestion.id },
      });

      console.log(`[AnamnesisImport] Updated question: ${key}`);
    } else {
      // Criar nova pergunta
      question = await prisma.anamnesisQuestionConcept.create({
        data: { key, type, order },
      });
      console.log(`[AnamnesisImport] Created question: ${key}`);
    }

    // Criar textos da pergunta
    const textsToCreate: { questionConceptId: string; locale: string; value: string }[] = [];

    if (csvRow.text_ptBR && csvRow.text_ptBR.trim()) {
      textsToCreate.push({ questionConceptId: question.id, locale: 'pt-BR', value: csvRow.text_ptBR.trim() });
    }
    if (csvRow.text_enUS && csvRow.text_enUS.trim()) {
      textsToCreate.push({ questionConceptId: question.id, locale: 'en-US', value: csvRow.text_enUS.trim() });
    }
    if (csvRow.text_esES && csvRow.text_esES.trim()) {
      textsToCreate.push({ questionConceptId: question.id, locale: 'es-ES', value: csvRow.text_esES.trim() });
    }

    if (textsToCreate.length > 0) {
      await prisma.anamnesisQuestionText.createMany({ data: textsToCreate });
    }

    // Criar opções de resposta
    const options = this.parseOptions(csvRow.options);
    
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];

      const answerOption = await prisma.anamnesisAnswerOption.create({
        data: {
          questionConceptId: question.id,
          key: opt.key,
          value: opt.value,
          order: i,
        },
      });

      // Criar textos das opções
      if (opt.texts.length > 0) {
        await prisma.anamnesisAnswerOptionText.createMany({
          data: opt.texts.map(t => ({
            answerOptionId: answerOption.id,
            locale: t.locale,
            value: t.value,
          })),
        });
      }
    }

    return { question, isUpdate };
  }
}

export const anamnesisImportService = new AnamnesisImportService();
