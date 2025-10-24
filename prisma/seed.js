"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');
    const hashedPassword = await bcryptjs_1.default.hash('123456', 12);
    const user1 = await prisma.user.upsert({
        where: { email: 'usuario@likeme.com' },
        update: {},
        create: {
            name: 'Usuário Teste',
            email: 'usuario@likeme.com',
            password: hashedPassword,
            phone: '(11) 99999-9999',
            birthDate: new Date('1990-01-01'),
            gender: 'male',
            avatar: 'https://via.placeholder.com/150',
        },
    });
    const user2 = await prisma.user.upsert({
        where: { email: 'medico@likeme.com' },
        update: {},
        create: {
            name: 'Dr. João Santos',
            email: 'medico@likeme.com',
            password: hashedPassword,
            phone: '(11) 88888-8888',
            birthDate: new Date('1985-05-15'),
            gender: 'male',
            avatar: 'https://via.placeholder.com/150',
        },
    });
    console.log('✅ Usuários criados');
    await prisma.anamnese.upsert({
        where: { id: 'sample-anamnese-1' },
        update: {},
        create: {
            id: 'sample-anamnese-1',
            userId: user1.id,
            answers: [
                { questionId: 'health_conditions', answer: 'Não' },
                { questionId: 'medications', answer: 'Não' },
                { questionId: 'allergies', answer: 'Não' },
                { questionId: 'exercise_frequency', answer: '3-4 vezes por semana' },
                { questionId: 'sleep_quality', answer: 'Boa' },
                { questionId: 'stress_level', answer: 'Moderado' },
            ],
            completed: true,
        },
    });
    console.log('✅ Anamnese criada');
    const activities = [
        {
            title: 'Caminhada Matinal',
            description: 'Caminhada leve para começar o dia',
            category: 'exercise',
            duration: 30,
            difficulty: 'Easy',
            completed: true,
            completedAt: new Date(),
        },
        {
            title: 'Meditação Guiada',
            description: 'Sessão de meditação para relaxamento',
            category: 'mental',
            duration: 15,
            difficulty: 'Easy',
            completed: true,
            completedAt: new Date(),
        },
        {
            title: 'Consulta Cardiologista',
            description: 'Consulta de rotina com cardiologista',
            category: 'medical',
            duration: 45,
            difficulty: 'Medium',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    ];
    for (const activity of activities) {
        await prisma.activity.create({
            data: {
                userId: user1.id,
                ...activity,
            },
        });
    }
    console.log('✅ Atividades criadas');
    const wellnessData = [
        { category: 'physical', score: 80 },
        { category: 'mental', score: 70 },
        { category: 'emotional', score: 75 },
        { category: 'social', score: 65 },
    ];
    for (const data of wellnessData) {
        await prisma.wellnessData.create({
            data: {
                userId: user1.id,
                ...data,
                notes: `Dados de ${data.category} para o usuário`,
            },
        });
    }
    console.log('✅ Dados de bem-estar criados');
    const healthProvider = await prisma.healthProvider.create({
        data: {
            userId: user2.id,
            name: 'Dr. João Santos',
            specialty: 'Cardiologia',
            description: 'Especialista em cardiologia com mais de 10 anos de experiência',
            experience: 10,
            rating: 4.8,
            reviews: 156,
            isAvailable: true,
        },
    });
    console.log('✅ Provedor de saúde criado');
    const products = [
        {
            title: 'Whey Protein Premium',
            description: 'Proteína de alta qualidade para atletas',
            category: 'supplements',
            price: 89.90,
            originalPrice: 119.90,
            discount: 25,
            rating: 4.8,
            reviews: 156,
            image: 'https://via.placeholder.com/300x200',
            inStock: true,
            stock: 50,
        },
        {
            title: 'Esteira Elétrica Pro',
            description: 'Esteira elétrica com inclinação automática',
            category: 'equipment',
            price: 1299.90,
            originalPrice: 1599.90,
            discount: 19,
            rating: 4.6,
            reviews: 89,
            image: 'https://via.placeholder.com/300x200',
            inStock: true,
            stock: 10,
        },
        {
            title: 'Livro: Nutrição Esportiva',
            description: 'Guia completo de nutrição para atletas',
            category: 'books',
            price: 45.90,
            originalPrice: 65.90,
            discount: 30,
            rating: 4.9,
            reviews: 234,
            image: 'https://via.placeholder.com/300x200',
            inStock: true,
            stock: 100,
        },
    ];
    for (const product of products) {
        await prisma.product.create({
            data: product,
        });
    }
    console.log('✅ Produtos criados');
    const posts = [
        {
            userId: user1.id,
            content: 'Compartilhando minha jornada de perda de peso: 15kg em 6 meses! O segredo foi consistência e paciência.',
            category: 'experiences',
            tags: ['perda de peso', 'motivação'],
            likes: 24,
        },
        {
            userId: user2.id,
            content: 'Dica importante: A hidratação é fundamental para o funcionamento do metabolismo. Bebam pelo menos 2L de água por dia!',
            category: 'tips',
            tags: ['hidratação', 'saúde'],
            likes: 18,
        },
    ];
    for (const post of posts) {
        await prisma.post.create({
            data: post,
        });
    }
    console.log('✅ Posts criados');
    console.log('🎉 Seed concluído com sucesso!');
}
main()
    .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map