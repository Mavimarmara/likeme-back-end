import { parse } from 'csv-parse';
import { Readable } from 'stream';
import prisma from '@/config/database';
import type { AnamnesisQuestionConcept, QuestionType } from '@prisma/client';

export interface CSVAnamnesisRow {
  domain: string;   // Marker (ex: MOVIMENTO)
  section: string;  // Seção (ex: Hábitos, Mecânica)
  key: string;      // Opcional: gerado por section+domain+order se vazio
  type: string;
  order: string;
  text: string;     // Texto da pergunta (único campo por enquanto)
  options: string;  // formato: "key:valor:Label". Separador entre opções: |
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

    const key = (row['key'] ?? row['Key'] ?? row['KEY'] ?? '').toString().trim();
    const section = (row['section'] ?? row['Section'] ?? row['seção'] ?? row['Seção'] ?? '').toString().trim();
    const domain = (row['domain'] ?? row['Domain'] ?? row['marker'] ?? row['Marker'] ?? '').toString().trim();
    const text = (row['text'] ?? row['texto'] ?? row['Text'] ?? row['text_pt-BR'] ?? '').toString().trim();

    // Linha válida se tem key OU (section + domain) para gerar key, e tem texto da pergunta
    const hasKey = key.length > 0;
    const canGenerateKey = section.length > 0 && domain.length > 0;
    if (!text || (!hasKey && !canGenerateKey)) return true;

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
      text: getField(['text', 'texto', 'Text', 'text_pt-BR']),
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

  /** Gera key a partir de section + domain + order (ex: habits_movimento_1) */
  private buildKey(section: string, domain: string, order: number): string {
    const slug = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return `${slug(section)}_${slug(domain)}_${order}`;
  }

  private async processRow(
    csvRow: CSVAnamnesisRow
  ): Promise<{ question: AnamnesisQuestionConcept; isUpdate: boolean }> {
    const order = parseInt(csvRow.order, 10) || 0;
    let key = (csvRow.key ?? '').trim();
    if (!key && csvRow.section && csvRow.domain) {
      key = this.buildKey(csvRow.section.trim(), csvRow.domain.trim(), order);
    }
    if (!key) {
      throw new Error('Question key is required, or provide section, domain and order to generate it');
    }

    const type = this.parseQuestionType(csvRow.type);

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

    // Criar texto da pergunta (pt-BR por enquanto)
    if (csvRow.text && csvRow.text.trim()) {
      await prisma.anamnesisQuestionText.create({
        data: { questionConceptId: question.id, locale: 'pt-BR', value: csvRow.text.trim() },
      });
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
