import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@/config/database';
import { config } from '@/config';
import { generateToken } from '@/utils/auth';
import { verifyAuth0Token, extractUserInfoFromToken } from '@/utils/auth0';
import { sendSuccess, sendError } from '@/utils/response';
import { CreateUserData, AuthResponse, AuthenticatedRequest } from '@/types';
import { userService } from '@/services/user/userService';
import { communityService } from '@/services/community/communityService';
import { loginToAmity } from '@/utils/amityClient';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserData = req.body;

    if (userData.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existingUser) {
        sendError(res, 'Usuário já existe com este username', 409);
        return;
      }
    }

    const existingContact = await prisma.personContact.findFirst({
      where: {
        type: 'email',
        value: userData.email,
      },
    });

    if (existingContact) {
      sendError(res, 'Email já cadastrado', 409);
      return;
    }

    const person = await prisma.person.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        surname: userData.surname,
        birthdate: userData.birthdate ? new Date(userData.birthdate) : null,
      },
    });

    await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: userData.email,
      },
    });

    if (userData.phone) {
      await prisma.personContact.create({
        data: {
          personId: person.id,
          type: 'phone',
          value: userData.phone,
        },
      });
    }

    const userDataToCreate: {
      personId: string;
      password: string;
      avatar?: string;
      username?: string;
    } = {
      personId: person.id,
      password: '',
      avatar: userData.avatar,
    };

    if (userData.username) {
      userDataToCreate.username = userData.username;
    }

    const user = await prisma.user.create({
      data: userDataToCreate,
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    let socialPlusUserId = user.socialPlusUserId;
    try {
      if (!socialPlusUserId) {
        const emailContact = user.person.contacts.find((c) => c.type === 'email');
        const result = await userService.createUserAndSyncToDatabase(user.id, {
          username: user.username || undefined,
          email: emailContact?.value || userData.email,
          firstName: user.person.firstName,
          lastName: user.person.lastName,
          avatar: user.avatar || undefined,
        });
        socialPlusUserId = result.socialPlusUserId;
        user.socialPlusUserId = socialPlusUserId;
      }
    } catch (error) {
      console.error('Erro ao criar usuário na social.plus:', error);
    }

    const token = generateToken(user.id);

    if (socialPlusUserId) {
      try {
        console.log(`[Auth] Adicionando usuário ${socialPlusUserId} a todas as comunidades...`);
        const addResult = await userService.addUserToAllCommunities(socialPlusUserId);
        console.log(`[Auth] Usuário adicionado a ${addResult.added} comunidades, ${addResult.failed} falhas`);
        if (addResult.errors.length > 0) {
          console.warn('[Auth] Erros ao adicionar usuário a algumas comunidades:', addResult.errors);
        }
      } catch (addError) {
        console.error('[Auth] Erro ao adicionar usuário a todas as comunidades:', addError);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword,
      token,
    };

    sendSuccess(res, response, 'Usuário criado com sucesso', 201);
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 'Erro ao criar usuário');
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const idToken = req.body.idToken || (req.headers.authorization?.replace('Bearer ', ''));
    
    if (!idToken) {
      sendError(res, 'Token do Auth0 não fornecido', 400);
      return;
    }

    let decoded;
    try {
      console.log('Validating Auth0 token, length:', idToken.length);
      console.log('Token preview:', idToken.substring(0, 50) + '...');
      decoded = await verifyAuth0Token(idToken);
      console.log('Token validated successfully');
      console.log('Decoded token issuer:', decoded.iss);
      console.log('Decoded token audience:', decoded.aud);
    } catch (error) {
      console.error('Auth0 token validation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      sendError(res, `Token do Auth0 inválido ou expirado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 401);
      return;
    }

    const auth0User = extractUserInfoFromToken(decoded);
    const userInfo = req.body.user || {};

    const email = auth0User.email || userInfo.email;
    if (!email) {
      sendError(res, 'Email não encontrado no token do Auth0', 400);
      return;
    }

    const existingContact = await prisma.personContact.findFirst({
      where: {
        type: 'email',
        value: email,
        deletedAt: null,
      },
      include: {
        person: {
          include: {
            user: {
              include: {
                person: {
                  include: {
                    contacts: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let user;
    let existingPerson;

    if (existingContact?.person?.user) {
      user = existingContact.person.user;
      existingPerson = existingContact.person;

      if (userInfo.picture && userInfo.picture !== user.avatar) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: userInfo.picture },
        });
        user.avatar = userInfo.picture;
      }

      if (!user.socialPlusUserId) {
        try {
          const emailContact = user.person?.contacts?.find((c: { type: string }) => c.type === 'email');
          const result = await userService.createUserAndSyncToDatabase(user.id, {
            username: user.username || undefined,
            email: emailContact?.value || email,
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            avatar: user.avatar || undefined,
          });
          user.socialPlusUserId = result.socialPlusUserId;
        } catch (error) {
          console.error('Erro ao criar usuário na social.plus:', error);
        }
      }
    } else {
      const name = auth0User.name || userInfo.name || email.split('@')[0];
      const nameParts = name.split(' ');
      const firstName = auth0User.given_name || nameParts[0] || '';
      const lastName = auth0User.family_name || nameParts.slice(1).join(' ') || '';

      const newPerson = await prisma.person.create({
        data: {
          firstName,
          lastName,
          surname: auth0User.nickname || undefined,
        },
      });

      await prisma.personContact.create({
        data: {
          personId: newPerson.id,
          type: 'email',
          value: email,
        },
      });

      user = await prisma.user.create({
        data: {
          personId: newPerson.id,
          password: '',
          avatar: auth0User.picture || userInfo.picture || undefined,
          isActive: true,
        },
        include: {
          person: {
            include: {
              contacts: true,
            },
          },
        },
      });

      try {
        const result = await userService.createUserAndSyncToDatabase(user.id, {
          email: email,
          firstName: newPerson.firstName,
          lastName: newPerson.lastName,
          avatar: user.avatar || undefined,
        });
        user.socialPlusUserId = result.socialPlusUserId;
      } catch (error) {
        console.error('Erro ao criar usuário na social.plus:', error);
      }
    }

    if (!user.isActive || user.deletedAt) {
      sendError(res, 'Usuário inativo ou deletado', 401);
      return;
    }

    // Buscar usuário completo com person e objetivos
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        personId: true,
        username: true,
        password: true,
        avatar: true,
        isActive: true,
        socialPlusUserId: true,
        person: {
          include: {
            contacts: true,
          },
        },
        personalObjectives: {
          where: {
            deletedAt: null,
          },
          select: {
            createdAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!fullUser) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    // Calcular registerCompletedAt: true se houver dados adicionais na Person
    // Considera completo se tiver: nationalRegistration, birthdate, surname, ou contatos além de email
    const userPerson = fullUser.person;
    const hasNationalRegistration = !!userPerson?.nationalRegistration;
    const hasBirthdate = !!userPerson?.birthdate;
    const hasSurname = !!userPerson?.surname;
    const hasAdditionalContacts = userPerson?.contacts?.some(
      (contact: { type: string; deletedAt: Date | null }) => contact.type !== 'email' && !contact.deletedAt
    ) || false;
    
    const registerCompletedAt = (hasNationalRegistration || hasBirthdate || hasSurname || hasAdditionalContacts)
      ? userPerson?.updatedAt || userPerson?.createdAt || null
      : null;

    // Calcular objectivesSelectedAt: true se houver objetivos selecionados
    const personalObjectives = (fullUser as any).personalObjectives;
    const objectivesSelectedAt = personalObjectives && personalObjectives.length > 0
      ? personalObjectives[0].createdAt
      : null;

    const sessionToken = generateToken(fullUser.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = fullUser;

    // Sempre fazer login no Amity (social.plus)
    // Usar o userId do Auth0 (sub) como identificador no Amity
    // Se o login retornar um userId diferente, salvar no banco
    // Gerar access token para o usuário
    let userAccessToken: string | undefined;
    try {
      const displayName = userPerson
        ? `${userPerson.firstName} ${userPerson.lastName}`.trim() || userPerson.firstName || 'Usuário'
        : 'Usuário';

      // Usar o userId do Auth0 (sub) como identificador no Amity
      const amityUserId = auth0User.sub;

      if (!amityUserId) {
        console.warn('Auth0 sub não encontrado. Não será possível fazer login no Amity.');
      } else {
        const loginResult = await loginToAmity(amityUserId, displayName);

        if (loginResult) {
          const { userId: returnedUserId, accessToken } = loginResult;
          userAccessToken = accessToken || undefined;

          // Salvar o userId do Auth0 como socialPlusUserId se ainda não tiver
          // O userId retornado deve ser o mesmo que passamos (auth0User.sub)
          if (returnedUserId && returnedUserId !== fullUser.socialPlusUserId) {
            try {
              await prisma.user.update({
                where: { id: fullUser.id },
                data: { socialPlusUserId: returnedUserId },
              });

              // Atualizar o objeto fullUser para refletir a mudança
              fullUser.socialPlusUserId = returnedUserId;
              userWithoutPassword.socialPlusUserId = returnedUserId;

              console.log(`socialPlusUserId ${returnedUserId} (Auth0 sub) salvo para o usuário ${fullUser.id}`);
            } catch (dbError) {
              console.error('Erro ao salvar socialPlusUserId no banco:', dbError);
              // Não falha o login se não conseguir salvar
            }
          } else if (!fullUser.socialPlusUserId && returnedUserId) {
            // Se não tinha socialPlusUserId e agora temos, salvar
            try {
              await prisma.user.update({
                where: { id: fullUser.id },
                data: { socialPlusUserId: returnedUserId },
              });

              fullUser.socialPlusUserId = returnedUserId;
              userWithoutPassword.socialPlusUserId = returnedUserId;

              console.log(`socialPlusUserId ${returnedUserId} (Auth0 sub) salvo para o usuário ${fullUser.id}`);
            } catch (dbError) {
              console.error('Erro ao salvar socialPlusUserId no banco:', dbError);
            }
          }

          // Log do access token gerado (não salvar no banco por segurança)
          if (accessToken) {
            console.log(`Access token gerado para o usuário ${returnedUserId} (primeiros 20 chars: ${accessToken.substring(0, 20)}...)`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao fazer login no Amity (não bloqueia o login):', error);
      // Não falha o login se a integração com Amity falhar
    }

    if (fullUser.socialPlusUserId) {
      try {
        console.log(`[Auth] Adicionando usuário ${fullUser.socialPlusUserId} a todas as comunidades...`);
        const addResult = await userService.addUserToAllCommunities(
          fullUser.socialPlusUserId,
          userAccessToken
        );
        console.log(`[Auth] Usuário adicionado a ${addResult.added} comunidades, ${addResult.failed} falhas`);
        if (addResult.errors.length > 0) {
          console.warn('[Auth] Erros ao adicionar usuário a algumas comunidades:', addResult.errors);
        }
      } catch (addError) {
        console.error('[Auth] Erro ao adicionar usuário a todas as comunidades:', addError);
      }
    }

    const response: AuthResponse = {
      user: userWithoutPassword,
      token: sessionToken,
      registerCompletedAt,
      objectivesSelectedAt,
    };

    sendSuccess(res, response, 'Login realizado com sucesso');
  } catch (error) {
    console.error('Auth0 login error:', error);
    sendError(res, 'Erro ao fazer login com Auth0');
  }
};

export const getAuthUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!config.auth0.domain || !config.auth0.clientId) {
      sendError(res, 'Auth0 não configurado corretamente', 500);
      return;
    }

    const auth0Domain = config.auth0.domain;
    const clientId = config.auth0.clientId;
    const redirectUri = `${config.baseUrl}/api/auth/callback`;
    const responseType = 'code';
    const scope = 'openid profile email';
    const state = req.query.state as string || Math.random().toString(36).substring(7);

    const authUrl = `https://${auth0Domain}/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${encodeURIComponent(state)}`;

    sendSuccess(
      res,
      {
        authUrl,
        redirectUri,
        state,
        instructions: 'Acesse a URL authUrl no navegador para fazer login. Após o login, você será redirecionado com um código.',
      },
      'URL de autorização gerada com sucesso'
    );
  } catch (error) {
    console.error('Auth0 auth URL error:', error);
    sendError(res, 'Erro ao gerar URL de autorização');
  }
};

export const handleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      sendError(res, `Erro na autorização: ${error}`, 400);
      return;
    }

    if (!code) {
      sendError(res, 'Código de autorização não fornecido', 400);
      return;
    }

    if (!config.auth0.domain || !config.auth0.clientId || !config.auth0.clientSecret) {
      sendError(res, 'Auth0 não configurado corretamente', 500);
      return;
    }

    const auth0Domain = config.auth0.domain;
    const clientId = config.auth0.clientId;
    const clientSecret = config.auth0.clientSecret;
    const redirectUri = `${config.baseUrl}/api/auth/callback`;

    // Trocar código por tokens
    const tokenUrl = `https://${auth0Domain}/oauth/token`;

    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('code', code as string);
    body.append('redirect_uri', redirectUri);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errorMessage = data.error_description || data.error || 'Erro ao trocar código por tokens';
      sendError(res, errorMessage, response.status);
      return;
    }

    // Retornar HTML com script para preencher o Swagger automaticamente
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Auth0 Login - Sucesso</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
    }
    .success {
      color: #4CAF50;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .token {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
      margin: 20px 0;
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #45a049;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✅ Login realizado com sucesso!</div>
    <p>Seu idToken foi obtido. Você pode fechar esta janela.</p>
    <div class="token">idToken: ${data.id_token.substring(0, 50)}...</div>
    <p><strong>Copie o idToken abaixo e cole no Swagger Authorize:</strong></p>
    <textarea id="token" readonly style="width: 100%; height: 100px; margin: 10px 0; padding: 10px; font-family: monospace; font-size: 12px;">${data.id_token}</textarea>
    <button onclick="copyToken()">Copiar idToken</button>
    <script>
      function copyToken() {
        const token = document.getElementById('token');
        token.select();
        document.execCommand('copy');
        alert('idToken copiado! Cole no Swagger Authorize.');
      }
      // Tenta preencher automaticamente se o Swagger estiver aberto
      if (window.opener) {
        try {
          if (window.opener.ui && window.opener.ui.preauthorizeApiKey) {
            window.opener.ui.preauthorizeApiKey('bearerAuth', '${data.id_token}');
            alert('idToken automaticamente adicionado ao Swagger!');
          }
        } catch (e) {
          console.log('Não foi possível preencher automaticamente');
        }
      }
    </script>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Auth0 callback error:', error);
    sendError(res, 'Erro ao processar callback do Auth0');
  }
};

export const exchangeCodeForToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      sendError(res, 'Código de autorização não fornecido', 400);
      return;
    }

    if (!config.auth0.domain || !config.auth0.clientId || !config.auth0.clientSecret) {
      sendError(res, 'Auth0 não configurado corretamente', 500);
      return;
    }

    const auth0Domain = config.auth0.domain;
    const clientId = config.auth0.clientId;
    const clientSecret = config.auth0.clientSecret;
    const redirectUri = `${config.baseUrl}/api/auth/callback`;

    const tokenUrl = `https://${auth0Domain}/oauth/token`;

    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('code', code);
    body.append('redirect_uri', redirectUri);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errorMessage = data.error_description || data.error || 'Erro ao trocar código por tokens';
      sendError(res, errorMessage, response.status);
      return;
    }

    sendSuccess(
      res,
      {
        idToken: data.id_token,
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      },
      'idToken obtido com sucesso via Authorization Code Flow'
    );
  } catch (error) {
    console.error('Auth0 code exchange error:', error);
    sendError(res, 'Erro ao trocar código por tokens');
  }
};

export const swaggerTokenExchange = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Código de autorização não fornecido',
      });
    }

    if (!config.auth0.domain || !config.auth0.clientId || !config.auth0.clientSecret) {
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Auth0 não configurado corretamente',
      });
    }

    const auth0Domain = config.auth0.domain;
    const clientId = config.auth0.clientId;
    const clientSecret = config.auth0.clientSecret;

    const tokenUrl = `https://${auth0Domain}/oauth/token`;

    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('code', code);
    body.append('redirect_uri', redirect_uri || `${config.baseUrl}/api-docs/oauth2-redirect.html`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || 'invalid_grant',
        error_description: data.error_description || 'Erro ao trocar código por tokens',
      });
    }

    const idToken = data.id_token;
    
    const decoded = await verifyAuth0Token(idToken);
    const auth0User = extractUserInfoFromToken(decoded);
    const email = auth0User.email;

    if (!email) {
      return res.status(400).json({
        error: 'invalid_token',
        error_description: 'Email não encontrado no token',
      });
    }

    const existingContact = await prisma.personContact.findFirst({
      where: {
        type: 'email',
        value: email,
        deletedAt: null,
      },
      include: {
        person: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!existingContact?.person?.user) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Usuário não encontrado. Faça o registro primeiro.',
      });
    }

    const user = existingContact.person.user;

    const backendToken = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      access_token: backendToken,
      token_type: 'Bearer',
      expires_in: 604800,
    });
  } catch (error) {
    console.error('Swagger token exchange error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Erro ao processar autenticação',
    });
  }
};

