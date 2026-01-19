import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '@/config';

const client = jwksClient({
  jwksUri: config.auth0.domain ? `https://${config.auth0.domain}/.well-known/jwks.json` : '',
  timeout: 30000,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

async function getKeyAsync(header: jwt.JwtHeader): Promise<string> {
  if (!config.auth0.domain) {
    throw new Error('AUTH0_DOMAIN não configurado');
  }

  // Verificar se o kid existe no header
  if (!header.kid) {
    console.warn('Token JWT não contém o campo "kid" no header.');
    throw new Error('Token JWT não contém o campo "kid" (Key ID) no header. Verifique se o token é um ID Token válido do Auth0.');
  }

  try {
    const key = await client.getSigningKey(header.kid);
    return key.getPublicKey();
  } catch (err) {
    throw new Error(`Erro ao buscar chave de assinatura: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
  }
}

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  getKeyAsync(header)
    .then((publicKey) => callback(null, publicKey))
    .catch((err) => callback(err));
}

export const verifyAuth0Token = async (idToken: string): Promise<jwt.JwtPayload> => {
  return new Promise((resolve, reject) => {
    if (!config.auth0.domain) {
      return reject(new Error('AUTH0_DOMAIN não configurado'));
    }

    const verifyOptions: jwt.VerifyOptions = {
      issuer: [
        config.auth0.issuer,
        `https://${config.auth0.domain}/`,
      ],
      algorithms: ['RS256'],
    };

    jwt.verify(
      idToken,
      getKey,
      verifyOptions,
      (err, decoded) => {
        if (err) {
          console.error('JWT verification error:', err.message);
          console.error('Token issuer expected:', config.auth0.issuer);
          if (decoded && typeof decoded !== 'string' && 'iss' in decoded) {
            console.error('Token issuer received:', decoded.iss);
            if ('aud' in decoded) {
              console.error('Token audience:', decoded.aud);
            }
          }
          return reject(err);
        }
        if (!decoded || typeof decoded === 'string') {
          return reject(new Error('Token inválido'));
        }
        resolve(decoded as jwt.JwtPayload);
      }
    );
  });
};

export interface Auth0UserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export const extractUserInfoFromToken = (decoded: jwt.JwtPayload): Auth0UserInfo => {
  return {
    sub: decoded.sub || '',
    email: decoded.email as string | undefined,
    email_verified: decoded.email_verified as boolean | undefined,
    name: decoded.name as string | undefined,
    nickname: decoded.nickname as string | undefined,
    picture: decoded.picture as string | undefined,
    given_name: decoded.given_name as string | undefined,
    family_name: decoded.family_name as string | undefined,
  };
};

