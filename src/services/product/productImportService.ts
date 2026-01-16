import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { productService } from './productService';
import { getProductImportRepository } from '@/utils/repositoryContainer';
import type { ProductImportRepository } from '@/repositories/product/ProductImportRepository';
import type { Product, Ad, Advertiser } from '@prisma/client';

export interface CSVProductRow {
  provider: string;
  marker: string;
  community: string;
  productName: string;
  variation: string;
  targetAudience: string;
  fullDescription: string;
  technicalSpecifications: string;
  stock: string;
  unitPrice: string;
  mainImage: string;
  secondaryImages: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    data: Partial<CSVProductRow>;
    error: string;
  }>;
  createdProducts: Product[];
  createdAds: Ad[];
}

export class ProductImportService {
  private repository: ProductImportRepository;

  constructor(repository?: ProductImportRepository) {
    this.repository = repository || getProductImportRepository();
  }

  async importFromCSV(fileBuffer: Buffer, userId: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdProducts: [],
      createdAds: [],
    };

    try {
      // Detectar o delimitador automaticamente
      const delimiter = this.detectDelimiter(fileBuffer);
      console.log(`[ProductImport] Detected delimiter: "${delimiter}"`);

      const stream = Readable.from(fileBuffer);

      const parser = stream.pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
          relaxColumnCount: true,
          delimiter: delimiter,
          quote: '"',
          escape: '"',
        })
      );

      let rowIndex = 0;

      for await (const row of parser) {
        rowIndex++;
        
        if (this.isHeaderOrEmptyRow(row)) {
          continue;
        }

        result.totalRows++;

        try {
          const csvRow = this.mapRowToCSVProduct(row);
          const { product, ad } = await this.processRow(csvRow, userId);
          
          result.createdProducts.push(product);
          if (ad) {
            result.createdAds.push(ad);
          }
          result.successCount++;
        } catch (error: any) {
          console.error(`Error processing row ${rowIndex}:`, error);
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
      console.error('Error processing CSV:', error);
      throw new Error(`Error processing CSV file: ${error.message}`);
    }

    return result;
  }

  private detectDelimiter(buffer: Buffer): string {
    try {
      // Converter buffer para string e pegar as primeiras linhas
      const text = buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Remove BOM
      const lines = text.split('\n').slice(0, 3); // Analisa as primeiras 3 linhas
      
      if (lines.length === 0) {
        return ','; // Default para vírgula
      }

      // Contar ocorrências de cada delimitador comum
      const delimiters = [';', ',', '\t', '|'];
      const counts: { [key: string]: number[] } = {};

      for (const delimiter of delimiters) {
        counts[delimiter] = [];
        
        for (const line of lines) {
          if (line.trim()) {
            // Contar delimitadores fora de aspas
            let inQuotes = false;
            let count = 0;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                // Verificar se é uma aspa de escape
                if (i + 1 < line.length && line[i + 1] === '"') {
                  i++; // Pular a próxima aspa
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (!inQuotes && char === delimiter) {
                count++;
              }
            }
            
            counts[delimiter].push(count);
          }
        }
      }

      // Encontrar o delimitador mais consistente (mesmo número em todas as linhas)
      let bestDelimiter = ',';
      let bestScore = -1;

      for (const delimiter of delimiters) {
        const delimiterCounts = counts[delimiter];
        
        if (delimiterCounts.length === 0) continue;

        // Calcular a consistência (todas as linhas devem ter o mesmo número de delimitadores)
        const firstCount = delimiterCounts[0];
        const isConsistent = delimiterCounts.every(c => c === firstCount);
        const totalCount = delimiterCounts.reduce((a, b) => a + b, 0);

        if (isConsistent && firstCount > 0 && totalCount > bestScore) {
          bestScore = totalCount;
          bestDelimiter = delimiter;
        }
      }

      console.log(`[ProductImport] Delimiter analysis:`, {
        semicolon: counts[';'],
        comma: counts[','],
        tab: counts['\t'],
        pipe: counts['|'],
        selected: bestDelimiter
      });

      return bestDelimiter;
    } catch (error) {
      console.error('[ProductImport] Error detecting delimiter, using comma as default:', error);
      return ',';
    }
  }

  private isHeaderOrEmptyRow(row: any): boolean {
    const values = Object.values(row);
    const allEmpty = values.every(v => !v || String(v).trim() === '');
    
    if (allEmpty) {
      return true;
    }

    const productName = row['Product Name'] || row['Nome do produto'] || row.productName;
    if (!productName || String(productName).trim() === '') {
      return true;
    }

    return false;
  }

  private mapRowToCSVProduct(row: any): CSVProductRow {
    const getField = (keys: string[]): string => {
      for (const key of keys) {
        const value = row[key];
        if (value && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    return {
      provider: getField(['Provider', 'provider']),
      marker: getField(['Marker', 'marker']),
      community: getField(['Comunidade', 'Community', 'community']),
      productName: getField(['Nome do produto', 'Product Name', 'productName']),
      variation: getField([
        'Variação\n(tamanho, cor, sabor, volume etc.)',
        'Variação',
        'Variation',
        'variation'
      ]),
      targetAudience: getField(['Indicado para', 'Target Audience', 'targetAudience']),
      fullDescription: getField([
        'Descrição completa e benefícios',
        'Full Description & Benefits',
        'Full Description',
        'fullDescription'
      ]),
      technicalSpecifications: getField([
        'Lista de especificações técnicas',
        'Technical Specifications List',
        'Technical Specifications',
        'technicalSpecifications'
      ]),
      stock: getField(['Estoque\n(quantidade)', 'Estoque', 'Stock', 'stock']),
      unitPrice: getField(['Preço unitário', 'Unit Price', 'unitPrice']),
      mainImage: getField(['Imagem principal', 'Main Image', 'mainImage']),
      secondaryImages: getField(['Imagens secundárias', 'Secondary Images', 'secondaryImages']),
    };
  }

  private async processRow(
    csvRow: CSVProductRow,
    userId: string
  ): Promise<{ product: Product; ad: Ad | null }> {
    if (!csvRow.productName || csvRow.productName.trim() === '') {
      throw new Error('Product name is required');
    }

    const price = this.parsePrice(csvRow.unitPrice);
    const quantity = this.parseQuantity(csvRow.stock);
    const markers = this.parseMarkers(csvRow.marker);
    const sku = this.generateSKU(csvRow.productName, csvRow.variation);

    const productData = {
      name: csvRow.productName.trim(),
      description: this.buildDescription(csvRow),
      sku: sku,
      price: price,
      cost: null,
      quantity: quantity,
      image: csvRow.mainImage?.trim() || null,
      category: 'physical product',
      brand: csvRow.provider?.trim() || null,
      status: quantity && quantity > 0 ? 'active' : 'out_of_stock',
      weight: null,
      dimensions: null,
      externalUrl: null,
    };

    const product = await productService.create(productData, userId);

    let ad: Ad | null = null;
    if (csvRow.provider && csvRow.provider.trim() !== '') {
      ad = await this.createAdForProduct(product.id, csvRow, userId);
    }

    return { product, ad };
  }

  private buildDescription(csvRow: CSVProductRow): string {
    let description = '';

    if (csvRow.fullDescription) {
      description += csvRow.fullDescription.trim();
    }

    if (csvRow.variation && csvRow.variation.trim() !== '') {
      description += `\n\n**Variation:** ${csvRow.variation.trim()}`;
    }

    if (csvRow.targetAudience && csvRow.targetAudience.trim() !== '') {
      description += `\n\n**Target Audience:** ${csvRow.targetAudience.trim()}`;
    }

    if (csvRow.technicalSpecifications && csvRow.technicalSpecifications.trim() !== '') {
      description += `\n\n**Technical Specifications:** ${csvRow.technicalSpecifications.trim()}`;
    }

    return description.trim();
  }

  private parsePrice(priceStr: string): number {
    if (!priceStr || priceStr.trim() === '') {
      return 0;
    }

    const cleaned = priceStr
      .replace(/R\$/g, '')
      .replace(/\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');

    const price = parseFloat(cleaned);
    
    if (isNaN(price)) {
      throw new Error(`Invalid price: ${priceStr}`);
    }

    return price;
  }

  private parseQuantity(quantityStr: string): number | null {
    if (!quantityStr || quantityStr.trim() === '') {
      return null;
    }

    const quantity = parseInt(quantityStr.trim(), 10);
    
    if (isNaN(quantity)) {
      return null;
    }

    return quantity;
  }

  private parseMarkers(markerStr: string): string[] {
    if (!markerStr || markerStr.trim() === '') {
      return [];
    }

    return markerStr
      .split(',')
      .map(m => m.trim())
      .filter(m => m !== '');
  }

  private generateSKU(productName: string, variation: string): string {
    const namePart = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20);

    const variationPart = variation
      ? variation.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 10)
      : '';

    const timestamp = Date.now().toString(36);
    
    return `${namePart}${variationPart ? '-' + variationPart : ''}-${timestamp}`;
  }

  private async createAdForProduct(
    productId: string,
    csvRow: CSVProductRow,
    userId: string
  ): Promise<Ad | null> {
    try {
      let advertiser = await this.findOrCreateAdvertiser(csvRow.provider, userId);

      if (!advertiser) {
        console.warn(`Could not create advertiser for ${csvRow.provider}`);
        return null;
      }

      const ad = await this.repository.createAd({
        advertiserId: advertiser.id,
        productId: productId,
        status: 'active',
        targetAudience: csvRow.targetAudience || null,
        startDate: new Date(),
        endDate: null,
      });

      return ad;
    } catch (error: any) {
      console.error('Error creating ad:', error);
      return null;
    }
  }

  private async findOrCreateAdvertiser(
    providerName: string,
    userId: string
  ): Promise<Advertiser | null> {
    try {
      let advertiser = await this.repository.findAdvertiserByUserId(userId);

      if (!advertiser) {
        advertiser = await this.repository.createAdvertiser(userId, providerName.trim());
      }

      return advertiser;
    } catch (error: any) {
      console.error('Error finding/creating advertiser:', error);
      return null;
    }
  }
}

export const productImportService = new ProductImportService();
