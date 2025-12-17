/**
 * Utilitário para extrair dados públicos de produtos da Amazon via web scraping
 */

/**
 * Extrai dados públicos de uma página de produto da Amazon
 */
export const extractAmazonProductData = async (url: string) => {
  try {
    // Fazer requisição para a página do produto
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Amazon page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extrair ASIN da URL
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/([A-Z0-9]{10})(?:\/|$)/);
    const asin = asinMatch ? asinMatch[1].toUpperCase() : null;

    // Extrair título do produto
    let title = '';
    const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
                      html.match(/<h1[^>]*class="a-size-large[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Extrair descrição - tentar múltiplos padrões
    let description = '';
    const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    if (metaDescMatch) {
      description = metaDescMatch[1].trim();
    } else {
      const featureBulletsMatch = html.match(/<div[^>]*id="feature-bullets"[^>]*>([\s\S]{0,5000})<\/div>/i);
      if (featureBulletsMatch) {
        const bulletsText = featureBulletsMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        description = bulletsText.substring(0, 1000);
      } else {
        const productDescMatch = html.match(/<div[^>]*id="productDescription"[^>]*>([\s\S]{0,2000})<\/div>/i);
        if (productDescMatch) {
          description = productDescMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1000);
        }
      }
    }

    // Extrair preço - múltiplos padrões para diferentes formatos de página
    let price = 0;
    let priceDisplay = '';
    const pricePatterns = [
      // Preço com classe a-price
      /<span[^>]*class="a-price[^"]*"[^>]*>[\s\S]*?<span[^>]*class="a-offscreen"[^>]*>R\$\s*([\d.,]+)<\/span>/i,
      /<span[^>]*class="a-price[^"]*"[^>]*>[\s\S]*?<span[^>]*class="a-price-whole"[^>]*>([\d.,]+)<\/span>/i,
      // IDs específicos de preço
      /<span[^>]*id="priceblock_dealprice"[^>]*>[\s\S]*?R\$\s*([\d.,]+)/i,
      /<span[^>]*id="priceblock_ourprice"[^>]*>[\s\S]*?R\$\s*([\d.,]+)/i,
      /<span[^>]*id="priceblock_saleprice"[^>]*>[\s\S]*?R\$\s*([\d.,]+)/i,
      // Meta tags
      /<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i,
      /<span[^>]*class="a-price a-text-price a-size-medium apexPriceToPay"[^>]*>[\s\S]*?R\$\s*([\d.,]+)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        const priceValue = match[1];
        if (priceValue) {
          // Limpar e converter o preço (formato brasileiro: R$ 1.234,56)
          // Remove pontos (milhares) e converte vírgula para ponto decimal
          const cleanedPrice = priceValue.replace(/\./g, '').replace(',', '.');
          const parsedPrice = parseFloat(cleanedPrice);
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            price = parsedPrice;
            // Formatar para exibição: manter formato brasileiro
            priceDisplay = priceValue;
            break;
          }
        }
      }
    }

    // Extrair imagens
    const images: string[] = [];
    
    // Tentar extrair imagem principal - múltiplos padrões
    const mainImagePatterns = [
      /<img[^>]*id="landingImage"[^>]*src="([^"]+)"/i,
      /<img[^>]*id="landingImage"[^>]*data-src="([^"]+)"/i,
      /<img[^>]*id="main-image"[^>]*src="([^"]+)"/i,
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
      /<div[^>]*id="imgTagWrapperId"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i,
    ];
    
    for (const pattern of mainImagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const imgUrl = match[1];
        if (imgUrl && !imgUrl.includes('pixel') && !images.includes(imgUrl)) {
          images.push(imgUrl);
          break; // Encontrou a imagem principal
        }
      }
    }

    // Extrair outras imagens do carousel (até 4 adicionais)
    const carouselImageMatches = html.matchAll(/<img[^>]*data-a-dynamic-image='\{[^}]*"([^"]+)"[^}]*\}'/gi);
    for (const match of carouselImageMatches) {
      const imgUrl = match[1];
      if (imgUrl && !imgUrl.includes('pixel') && !images.includes(imgUrl) && images.length < 5) {
        images.push(imgUrl);
      }
    }

    // Extrair rating
    let rating = 0;
    const ratingMatch = html.match(/<span[^>]*class="a-icon-alt"[^>]*>([\d.,]+)[^<]*de 5 estrelas/i) ||
                        html.match(/<span[^>]*data-hook="rating-out-of-text"[^>]*>([\d.,]+)[^<]*/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1].replace(',', '.'));
    }

    // Extrair número de avaliações
    let reviewCount = 0;
    const reviewMatch = html.match(/([\d.,]+)\s*avaliações?/i) ||
                       html.match(/<span[^>]*id="acrCustomerReviewText"[^>]*>([\d.,]+)/i);
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1].replace(/\./g, '').replace(',', ''));
    }

    // Extrair marca/fabricante
    let brand = '';
    const brandMatch = html.match(/<a[^>]*id="brand"[^>]*>([^<]+)<\/a>/i) ||
                      html.match(/<span[^>]*class="a-size-base[^"]*"[^>]*>Marca[^:]*:?\s*([^<\n]+)/i);
    if (brandMatch) {
      brand = brandMatch[1].trim();
    }

    return {
      asin,
      title: title || 'Produto Amazon',
      description: description || '',
      price,
      priceDisplay: priceDisplay ? `R$ ${priceDisplay}` : '',
      currency: 'BRL',
      images,
      image: images[0] || '',
      rating,
      reviewCount,
      brand,
      url,
      availability: 'Available', // Por padrão, assumimos disponível se a página carregou
    };
  } catch (error: any) {
    console.error('Error extracting Amazon product data:', error);
    throw new Error(`Failed to extract product data: ${error.message}`);
  }
};