// Endpoint removido: os campos registerCompletedAt e objectivesSelectedAt são calculados
// Não há necessidade de salvar no banco, são calculados dinamicamente no login

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const idToken = req.body.idToken || (req.headers.authorization?.replace('Bearer ', ''));

    if (!idToken) {
      sendError(res, 'Token do Auth0 não fornecido', 400);
      return;
    }

    let decoded;
    try {
      decoded = await verifyAuth0Token(idToken);
    } catch (error) {
      sendError(
        res,
        `Token do Auth0 inválido ou expirado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        401
      );
      return;
    }

    const auth0User = extractUserInfoFromToken(decoded);
    const email = auth0User.email;

    if (!email) {
      sendError(res, 'Email não encontrado no token do Auth0', 400);
      return;
    }

    const existingContact = await prisma.personContact.findFirst({
      where: {
        type: 'email',
        value: email,
        deletedAt: null,
      },
      include: {
        person: {
          include: {
            user: {
              include: {
                person: {
                  include: {
                    contacts: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingContact?.person?.user) {
      sendError(res, 'Usuário não encontrado. Faça o registro primeiro.', 404);
      return;
    }

    const user = existingContact.person.user;

    if (!user.isActive || user.deletedAt) {
      sendError(res, 'Usuário inativo ou deletado', 401);
      return;
    }

    const sessionToken = generateToken(user.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword,
      token: sessionToken,
    };

    sendSuccess(res, response, 'Token verificado com sucesso');
  } catch (error) {
    console.error('Token verification error:', error);
    sendError(res, 'Erro ao verificar token do Auth0');
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    sendSuccess(res, user, 'Perfil obtido com sucesso');
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 'Erro ao obter perfil');
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const updateData = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    const userUpdateData: any = {};
    if (updateData.username) userUpdateData.username = updateData.username;
    if (updateData.avatar) userUpdateData.avatar = updateData.avatar;

    const personUpdateData: any = {};
    if (updateData.firstName) personUpdateData.firstName = updateData.firstName;
    if (updateData.lastName) personUpdateData.lastName = updateData.lastName;
    if (updateData.surname) personUpdateData.surname = updateData.surname;
    if (updateData.birthdate) personUpdateData.birthdate = new Date(updateData.birthdate);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...userUpdateData,
        person: personUpdateData && Object.keys(personUpdateData).length > 0
          ? { update: personUpdateData }
          : undefined,
      },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    sendSuccess(res, updatedUser, 'Perfil atualizado com sucesso');
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Erro ao atualizar perfil');
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    sendSuccess(res, null, 'Conta desativada com sucesso');
  } catch (error) {
    console.error('Delete account error:', error);
    sendError(res, 'Erro ao desativar conta');
  }
};

export const getAmityAuthToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    // Buscar socialPlusUserId do banco
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { socialPlusUserId: true },
    });

    if (!user?.socialPlusUserId) {
      sendError(res, 'Usuário não está sincronizado com a social.plus', 400);
      return;
    }

    // Gerar access token para o usuário
    const { createUserAccessToken } = await import('@/utils/amityClient');
    const accessToken = await createUserAccessToken(user.socialPlusUserId);

    if (!accessToken) {
      sendError(res, 'Não foi possível gerar token de autenticação do Amity', 500);
      return;
    }

    sendSuccess(
      res,
      {
        accessToken,
        userId: user.socialPlusUserId,
      },
      'Token de autenticação do Amity obtido com sucesso'
    );
  } catch (error) {
    console.error('Erro ao obter token do Amity:', error);
    sendError(res, 'Erro ao obter token de autenticação do Amity');
  }
};

export const getCurrentToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    // Gera um novo token JWT do backend para o usuário autenticado
    const token = generateToken(currentUserId);

    sendSuccess(
      res,
      {
        token,
        expiresIn: config.jwtExpiresIn,
        message: 'Use este token no header Authorization: Bearer <token>',
      },
      'Token obtido com sucesso'
    );
  } catch (error) {
    console.error('Get current token error:', error);
    sendError(res, 'Erro ao obter token');
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, null, 'Logout realizado com sucesso');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Erro ao fazer logout');
  }
};
