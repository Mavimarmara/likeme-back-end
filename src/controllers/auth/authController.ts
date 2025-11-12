import { Request, Response } from 'express';
import prisma from '@/config/database';
import { config } from '@/config';
import { hashPassword, generateToken } from '@/utils/auth';
import { verifyAuth0Token, extractUserInfoFromToken } from '@/utils/auth0';
import { sendSuccess, sendError } from '@/utils/response';
import { CreateUserData, AuthResponse } from '@/types';
import { socialPlusClient } from '@/utils/socialPlus';

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

    const hashedPassword = await hashPassword(userData.password);

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
      password: hashedPassword,
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

    // Criar usuário na social.plus
    try {
      const emailContact = user.person.contacts.find((c) => c.type === 'email');
      const socialPlusResponse = await socialPlusClient.createUser({
        username: user.username || undefined,
        email: emailContact?.value || userData.email,
        firstName: user.person.firstName,
        lastName: user.person.lastName,
        avatar: user.avatar || undefined,
      });

      if (socialPlusResponse.success && socialPlusResponse.data?.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { socialPlusUserId: socialPlusResponse.data.id },
        });
        user.socialPlusUserId = socialPlusResponse.data.id;
      } else {
        console.warn('Falha ao criar usuário na social.plus:', socialPlusResponse.error);
      }
    } catch (error) {
      console.error('Erro ao criar usuário na social.plus:', error);
      // Não falha o registro se a integração com social.plus falhar
    }

    const token = generateToken(user.id);
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
    let person;

    if (existingContact?.person?.user) {
      user = existingContact.person.user;
      person = existingContact.person;

      if (userInfo.picture && userInfo.picture !== user.avatar) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: userInfo.picture },
        });
        user.avatar = userInfo.picture;
      }

      // Se o usuário já existe, verificar se precisa criar na social.plus
      if (!user.socialPlusUserId) {
        try {
          const emailContact = user.person?.contacts?.find((c: any) => c.type === 'email');
          const socialPlusResponse = await socialPlusClient.createUser({
            username: user.username || undefined,
            email: emailContact?.value || email,
            firstName: person.firstName,
            lastName: person.lastName,
            avatar: user.avatar || undefined,
          });

          if (socialPlusResponse.success && socialPlusResponse.data?.id) {
            await prisma.user.update({
              where: { id: user.id },
              data: { socialPlusUserId: socialPlusResponse.data.id },
            });
            user.socialPlusUserId = socialPlusResponse.data.id;
          }
        } catch (error) {
          console.error('Erro ao criar usuário na social.plus:', error);
        }
      }
    } else {
      const name = auth0User.name || userInfo.name || email.split('@')[0];
      const nameParts = name.split(' ');
      const firstName = auth0User.given_name || nameParts[0] || '';
      const lastName = auth0User.family_name || nameParts.slice(1).join(' ') || '';

      person = await prisma.person.create({
        data: {
          firstName,
          lastName,
          surname: auth0User.nickname || undefined,
        },
      });

      await prisma.personContact.create({
        data: {
          personId: person.id,
          type: 'email',
          value: email,
        },
      });

      const randomPassword = await hashPassword(`auth0_${auth0User.sub}_${Date.now()}`);
      
      user = await prisma.user.create({
        data: {
          personId: person.id,
          password: randomPassword,
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

      // Criar usuário na social.plus
      try {
        const socialPlusResponse = await socialPlusClient.createUser({
          email: email,
          firstName: person.firstName,
          lastName: person.lastName,
          avatar: user.avatar || undefined,
        });

        if (socialPlusResponse.success && socialPlusResponse.data?.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { socialPlusUserId: socialPlusResponse.data.id },
          });
          user.socialPlusUserId = socialPlusResponse.data.id;
        } else {
          console.warn('Falha ao criar usuário na social.plus:', socialPlusResponse.error);
        }
      } catch (error) {
        console.error('Erro ao criar usuário na social.plus:', error);
        // Não falha o login se a integração com social.plus falhar
      }
    }

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

    sendSuccess(res, response, 'Login realizado com sucesso');
  } catch (error) {
    console.error('Auth0 login error:', error);
    sendError(res, 'Erro ao fazer login com Auth0');
  }
};

export const getIdToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email e senha são obrigatórios', 400);
      return;
    }

    if (!config.auth0.domain || !config.auth0.clientId) {
      sendError(res, 'Auth0 não configurado corretamente', 500);
      return;
    }

    // Autenticar com Auth0 usando Resource Owner Password Credentials Grant
    const auth0Domain = config.auth0.domain;
    const clientId = config.auth0.clientId;
    const clientSecret = config.auth0.clientSecret;
    const audience = process.env.AUTH0_AUDIENCE || `https://${auth0Domain}/api/v2/`;

    const tokenUrl = `https://${auth0Domain}/oauth/token`;

    const body = new URLSearchParams();
    body.append('grant_type', 'password');
    body.append('username', email);
    body.append('password', password);
    body.append('client_id', clientId);
    body.append('audience', audience);

    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errorMessage = data.error_description || data.error || 'Erro ao autenticar com Auth0';
      sendError(res, errorMessage, response.status);
      return;
    }

    // Retornar o idToken
    sendSuccess(
      res,
      {
        idToken: data.id_token,
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      },
      'idToken obtido com sucesso'
    );
  } catch (error) {
    console.error('Auth0 idToken error:', error);
    sendError(res, 'Erro ao obter idToken do Auth0');
  }
};

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

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, null, 'Logout realizado com sucesso');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Erro ao fazer logout');
  }
};
