/**
 * UserRepository - Interface (Port)
 * 
 * Define o contrato para persistência de usuários.
 * Implementações concretas ficam no mesmo diretório.
 */

export interface UserRepository {
  /**
   * Salva um novo usuário no repositório
   */
  save(userData: CreateUserData): Promise<{ id: string }>;

  /**
   * Busca um usuário por ID
   */
  findById(id: string): Promise<UserData | null>;

  /**
   * Busca um usuário por email
   */
  findByEmail(email: string): Promise<UserData | null>;

  /**
   * Busca um usuário por username
   */
  findByUsername(username: string): Promise<UserData | null>;

  /**
   * Verifica se já existe um usuário com o email fornecido
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Verifica se já existe um usuário com o username fornecido
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Atualiza dados de um usuário existente
   */
  update(id: string, userData: UpdateUserData): Promise<void>;

  /**
   * Remove um usuário (soft delete)
   */
  delete(id: string): Promise<void>;
}

/**
 * Dados necessários para criar um usuário
 */
export interface CreateUserData {
  personId: string;
  username?: string;
  password: string;
  avatar?: string;
  isActive?: boolean;
  socialPlusUserId?: string;
}

/**
 * Dados de um usuário retornado do repositório
 */
export interface UserData {
  id: string;
  personId: string;
  username: string | null;
  password: string;
  avatar: string | null;
  isActive: boolean;
  socialPlusUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  person: PersonData;
}

/**
 * Dados de uma pessoa
 */
export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  surname: string | null;
  nationalRegistration: string | null;
  birthdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contacts: ContactData[];
}

/**
 * Dados de um contato
 */
export interface ContactData {
  id: string;
  type: string;
  value: string;
  createdAt: Date;
  deletedAt: Date | null;
}

/**
 * Dados para atualizar um usuário
 */
export interface UpdateUserData {
  username?: string;
  password?: string;
  avatar?: string;
  isActive?: boolean;
  socialPlusUserId?: string;
}


